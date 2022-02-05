import { assert } from "console";

export const dateConverter = {
    fromString: (dateStr: string): Date => {
        let dateSplit = dateStr.split('/');
        if (dateSplit.length == 3) {
            let day = parseInt(dateSplit[0]);
            let month = parseInt(dateSplit[1]) - 1;
            let year = parseInt(dateSplit[2]);

            return new Date(year, month, day);
        }
        else {
            throw new Error('Invalid date format!');
        }
    },
    toString: (date: Date): string => {
        assert(date != undefined, 'Expects "date" parameter!');

        return date.getDate().toString() + '/' + (date.getMonth() + 1).toString() + '/' + date.getFullYear().toString();
    }
}