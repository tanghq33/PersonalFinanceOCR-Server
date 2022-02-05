import { Transaction } from "./models/transaction";
import { TNGeWalletManager } from "./utils/tng-ewallet-manager";

async function main() {
  let text = await TNGeWalletManager.readTNGeWalletTransactions('C:\\Users\\tanghaoquan\\Downloads\\Documents\\tng_ewallet_transactions_23.pdf');

  // Trim eWallet Headers
  let indexOfWalletBalance = text.indexOf("Wallet Balance[#]");
  text = text.replace("Wallet Balance[#]", "").substring(indexOfWalletBalance, text.length);
  // Replace GO+ Headers
  text = text.replace('Date[@]Status[@]Transaction Type[@]Reference[@]Description[@]Details[@]Amount (RM)[@]GO+ Balance', '');

  // Split text to transactions
  const transactions = text.split('[#]');
  let transactionArray: Transaction[] = new Array();

  // Read PDF Transactions
  transactions.forEach(transactionStr => {
    let transactionObj = new Transaction();
    transactionObj.parse(transactionStr);
    transactionArray.push(transactionObj);
  });

  // Write CSV Transactions
  TNGeWalletManager.exportTNGeWalletTransactionsCSV('C:\\Users\\tanghaoquan\\Downloads\\Documents\\tng_ewallet_transactions_23.csv', transactionArray);

  console.log(transactionArray);
}

main();