const { ethers } = require("ethers");
const dotenv = require('dotenv');

dotenv.config();

/**
 * Helper script to approve tokens for the arbitrage contract
 * Run this separately before executing the main arbitrage script
 */
async function main() {
  console.log("Token Approval Helper Script");
  console.log("============================");

  // Initialize provider and wallet
  const rpcUrl = "http://127.0.0.1:8545";
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.error("ERROR: OWNER_PRIVATE_KEY is not defined in .env file");
    process.exit(1);
  }
  
  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Using wallet: ${wallet.address}`);
  
  // Get contract and token addresses
  const arbitrageContractAddress = process.env.ARBITRAGE_CONTRACT_ADDRESS;
  const tokenAddress = process.env.BORROWED_TOKEN_ADDRESS;
  
  if (!arbitrageContractAddress || !tokenAddress) {
    console.error("ERROR: Contract or token address not defined in .env");
    console.error("Please ensure ARBITRAGE_CONTRACT_ADDRESS and BORROWED_TOKEN_ADDRESS are set");
    process.exit(1);
  }
  
  console.log(`Contract Address: ${arbitrageContractAddress}`);
  console.log(`Token Address: ${tokenAddress}`);
  
  try {
    // Initialize ERC20 token contract
    const tokenContract = new ethers.Contract(
      tokenAddress,
      [
        "function balanceOf(address) view returns (uint256)",
        "function symbol() view returns (string)",
        "function decimals() view returns (uint8)",
        "function allowance(address,address) view returns (uint256)",
        "function approve(address,uint256) returns (bool)"
      ],
      wallet
    );
    
    // Get token details
    const symbol = await tokenContract.symbol();
    const decimals = await tokenContract.decimals();
    console.log(`Token: ${symbol} (${decimals} decimals)`);
    
    // Check wallet balance
    const walletBalance = await tokenContract.balanceOf(wallet.address);
    console.log(`Wallet balance: ${ethers.formatUnits(walletBalance, decimals)} ${symbol}`);
    
    if (walletBalance === 0n) {
      console.error(`ERROR: Wallet has no ${symbol} tokens. Please fund your wallet first.`);
      process.exit(1);
    }
    
    // Check current allowance
    const currentAllowance = await tokenContract.allowance(wallet.address, arbitrageContractAddress);
    console.log(`Current allowance: ${ethers.formatUnits(currentAllowance, decimals)} ${symbol}`);
    
    // Set new allowance
    const approvalAmount = ethers.parseUnits("1000000", decimals); // Large approval amount for testing
    
    if (currentAllowance >= approvalAmount) {
      console.log("Current allowance is already sufficient");
      return;
    }
    
    console.log(`Setting allowance to ${ethers.formatUnits(approvalAmount, decimals)} ${symbol}...`);
    
    const tx = await tokenContract.approve(arbitrageContractAddress, approvalAmount);
    console.log(`Approval transaction sent: ${tx.hash}`);
    await tx.wait();
    console.log("Approval transaction confirmed!");
    
    // Verify new allowance
    const newAllowance = await tokenContract.allowance(wallet.address, arbitrageContractAddress);
    console.log(`New allowance: ${ethers.formatUnits(newAllowance, decimals)} ${symbol}`);
    console.log("✅ Done!");
    
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Transaction hash:", error.transaction.hash);
    }
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });