import fs from 'fs';
import pdf from 'pdf-parse';
import { OverallTransactionType } from '../enums/overall-transaction-type';
import { Transaction } from '../models/transaction';
import { dateConverter } from './date-converter';

export const TNGeWalletManager = {

    readTNGeWalletTransactions: async (dataBuffer: Buffer): Promise<string> => {
        let options = {
            pagerender: render_page
        }

        const data = await pdf(dataBuffer, options);
        if (data.text != undefined) {
            return data.text;
        }
        else {
            return undefined;
        }
    },
    exportTNGeWalletTransactionsCSV: (transactions: Transaction[]): Buffer => {
        let output: string = 'Date,Payee,Note,Reference,Expense,Income\n';

        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];

            if (transaction == undefined) {
                throw new Error('Undefined transaction!');
            }

            // IGNORE USELESS TRANSACTIONS
            if (transaction.amount <= 0.005) continue;
            if (transaction.transactionType.indexOf('Cash In') >= 0) continue;
            if (transaction.transactionType.indexOf('Cash Out') >= 0) continue;
            if (transaction.description.indexOf('Via FPX to GO+') >= 0) continue;
            if (transaction.description.indexOf('Quick Reload Payment (via GO+') >= 0) continue;

            const date = dateConverter.toString(transaction.date);
            const payee = transaction.transactionType;
            const reference = transaction.reference;
            const note = transaction.description;
            // const note = `${transaction.transactionType} (Reference: ${transaction.reference})`;
            const debit = transaction.overallTransactionType == OverallTransactionType.Debit ? transaction.amount : 0;
            const credit = transaction.overallTransactionType == OverallTransactionType.Credit ? transaction.amount : 0;

            output += `${date},${payee},${note},${reference},${debit},${credit}\n`;
        }

        return Buffer.from(output, 'utf8');
    }
}

// default render callback
function render_page(pageData) {
    //check documents https://mozilla.github.io/pdf.js/
    let render_options = {
        //replaces all occurrences of whitespace with standard spaces (0x20). The default value is `false`.
        normalizeWhitespace: true,
        //do not attempt to combine same line TextItem's. The default value is `false`.
        disableCombineTextItems: true
    }

    return pageData.getTextContent(render_options)
        .then(function (textContent) {
            let lastY, text = '';
            let count = 0;
            for (let item of textContent.items) {
                let str = item.str;

                if (str == '') continue;
                if (str.startsWith('*This email')) continue;
                if (str.startsWith('call us')) continue;
                if (str.startsWith('GO+ TRANSACTION')) continue;

                // const strSplit = str.split('/');
                // if (strSplit.length == 3 && str.length <= 10) {
                if (str.match('^(0?[1-9]|[12][0-9]|3[01])\\/(0?[1-9]|1[012])\\/\\d{4}$')) {
                    text += '[#]' + str;
                }
                else {
                    if (lastY == item.transform[5] || !lastY) {
                        text += str;
                    } else {
                        text += '[@]' + str;
                    }
                }

                lastY = item.transform[5];
            }
            return text;
        });
}