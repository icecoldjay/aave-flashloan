const { ethers } = require("ethers");
const dotenv = require('dotenv');
const flashLoanAbi = require('../constants/flashloanAbi');

dotenv.config();

// Script to interact with the SimplifiedFlashLoan contract
async function main() {
  console.log("Starting flash loan execution script...");

  // Initialize setup with explicit RPC connection
  const rpcUrl = "http://127.0.0.1:8545";
  if (!rpcUrl) {
    console.error("ERROR: RPC_URL is not defined in .env file");
    process.exit(1);
  }
  
  const privateKey = process.env.OWNER_PRIVATE_KEY;
  if (!privateKey) {
    console.error("ERROR: PRIVATE_KEY is not defined in .env file");
    process.exit(1);
  }
  
  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  // Get network information
  const network = await provider.getNetwork();
  console.log(`Connected to network: ${network.name} (${network.chainId})`);
  
  // Contract details
  const contractAddress = process.env.FLASH_LOAN_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("ERROR: FLASH_LOAN_CONTRACT_ADDRESS is not defined in .env file");
    process.exit(1);
  }
  console.log("Using flash loan contract at:", contractAddress);
  console.log("Using account:", wallet.address);

  // Initialize contract instance
  const flashLoanContract = new ethers.Contract(
    contractAddress,
    flashLoanAbi.abi,
    wallet
  );

  // Configuration for the flash loan and swaps
  const assetAddress = process.env.BORROWED_TOKEN_ADDRESS; // Token to borrow (e.g., USDC, WETH)
  const targetTokenAddress = process.env.TARGET_TOKEN_ADDRESS; // Token to trade against
  
  // Fix for token decimals parsing
  const tokenDecimals = parseInt(process.env.TOKEN_DECIMALS || "18");
  const borrowAmountStr = process.env.BORROW_AMOUNT || "10";
  
  // Parse amount correctly using the numeric value of decimals
  const borrowAmount = ethers.parseUnits(borrowAmountStr, tokenDecimals);
  
  // Uniswap fee tiers (in basis points): 100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%
  const feeTier1 = parseInt(process.env.FEE_TIER_1 || "3000");
  const feeTier2 = parseInt(process.env.FEE_TIER_2 || "3000");

  console.log("Flash loan parameters:");
  console.log(`- Asset to borrow: ${assetAddress}`);
  console.log(`- Target token: ${targetTokenAddress}`);
  console.log(`- Borrow amount: ${borrowAmountStr} tokens (${borrowAmount.toString()} wei)`);
  console.log(`- Token decimals: ${tokenDecimals}`);
  console.log(`- Fee tier 1 (buy): ${feeTier1 / 10000}%`);
  console.log(`- Fee tier 2 (sell): ${feeTier2 / 10000}%`);

  try {
    // Get gas parameters
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    console.log(`Current gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    
    // Execute the flash loan
    console.log("Executing flash loan...");
    const tx = await flashLoanContract.requestFlashLoan(
      assetAddress,
      borrowAmount,
      targetTokenAddress,
      feeTier1,
      feeTier2,
      {
        gasLimit: 1000000, // Adjust as needed
        maxFeePerGas: gasPrice * 120n / 100n // 20% higher than current gas price
      }
    );
    
    console.log("Transaction sent! Hash:", tx.hash);
    console.log("Waiting for transaction confirmation...");
    
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);
    
    // Parse all events from the receipt
    console.log("\n------ EMITTED EVENTS ------");
    const events = parseEventsFromReceipt(receipt, flashLoanContract);
    
    // Log each event in a clean format
    if (events.length === 0) {
      console.log("No events found in transaction logs.");
    } else {
      events.forEach((event, index) => {
        console.log(`\nEvent #${index + 1}:`, event.name);
        displayEventArgs(event, tokenDecimals);
      });
    }
    
    // Check balance after the flash loan to see any token changes
    if (assetAddress) {
      console.log("\n------ BALANCE AFTER TRANSACTION ------");
      await checkBalances(assetAddress, wallet.address, provider, tokenDecimals);
    }
    
  } catch (error) {
    console.error("ERROR executing flash loan:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
    if (error.transaction) {
      console.error("Transaction hash:", error.transaction.hash);
    }
  }
}

// Parse all events from transaction receipt
function parseEventsFromReceipt(receipt, contract) {
  return receipt.logs
    .map(log => {
      try {
        return contract.interface.parseLog({
          topics: log.topics,
          data: log.data
        });
      } catch (e) {
        return null;
      }
    })
    .filter(parsed => parsed !== null);
}

// Format and display event arguments in a readable way
function displayEventArgs(event, decimals = 18) {
  for (let i = 0; i < event.args.length; i++) {
    const arg = event.args[i];
    
    // Try to determine if the value is an address
    const isAddress = typeof arg === 'string' && arg.match(/^0x[a-fA-F0-9]{40}$/);
    
    // Try to determine if the value is a large number (potential token amount)
    const isBigNumber = arg && typeof arg === 'bigint';
    
    if (isAddress) {
      console.log(`  Arg ${i}: ${arg} (address)`);
    } else if (isBigNumber) {
      // Format large numbers as both wei and ether equivalent
      console.log(`  Arg ${i}: ${arg.toString()} (${ethers.formatUnits(arg, decimals)} tokens)`);
    } else {
      console.log(`  Arg ${i}: ${arg}`);
    }
  }
}

// Function to check token balances
async function checkBalances(tokenAddress, walletAddress, provider, knownDecimals = null) {
  try {
    const tokenAbi = [
      "function balanceOf(address) view returns (uint256)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)"
    ];
    const tokenContract = new ethers.Contract(tokenAddress, tokenAbi, provider);
    const balance = await tokenContract.balanceOf(walletAddress);
    
    // Get token metadata safely
    let symbol = "Unknown";
    let decimals = knownDecimals || 18;
    
    try {
      symbol = await tokenContract.symbol();
    } catch (err) {
      console.warn("Could not get token symbol");
    }
    
    try {
      if (!knownDecimals) {
        decimals = await tokenContract.decimals();
      }
    } catch (err) {
      console.warn(`Could not get token decimals, using ${decimals}`);
    }
    
    console.log(`Balance of ${symbol}: ${ethers.formatUnits(balance, decimals)} (${balance.toString()} wei)`);
    return balance;
  } catch (error) {
    console.error(`Error checking balance: ${error.message}`);
    return ethers.parseUnits("0", 18);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Script execution failed:", error);
    process.exit(1);
  });