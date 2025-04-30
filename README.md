# DeFi Arbitrage Bot with Flash Loans

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A Solidity smart contract and associated scripts for performing automated arbitrage between decentralized exchanges using Aave flash loans and Uniswap V3 swaps.

## 📜 Overview

This project implements a flashloan contract that leverages the idea of arbitrage to execute risk-free trades(swaps) across different liquidity pools. The system will detect price discrepancies between markets and automatically executes trades when profitable opportunities arise.

Key features:
- Flash loan-powered arbitrage with no upfront capital requirements
- Automated execution of trades between different Uniswap V3 pools
- Gas-optimized contract design for maximum profitability
- Comprehensive event logging for transaction verification and monitoring
- Withdrawal functions for claimed profits

## 🔧 Technology Stack

- **Solidity ^0.8.20**: Core smart contract language
- **Hardhat**: Development environment and deployment framework
- **Ethers.js**: JavaScript library for interacting with the Ethereum blockchain
- **Aave V3**: For flash loan functionality
- **Uniswap V3**: For token swaps with configurable fee tiers
- **OpenZeppelin**: For secure contract patterns and interfaces

## 🏗️ Architecture

The system consists of the following components:

1. **ArbitrageFlashLoan Contract**: The core smart contract that:
   - Borrows funds via Aave flash loans
   - Executes swaps on Uniswap V3
   - Repays the loan with a premium
   - Captures profits from successful arbitrage

2. **Deployment Scripts**: Hardhat scripts for deploying the contract to various networks

3. **Execution Scripts**: JavaScript utilities for monitoring markets and triggering arbitrage opportunities

## 📋 Prerequisites

- Node.js (v14+)
- NPM or Yarn
- An Ethereum wallet with funds for deployment and transaction fees
- API keys for networks and services (Infura/Alchemy, Etherscan)
- Basic knowledge of DeFi and arbitrage concepts

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/defi-arbitrage-bot.git
cd defi-arbitrage-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
# Network RPC URLs
MAINNET_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY

# Private keys (never share or commit these!)
OWNER_PRIVATE_KEY=your_private_key_here

# Contract addresses
ARBITRAGE_CONTRACT_ADDRESS=0x...  # After deployment
BORROWED_TOKEN_ADDRESS=0x...      # e.g., WETH address
TARGET_TOKEN_ADDRESS=0x...        # e.g., USDC address

# Arbitrage parameters
BORROW_AMOUNT=10                  # Amount to borrow
TOKEN_DECIMALS=18                 # Decimals of the borrowed token
FEE_TIER_1=3000                   # First swap fee tier (3000 = 0.3%)
FEE_TIER_2=500                    # Second swap fee tier (500 = 0.05%)

# API keys for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

4. Optionally, update the `helper-hardhat-config.js` file with network-specific addresses:
```javascript
module.exports = {
  // Aave Pool Providers by network
  aavePoolProviderAddress: {
    1: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e", // Mainnet
    137: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb", // Polygon
    11155111: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A" // Sepolia
  },
  // Uniswap Router addresses
  uniswapRouterAddress: {
    1: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Mainnet
    137: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Polygon
    11155111: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008" // Sepolia
  },
  // Block confirmations to wait after deployment
  blockConfirmations: 6
};
```

## 🔄 Usage

### Deploying the Contract

1. Run the deployment script:
```bash
npx hardhat deploy --network <network-name> --tags <contract-specific-tag>
```

2. Update your `.env` file with the deployed contract address.

### Executing Arbitrage

1. Run the execution script:
```bash
npx hardhat run scripts/arbitrageFlashloan.js
```

## 💡 Advanced Configuration

### Fee Tiers

Uniswap V3 has multiple fee tiers. You can configure which fee tiers to use for your arbitrage:

- 100 (0.01%): Best for stable pairs like USDC/USDT
- 500 (0.05%): Good for stable pairs with more volatility
- 3000 (0.3%): Standard fee for most tokens
- 10000 (1%): For exotic pairs with high volatility

### Gas Optimization

For maximum profitability, consider:

1. Setting appropriate gas prices based on network congestion
2. Using `maxPriorityFeePerGas` and `maxFeePerGas` for EIP-1559 compatible networks
3. Implementing a minimum profit threshold that accounts for gas costs

## 📊 Profitability Calculations

The profit from an arbitrage opportunity is calculated as:

```
Profit = Final Amount - (Borrowed Amount + Flash Loan Premium)
```

where:
- **Final Amount**: Tokens received after completing both swaps
- **Borrowed Amount**: Initial flash loan amount
- **Flash Loan Premium**: Fee paid to Aave (currently 0.09%)

For an arbitrage to be profitable:
```
Final Amount > Borrowed Amount + Flash Loan Premium + Gas Cost
```

## ⚠️ Risk Management

### Security Considerations

1. **Price Slippage**: Set reasonable slippage limits for production
2. **MEV Protection**: Consider using private mempools or flashbots
3. **Contract Upgrades**: Have a plan for upgrading when protocols change
4. **Gas Price Spikes**: Implement abort mechanisms for high gas scenarios

## 📝 Contract Documentation

### ArbitrageFlashLoan

The main contract that handles the flash loan and arbitrage logic.

**Constructor Parameters:**
- `_aaveProvider`: Address of Aave's PoolAddressesProvider
- `_uniswapRouter`: Address of Uniswap V3's SwapRouter

**Key Functions:**
- `requestFlashLoan`: Initiates a flash loan for arbitrage
- `executeOperation`: Callback function executed during the flash loan
- `withdrawToken`: Allows the owner to withdraw any token from the contract
- `withdrawETH`: Allows the owner to withdraw ETH from the contract

**Events:**
- `FlashLoanInitiated`: Emitted when a flash loan is requested
- `SwapExecuted`: Emitted when a token swap is executed
- `FlashLoanRepaid`: Emitted when a flash loan is repaid
- `ArbitrageProfit`: Emitted with the profit amount after arbitrage

## 🌐 Supported Networks

- Ethereum Mainnet
- Polygon
- Sepolia Testnet
- Hardhat Network (for local development)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgements

- [Aave](https://aave.com/) for flash loan protocol
- [Uniswap](https://uniswap.org/) for DEX infrastructure
- [OpenZeppelin](https://openzeppelin.com/) for secure contract libraries
- [Hardhat](https://hardhat.org/) for development framework
