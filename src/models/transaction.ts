import { execPath } from 'process';
import { OverallTransactionType } from '../enums/overall-transaction-type';
import { dateConverter } from '../utils/date-converter';

const CREDIT_TRANSACTIONS: string[] = ['Balance Top Up',
    'Reload',
    'eWallet Cash In',
    'GO+ Cash In',
    'Receive from Wallet',
    'GO+ Daily Earnings',
    'Refund',
    'Cashback',
    'Cash Reward',
    'GO+ PromoReward'];

const DEBIT_TRANSACTIONS: string[] = ['DuitNow QR TNGD',
    'DuitNow QR',
    'PayDirect Payment',
    'RFID Payment',
    'eWallet Cash Out',
    'GO+ Cash Out',
    'Transfer to Wallet',
    'Payment'];

export class Transaction {
    date: Date;
    status: string;
    transactionType: string;
    overallTransactionType: OverallTransactionType;
    reference: string;
    description: string;
    details: string;
    amount: number;
    balance: number;


    parse(line: string): void {
        let transactionSplit = line.split('[@]');

        if (transactionSplit.length == 8 || transactionSplit.length == 7) {
            this.date = dateConverter.fromString(transactionSplit[0].trim());
            this.status = transactionSplit[1].trim();
            this.transactionType = transactionSplit[2].trim();

            // Categories transactions
            if (CREDIT_TRANSACTIONS.includes(this.transactionType)) {
                this.overallTransactionType = OverallTransactionType.Credit;
            } else if (DEBIT_TRANSACTIONS.includes(this.transactionType)) {
                this.overallTransactionType = OverallTransactionType.Debit;
            } else {
                throw new Error('Invalid transaction type! Transaction type: ' + this.transactionType);
            }

            this.reference = transactionSplit[3];

            if (transactionSplit.length == 8) {
                this.description = transactionSplit[4].trim();
                this.details = transactionSplit[5].trim();
                this.amount = parseFloat(transactionSplit[6].replace('RM', '').trim());
                this.balance = parseFloat(transactionSplit[7].replace('RM', '').trim());
            } else {
                this.description = '-';
                this.details = transactionSplit[4].trim();
                this.amount = parseFloat(transactionSplit[5].replace('RM', '').trim());
                this.balance = parseFloat(transactionSplit[6].replace('RM', '').trim());
            }

        }
        else {
            throw new Error('Invalid transaction format!\n' + line);
        }
    }
}


