import { flatMap, map, reduce, flatten } from "lodash";
import { isEmpty } from "lodash";

export type Triple = [string, string, string];

export type CrossProduct3 = { type: "Success", result: [Triple] } | { type: "Failure" };


export default function crossProduct(data: string[][]): string[][] {
    return reduce(data, (memo: string[][], next: string[]) => {
        return flatten(map(memo, (m: string[]) => {
            return map(next, (n: string) => {
                return m.concat(n);
            });
        }));
    }, [[]]);
}

export function crossProduct3(data1: string[], data2: string[], data3: string[]): CrossProduct3 {
    if (isEmpty(data1) || isEmpty(data2) || isEmpty(data3)) {
        return { type: "Failure" };
    }

    return {
        type: "Success",
        result: <[[string, string, string]]>crossProduct([data1, data2, data3])
    };
}