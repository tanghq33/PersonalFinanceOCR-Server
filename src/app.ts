import MailListener from "mail-listener-fixed2";
import { Transaction } from "./models/transaction";
import { TNGeWalletManager } from "./utils/tng-ewallet-manager";
// import dotenv from "dotenv"
import nodemailer from "nodemailer";
import { dateConverter } from "./utils/date-converter";

async function main() {
  // let result = dotenv.config();

  // if (result.error) {
  //   throw result.error
  // }

  var mailListener = new MailListener({
    username: process.env.EMAIL_ADDRESS,
    password: process.env.EMAIL_PASSWORD,
    host: process.env.IMAP_HOST,
    port: process.env.IMAP_PORT, // imap port
    tls: true,
    connTimeout: 10000, // Default by node-imap
    authTimeout: 5000, // Default by node-imap,
    // debug: console.log, // Or your custom function with only one incoming argument. Default: null
    debug: null,
    tlsOptions: { rejectUnauthorized: false },
    mailbox: "INBOX", // mailbox to monitor
    searchFilter: ["UNSEEN", "FLAGGED"], // the search filter being used after an IDLE notification has been retrieved
    markSeen: true, // all fetched email willbe marked as seen and not fetched next time
    fetchUnreadOnStart: true, // use it only if you want to get all unread email on lib start. Default is `false`,
    mailParserOptions: { streamAttachments: true }, // options to be passed to mailParser lib.
    attachments: true, // download attachments as they are encountered to the project directory
    attachmentOptions: { directory: "attachments/" } // specify a download directory for attachments
  });

  mailListener.start();

  mailListener.on("server:connected", function () {
    console.log("imapConnected");
  });

  mailListener.on("server:disconnected", function () {
    console.log("imapDisconnected");
  });

  mailListener.on("error", function (err) {
    console.log(err);
  });

  mailListener.on("mail", function (mail, seqno, attributes) {
    // do something with mail object including attachments
    // console.log("emailParsed", mail);
    // mail processing code goes here

    mailListener.imap.seq.addFlags(seqno, '\\Deleted', function (error) { console.log(error) });

  });

  mailListener.on("attachment", function (attachment) {
    if (attachment.filename == 'tng_ewallet_transactions.pdf') {
      console.log(`Received ${attachment.filename}...`);

      let data = attachment.content;
      let filename = attachment.filename;
      // fs.writeFileSync(filename, data);

      let stream = attachment.content;

      var buffers = [];
      stream.on('readable', function (buffer) {
        for (; ;) {
          let buffer = stream.read();
          if (!buffer) { break; }
          buffers.push(buffer);
        }
      });

      stream.on('end', async function () {
        var buffer = Buffer.concat(buffers);

        // START PROCESS BUFFER
        console.log(`Parsing file...`);
        let statementStr = await TNGeWalletManager.readTNGeWalletTransactions(buffer);
        console.log(`Processing file...`);
        processAndSendStatement(statementStr);

      });
    } else {
      console.log(`Invalid filename, will not process the file. Filename: ${attachment.filename}`);
    }
  });

  console.log("Service started.");
}

function processAndSendStatement(value: string): void {
  let text = value;

  // Get TNG Wallet ID Mapping
  let walletIdMap = new Map<string, string>();
  let walletIdMapStr = process.env.TNG_BUDGETBAKERS_MAP;
  let walletIdMapStrSplit = walletIdMapStr.split(';');
  for (let i = 0; i < walletIdMapStrSplit.length; i++) {
    let individualWalletIdMapStr = walletIdMapStrSplit.at(i);
    let individualWalletIdMapStrSplit = individualWalletIdMapStr.split(':');

    let key = individualWalletIdMapStrSplit.at(0);
    let value = individualWalletIdMapStrSplit.at(1);
    walletIdMap.set(key, value);
  }

  let indexOfWalletBalance = text.indexOf("Wallet Balance[#]");
  // Look for wallet id
  let headerString = text.substring(0, indexOfWalletBalance);
  let walletIds = Array.from(walletIdMap.keys());
  let currentWalletId = '';
  for (let i = 0; i < walletIds.length; i++) {
    if (headerString.indexOf(walletIds.at(i)) >= 0) {
      currentWalletId = walletIds.at(i);
    }
  }

  if (currentWalletId != '') {
    console.log(`Current wallet id: ${currentWalletId}, destination email: ${walletIdMap.get(currentWalletId)}`);

    // Trim eWallet Headers
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

    // Sort Array
    var sortedTransactionArray: Transaction[] = transactionArray.sort((obj1, obj2) => {
      if (obj1.date > obj2.date) {
        return 1;
      }

      if (obj1.date < obj2.date) {
        return -1;
      }

      return 0;
    });

    let startDate = dateConverter.toString(sortedTransactionArray[0].date, '-');
    let endDate = dateConverter.toString(sortedTransactionArray.pop().date, '-');
    let filename;
    if (startDate == endDate) {
      filename = `${startDate}.csv`;
    } else {
      filename = `${startDate} to ${endDate}.csv`;
    }

    // Write CSV Transactions
    let csvBuffer: Buffer = TNGeWalletManager.exportTNGeWalletTransactionsCSV(transactionArray);
    let destinationAddress = walletIdMap.get(currentWalletId);

    console.log(`Sending file to "${destinationAddress}". Filename: ${filename}`);
    sendEmail(destinationAddress, filename, csvBuffer);
    console.log('Successfully send!');

  }
}

function sendEmail(destinationAddress: string, filename: string, attachment: Buffer): void {
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD,
    }
  });

  var mailOptions = {
    from: process.env.EMAIL_ADDRESS,
    to: destinationAddress,
    subject: 'TNGeWallet Transactions CSV',
    attachments: [
      {   // binary buffer as an attachment
        filename: filename,
        content: attachment
      }
    ]
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
}

main();