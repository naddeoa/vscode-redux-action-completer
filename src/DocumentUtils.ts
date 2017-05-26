import { TextDocument } from 'vscode';
const acorn = require("acorn");


export function importsModule(moduleName: string): boolean {

    return false;
}

export function getImportStatementForModule(moduleName: string): string[] {
    debugger;
    var parse = acorn.parse("var a = 1;");
    debugger;

    return [];
}

