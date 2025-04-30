// Network-specific addresses and configurations

// Network configurations
const networkConfig = {
    1: {
      name: "mainnet",
      // Mainnet addresses
      wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      daiAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
      chainlinkEthUsdPriceFeed: "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
    },
    137: {
      name: "polygon",
      // Polygon addresses
      wethAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
      usdcAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      daiAddress: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
      chainlinkEthUsdPriceFeed: "0xF9680D99D6C9589e2a93a78A04A279e509205945",
    },
    11155111: {
      name: "sepolia",
      // Sepolia addresses
      wethAddress: "0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9",
      usdcAddress: "0xda9d4f9b69ac6C22e444eD9aF0CfC043b7a7f53f",
      daiAddress: "0x3e622317f8C93f7328350cF0B56d9eD4C620C5d6",
      chainlinkEthUsdPriceFeed: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    },
    31337: {
      name: "hardhat",
      // Use mainnet forking addresses for local testing
      wethAddress: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      usdcAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      daiAddress: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    },
    42161: {
      name: "arbitrum",
      // Arbitrum addresses
      wethAddress: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
      usdcAddress: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
      daiAddress: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
      chainlinkEthUsdPriceFeed: "0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612",
    }
  };
  
  // Deployment parameters
  const blockConfirmations = 3; // Default block confirmations for transaction receipts
  
  // Initial holders (for token testing)
  const initialHolder1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Example local hardhat account
  const initialHolder2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Example local hardhat account
  const initialHolder3 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906"; // Example local hardhat account
  const initialHolder4 = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65"; // Example local hardhat account
  
  // Fee collector address for token factory
  const feeCollectorAddress = "0xf27c00Ec8c71b2dbCF8D15c882441C70A0EA02B6";
  const tokenCreationFeeConfig = "0.00001"; // in ETH
  
  // Aave Pool Provider Addresses
  const aavePoolProviderAddress = {
    1: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e", // Mainnet
    137: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb", // Polygon
    42161: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb", // Arbitrum
    11155111: "0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A", // Sepolia
    31337: "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e", // Use Mainnet for Hardhat
  };
  
  // Uniswap Router Addresses
  const uniswapRouterAddress = {
    1: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Mainnet
    137: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Polygon
    42161: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Arbitrum
    11155111: "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008", // Sepolia
    31337: "0xE592427A0AEce92De3Edee1F18E0157C05861564", // Use Mainnet for Hardhat
  };
  
  // Common Uniswap fee tiers (in basis points)
  const uniswapFeeTiers = {
    lowestFee: 100,    // 0.01%
    lowFee: 500,       // 0.05%
    mediumFee: 3000,   // 0.3% (most common)
    highFee: 10000     // 1.0% (for exotic pairs)
  };
  
  module.exports = {
    networkConfig,
    blockConfirmations,
    initialHolder1,
    initialHolder2,
    initialHolder3,
    initialHolder4,
    feeCollectorAddress,
    tokenCreationFeeConfig,
    aavePoolProviderAddress,
    uniswapRouterAddress,
    uniswapFeeTiers
  };