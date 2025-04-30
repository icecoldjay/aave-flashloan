const { network, ethers } = require("hardhat");
const { 
  aavePoolProviderAddress, 
  uniswapRouterAddress,
  blockConfirmations 
} = require("../helper-hardhat-config");

// Deploy ArbitrageFlashLoan contract
// Address: 0x315EeBd82C5823f129b82Fd7E9DBc625D26Ac9D6(Sepolia), 0xae246e208ea35b3f23de72b697d47044fc594d5f(Mainnet fork)
// Txhash: 0x27d40ca7d0008cc75cbddaebf896bc91493a495e2e5bdc8164c800dec5f4d213
// Verification link: https://sepolia.etherscan.io/address/0x315EeBd82C5823f129b82Fd7E9DBc625D26Ac9D6#code
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments;
  // const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;

  const privateKey = process.env.OWNER_PRIVATE_KEY;
    if (!privateKey) {
      console.error("ERROR: PRIVATE_KEY is not defined in .env file");
      process.exit(1);
    }
    
    // Create provider and signer
    const rpcUrl = process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

  // Get network-specific configuration or use fallbacks
  const aaveProvider = aavePoolProviderAddress[chainId] || "0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e"; // Example Mainnet address
  const uniswapRouter = uniswapRouterAddress[chainId] || "0xE592427A0AEce92De3Edee1F18E0157C05861564"; // Example UniswapV3 Router
  const quoter = "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6"
  
  log("----------------------------------------------------");
  log("Deploying ArbitrageFlashLoan contract...");
  log(`Network: ${network.name} (${chainId})`);
  log(`Using Aave Provider: ${aaveProvider}`);
  log(`Using Uniswap Router: ${uniswapRouter}`);

  try {
    const arbitrageFlashLoan = await deploy("ArbitrageFlashLoan", {
      from: wallet.address,
      args: [
        aaveProvider,
        uniswapRouter
      ],
      log: true,
      waitConfirmations: network.config.blockConfirmations || blockConfirmations || 1,
      maxFeePerGas: ethers.parseUnits('100', 'gwei'),  // Adjust to a higher value, e.g., 100 gwei
      maxPriorityFeePerGas: ethers.parseUnits('2', 'gwei'),  // Set a reasonable tip for the miner
    });
    
    log("ArbitrageFlashLoan contract deployed at:", arbitrageFlashLoan.address);
    log("ArbitrageFlashLoan is ready for executing flash loan arbitrage trades.");

    // Verify on Etherscan if not on local network and API key exists
    if (chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
      log("Verifying contract on Etherscan...");
      await verify(arbitrageFlashLoan.address, [aaveProvider, uniswapRouter]);
    }
  } catch (error) {
    log("Error deploying ArbitrageFlashLoan:", error);
    throw error;
  }
  log("----------------------------------------------------");
};

// Function to verify contract on Etherscan
async function verify(contractAddress, args) {
  console.log("Verifying contract on Etherscan...");
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: args,
    });
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Contract already verified!");
    } else {
      console.log(e);
    }
  }
}

module.exports.tags = ["all", "arbitrage", "flashloanfork"];