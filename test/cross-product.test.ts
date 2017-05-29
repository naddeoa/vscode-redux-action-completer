import * as assert from 'assert';
import * as vscode from 'vscode';
import crossProduct, { crossProduct3, Triple, CrossProduct3 } from '../src/util/cross-product';

// Defines a Mocha test suite to group tests of similar kind together
suite("Cross Product Tests", () => {

    // Defines a Mocha unit test
    test("crossProduct3", () => {
        const data = [["a", "b"], ["c", "d"], ["e", "f"]];
        const results: CrossProduct3 = crossProduct3(data[0], data[1], data[2]);

        switch (results.type) {
            case "Success":
                const expected: [Triple] = [["a", "c", "e"], ["a", "c", "f"], ["a", "d", "e"], ["a", "d", "f"], ["b", "c", "e"], ["b", "c", "f"], ["b", "d", "e"], ["b", "d", "f"]];
                assert.deepEqual(expected, results.result);
                break;
            default: throw new Error("should not happen");
        }
    });

    test("crossProduct3 with an empty input", () => {
        const data = [["a", "b"], []];
        const results: CrossProduct3 = crossProduct3(data[0], data[1], data[2]);

        switch (results.type) {
            case "Failure": break;
            default: throw new Error("should not happen");
        }
    });

});