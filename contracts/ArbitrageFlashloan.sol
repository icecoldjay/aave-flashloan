// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title SimplifiedFlashLoan
 * @dev Implements a basic flash loan and swap executor without arbitrage profit checking
 */
contract ArbitrageFlashLoan is FlashLoanSimpleReceiverBase {
    address public owner;
    ISwapRouter public immutable swapRouter;
    
    // Events for tracking operations
    event FlashLoanInitiated(address asset, uint256 amount);
    event SwapExecuted(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event FlashLoanRepaid(address asset, uint256 amount, uint256 premium);

    constructor(address _aaveProvider, address _uniswapRouter)
        FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_aaveProvider))
    {
        owner = msg.sender;
        swapRouter = ISwapRouter(_uniswapRouter);
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
        (address tokenB, uint24 fee1, uint24 fee2) = abi.decode(
            params, 
            (address, uint24, uint24)
        );

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
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = swapRouter.exactInputSingle(buyParams);
        emit SwapExecuted(asset, tokenB, amount, amountOut);

        // Step 3: Execute second swap (tokenB -> asset)
        IERC20(tokenB).approve(address(swapRouter), amountOut);
        
        ISwapRouter.ExactInputSingleParams memory sellParams = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenB,
            tokenOut: asset,
            fee: fee2,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amountOut,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        uint256 finalAmount = swapRouter.exactInputSingle(sellParams);
        emit SwapExecuted(tokenB, asset, amountOut, finalAmount);

        // Calculate total amount owed to Aave
        uint256 totalDebt = amount + premium;
        
        // Step 4: Approve the lending pool to pull the owed amount
        IERC20(asset).approve(address(POOL), totalDebt);
        
        emit FlashLoanRepaid(asset, amount, premium);

        // Transfer all remaining tokens to owner after paying the loan
        uint256 remainingBalance = IERC20(asset).balanceOf(address(this));
        if (remainingBalance > 0) {
            IERC20(asset).transfer(owner, remainingBalance);
        }

        return true;
    }

    /**
     * @dev Function to request a flash loan
     * @param asset The address of the token to borrow
     * @param amount The amount to borrow
     * @param tokenB The second token in the trading pair
     * @param fee1 The fee tier for the first swap
     * @param fee2 The fee tier for the second swap
     */
    function requestFlashLoan(
        address asset,
        uint256 amount,
        address tokenB,
        uint24 fee1,
        uint24 fee2
    ) external onlyOwner {
        bytes memory params = abi.encode(tokenB, fee1, fee2);
        
        emit FlashLoanInitiated(asset, amount);
        
        // Request the flash loan from Aave
        POOL.flashLoanSimple(
            address(this),
            asset,
            amount,
            params,
            0 // referral code
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