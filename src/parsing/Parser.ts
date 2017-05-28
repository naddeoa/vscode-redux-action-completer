import { TextDocument, TextEdit, Position, Range } from 'vscode';
import * as  _ from "lodash";
import * as path from "path";
import * as acorn from "acorn";
import { SourceLocation, ImportSpecifier, ImportDefaultSpecifier, ImportNamespaceSpecifier, Literal, Program, ExpressionStatement, Statement, ModuleDeclaration, ImportDeclaration } from "estree";


export class Module {
    private readonly text: TextDocument;
    private readonly parse: ParseResult;

    constructor(text: TextDocument, parse: ParseResult) {
        this.text = text;
        this.parse = parse;
    }

    getImports(): Imports {
        switch (this.parse.type) {
            case "FailedParse": return [];
            case "SuccessfulParse": {
                return getAllImports(this.parse);
            }
        }
    }

    getImportsForModule(targetModule: string) {
        switch (this.parse.type) {
            case "FailedParse": return [];
            case "SuccessfulParse": {
                return getImportsForModule(targetModule, this.parse);
            }
        }

    }
}

type ParseResult = SuccessfulParse | FailedParse;

type FailedParse = {
    type: "FailedParse"
}

const FAILED_PARSE: FailedParse = { type: "FailedParse" };

type SuccessfulParse = {
    type: "SuccessfulParse",
    value: Program
};

export type Imports = Import[];


export interface Import {
    importDeclaration: ImportDeclaration
}

const OPTIONS: acorn.Options = {
    sourceType: "module",
    locations: true
};

function tryParse(documentText: string): ParseResult {
    try {
        return { type: "SuccessfulParse", value: acorn.parse(documentText, OPTIONS) };
    } catch (e) {
        return FAILED_PARSE;
    }
}

export function getLocationData(imp: Import): SourceLocation | null {
    const specifierNode: SourceLocation | null | undefined = imp.importDeclaration.loc

    if (specifierNode === null || specifierNode === undefined) {
        return null;
    } else {
        return specifierNode;
    }
}


export function containsSpecifier(imports: Imports, specifier: string): boolean {
    return _.chain(imports)
        .flatMap(importNode => importNode.importDeclaration.specifiers)
        .filter((specifierNode: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier) => {
            if (isImportSpecifier(specifierNode)) {
                return specifierNode.imported.name === specifier
            } else if (isImportDefaultSpecifier(specifierNode)) {
                return false;
            } else if (isImportNamespaceSpecifier(specifierNode)) {
                return false;
            }

        }).value().length > 0;
}

function isImportSpecifier(specifierNode: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier): specifierNode is ImportSpecifier {
    return specifierNode.type === "ImportSpecifier";
}

function isImportDefaultSpecifier(specifierNode: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier): specifierNode is ImportDefaultSpecifier {
    return specifierNode.type === "ImportDefaultSpecifier";
}

function isImportNamespaceSpecifier(specifierNode: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier): specifierNode is ImportNamespaceSpecifier {
    return specifierNode.type === "ImportNamespaceSpecifier";
}

export type ImportRender = {
    importStatement?: Import,
    moduleSource?: string,
    extraSpecifiers: string[],
    newline: boolean
}

export function renderImport(data: ImportRender): string {
    let specifiers: (ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier)[];
    let moduleSource: string;
    if (!data.importStatement) {
        specifiers = [];
        moduleSource = data.moduleSource || "unknown";
    } else {
        specifiers = data.importStatement.importDeclaration.specifiers
        moduleSource = data.moduleSource || new String(data.importStatement.importDeclaration.source.value).toString();
    }

    const specifierString: string = specifiers.map((specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier) => {
        if (isImportSpecifier(specifier)) {
            return specifier.imported.name;
        } else if (isImportDefaultSpecifier(specifier)) {
            return "";
        } else if (isImportNamespaceSpecifier(specifier)) {
            return "";
        }
    }).concat(data.extraSpecifiers).join(", ");
    return `import {${specifierString}} from "${data.moduleSource}"${data.newline ? '\n' : ''}`;
}

export function parse(textDocument: TextDocument): Module {
    const parse = tryParse(textDocument.getText());

    switch (parse.type) {
        case "FailedParse": return new Module(textDocument, FAILED_PARSE);
        case "SuccessfulParse": return new Module(textDocument, parse);
    }
}

function importContainsSpecifier(importNodes: Imports, specifier: string): boolean {
    return _.chain(importNodes)
        .flatMap(importNode => importNode.importDeclaration.specifiers)
        .filter((specifierNode: any) => specifierNode.imported.name === specifier)
        .value().length > 0;
}

function importStatementsEqual(i1: string, i2: string): boolean {
    const parse1 = path.parse(i1);
    const parse2 = path.parse(i2);
    return (parse1.dir === parse2.dir) && (parse1.name === parse2.name);
}

function getAllImports(parse: SuccessfulParse): Imports {
    return _.chain(parse.value.body)
        .filter(node => node.type === "ImportDeclaration")
        .map(node => <ImportDeclaration>node)
        .map((node: ImportDeclaration) => { return { importDeclaration: node } })
        .value();
}

function getImportsForModule(targetModuleName: string, parse: SuccessfulParse): Imports {
    return _.chain(getAllImports(parse))
        .filter((node: Import) => importStatementsEqual(new String(node.importDeclaration.source.value).toString(), targetModuleName))
        .value();
}
