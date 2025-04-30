// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/IQuoter.sol"; // Added for price checks
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title ArbitrageFlashLoan
 * @dev Implements a basic arbitrage bot using Aave flash loans and Uniswap V3
 */
contract ArbitrageFlashLoanV2 is FlashLoanSimpleReceiverBase {
    address public owner;
    ISwapRouter public immutable swapRouter;
    IQuoter public immutable quoter;  // Added quoter for price checks
    
    uint256 public constant SLIPPAGE_TOLERANCE = 50; // 0.5% slippage tolerance (in basis points)
    uint256 public constant BASIS_POINTS = 10000;
    
    // Events for transaction verification on blockchain explorer
    event FlashLoanInitiated(address asset, uint256 amount);
    event SwapExecuted(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event FlashLoanRepaid(address asset, uint256 amount, uint256 premium);
    event ArbitrageProfit(uint256 profit);
    event ArbitrageLoss(uint256 loss);

    constructor(address _aaveProvider, address _uniswapRouter, address _quoter)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_aaveProvider))
    {
        owner = msg.sender;
        swapRouter = ISwapRouter(_uniswapRouter);
        quoter = IQuoter(_quoter);
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can execute");
        _;
    }

    /**
     * @dev This function is called after the contract receives the flash loaned amount
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // Ensure the caller is the Aave lending pool
        require(msg.sender == address(POOL), "Caller must be Aave lending pool");
        
        // Decode parameters
        (address tokenB, uint24 fee1, uint24 fee2, uint256 minAmountOutA, uint256 minAmountOutB) = abi.decode(
            params, 
            (address, uint24, uint24, uint256, uint256)
        );

        // Calculate total debt (amount + premium) we need to repay to Aave
        uint256 totalDebt = amount + premium;
        
        // Check initial balance to detect issues early
        uint256 initialAssetBalance = IERC20(asset).balanceOf(address(this));
        
        // Step 1: Approve Uniswap to spend the borrowed asset
        IERC20(asset).approve(address(swapRouter), amount);

        // Step 2: Execute first swap (asset -> tokenB)
        ISwapRouter.ExactInputSingleParams memory buyParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: asset,
            tokenOut: tokenB,
            fee: fee1,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amount,
            amountOutMinimum: minAmountOutB, // Use minimum amount to protect from slippage
            sqrtPriceLimitX96: 0
        });

        uint256 tokenBAmount = swapRouter.exactInputSingle(buyParams);
        emit SwapExecuted(asset, tokenB, amount, tokenBAmount);

        // Step 3: Execute second swap (tokenB -> asset)
        IERC20(tokenB).approve(address(swapRouter), tokenBAmount);
        
        ISwapRouter.ExactInputSingleParams memory sellParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenB,
            tokenOut: asset,
            fee: fee2,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: tokenBAmount,
            amountOutMinimum: minAmountOutA, // Use minimum amount to protect from slippage
            sqrtPriceLimitX96: 0
        });

        uint256 finalAssetAmount = swapRouter.exactInputSingle(sellParams);
        emit SwapExecuted(tokenB, asset, tokenBAmount, finalAssetAmount);
        
        // Calculate the remaining balance after swaps
        uint256 currentAssetBalance = IERC20(asset).balanceOf(address(this));
        
        // Step 4: Approve the lending pool to pull the owed amount
        IERC20(asset).approve(address(POOL), totalDebt);
        
        emit FlashLoanRepaid(asset, amount, premium);

        // Calculate profit/loss based on the actual balance change
        uint256 balanceToConsider = currentAssetBalance - initialAssetBalance;
        
        if (balanceToConsider >= totalDebt) {
            uint256 profit = balanceToConsider - totalDebt;
            emit ArbitrageProfit(profit);
            
            // Only transfer profit after ensuring we have enough to repay
            if (profit > 0) {
                // Make sure we have enough balance after repaying the loan
                uint256 availableForTransfer = currentAssetBalance - totalDebt;
                if (availableForTransfer > 0) {
                    IERC20(asset).transfer(owner, availableForTransfer);
                }
            }
        } else {
            uint256 loss = totalDebt - balanceToConsider;
            emit ArbitrageLoss(loss);
            
            // If we can't cover the full loan + premium, owner needs to cover the difference
            if (currentAssetBalance < totalDebt) {
                uint256 shortfall = totalDebt - currentAssetBalance;
                
                // Pull additional funds from owner to cover the shortfall
                require(
                    IERC20(asset).transferFrom(owner, address(this), shortfall),
                    "Failed to transfer funds from owner"
                );
            }
        }

        return true;
    }

    /**
     * @dev Check if an arbitrage opportunity is profitable
     * @param asset The address of token A (flash loan asset)
     * @param amount Amount to borrow
     * @param tokenB The second token in the trading pair
     * @param fee1 Fee tier for first swap
     * @param fee2 Fee tier for second swap
     * @return isProfitable Whether the arbitrage is profitable
     * @return estimatedProfit Estimated profit (or loss if negative)
     */
    function checkArbitrageProfitability(
        address asset,
        uint256 amount,
        address tokenB,
        uint24 fee1,
        uint24 fee2
    ) public view returns (bool isProfitable, uint256 estimatedProfit) {
        // Use low-level calls to safely handle any errors
        // First swap: asset -> tokenB
        (bool success1, bytes memory data1) = address(quoter).staticcall(
            abi.encodeWithSelector(
                quoter.quoteExactInputSingle.selector,
                asset,
                tokenB,
                fee1,
                amount,
                0
            )
        );
        
        if (!success1) {
            return (false, 0);
        }
        
        uint256 amountOut = abi.decode(data1, (uint256));
        
        // Second swap: tokenB -> asset
        (bool success2, bytes memory data2) = address(quoter).staticcall(
            abi.encodeWithSelector(
                quoter.quoteExactInputSingle.selector,
                tokenB,
                asset,
                fee2,
                amountOut,
                0
            )
        );
        
        if (!success2) {
            return (false, 0);
        }
        
        uint256 finalAmount = abi.decode(data2, (uint256));
        
        // Calculate premium (0.09% of borrowed amount for Aave V3)
        uint256 premium = (amount * 9) / 10000;
        uint256 totalDebt = amount + premium;
        
        if (finalAmount > totalDebt) {
            return (true, finalAmount - totalDebt);
        } else {
            return (false, totalDebt - finalAmount);
        }
    }

    /**
     * @dev Function to request a flash loan
     * @param asset The address of the token to borrow
     * @param amount The amount to borrow
     * @param tokenB The second token in the trading pair
     * @param fee1 The fee tier for the first swap (buy)
     * @param fee2 The fee tier for the second swap (sell)
     */
    function requestFlashLoan(
        address asset,
        uint256 amount,
        address tokenB,
        uint24 fee1,
        uint24 fee2
    ) external onlyOwner {
        // Check if the contract has sufficient allowance from owner
        uint256 premium = (amount * 9) / 10000; // 0.09% premium
        uint256 totalPossibleDebt = amount + premium;
        
        // Verify the contract has sufficient balance or allowance to repay
        uint256 assetBalance = IERC20(asset).balanceOf(address(this));
        
        // If we don't have enough balance, make sure we have allowance from owner
        if (assetBalance < totalPossibleDebt) {
            uint256 neededAllowance = totalPossibleDebt - assetBalance;
            uint256 currentAllowance = IERC20(asset).allowance(owner, address(this));
            require(currentAllowance >= neededAllowance, "Not enough allowance to cover potential loss");
        }
        
        // Check if arbitrage is profitable using quoter
        (bool isProfitable, ) = checkArbitrageProfitability(asset, amount, tokenB, fee1, fee2);
        
        // Get price quotes for setting minimum output amounts
        uint256 expectedOutB;
        uint256 expectedFinalOut;
        
        // First swap: asset -> tokenB (using low-level calls to handle errors)
        (bool success1, bytes memory data1) = address(quoter).staticcall(
            abi.encodeWithSelector(
                quoter.quoteExactInputSingle.selector,
                asset,
                tokenB,
                fee1,
                amount,
                0
            )
        );
        require(success1, "Error getting quote for first swap");
        expectedOutB = abi.decode(data1, (uint256));
        
        // Second swap: tokenB -> asset
        (bool success2, bytes memory data2) = address(quoter).staticcall(
            abi.encodeWithSelector(
                quoter.quoteExactInputSingle.selector,
                tokenB,
                asset,
                fee2,
                expectedOutB,
                0
            )
        );
        require(success2, "Error getting quote for second swap");
        expectedFinalOut = abi.decode(data2, (uint256));
        
        // Calculate minimum amounts with slippage tolerance
        uint256 minAmountOutB = (expectedOutB * (BASIS_POINTS - SLIPPAGE_TOLERANCE)) / BASIS_POINTS;
        uint256 minAmountOutA = (expectedFinalOut * (BASIS_POINTS - SLIPPAGE_TOLERANCE)) / BASIS_POINTS;
        
        // Make sure we at least break even after slippage
        require(minAmountOutA >= totalPossibleDebt, "Arbitrage not profitable after slippage");
        
        bytes memory params = abi.encode(tokenB, fee1, fee2, minAmountOutA, minAmountOutB);
        
        emit FlashLoanInitiated(asset, amount);
        
        // Request the flash loan from Aave
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code, set to 0 if not used
        );
    }

    /**
     * @dev Allow the owner to withdraw any tokens from the contract
     */
    function withdrawToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No tokens to withdraw");
        IERC20(token).transfer(owner, balance);
    }
    
    /**
     * @dev Allow the owner to withdraw ETH from the contract
     */
    function withdrawETH() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        payable(owner).transfer(balance);
    }
    
    // Allow the contract to receive ETH
    receive() external payable {}
}