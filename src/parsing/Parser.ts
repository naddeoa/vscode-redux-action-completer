import { Disposable, TextDocument, TextEdit, TextDocumentChangeEvent, Position, Range, workspace } from 'vscode';
import * as ast from "./ast";
import * as  _ from "lodash";
import * as path from "path";
import * as acorn from "acorn";
import * as escodegen from "escodegen";
import { Comment, SourceLocation, ImportSpecifier, ImportDefaultSpecifier, ImportNamespaceSpecifier, Literal, Program, ExpressionStatement, Statement, ModuleDeclaration, ImportDeclaration } from "estree";


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

    getImportsForModule(targetModule: string): Imports {
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
    comments: acorn.Comment[],
    tokens: acorn.Token[],
    value: Program
};

export type Imports = Import[];

export interface Import {
    importDeclaration: ImportDeclaration
}


function getParseOptions(options: acorn.Options = {}): acorn.Options {
    return Object.assign({}, {
        sourceType: "module",
        locations: true,
        ranges: true,
    }, options);

}

class Parser {

    private readonly parseCache = new Map<TextDocument, SuccessfulParse>();
    private readonly disposables: Disposable;

    constructor() {
        this.disposables = Disposable.from(workspace.onDidChangeTextDocument(e => this.parseCache.delete(e.document)));
    }

    private tryParse(doc: TextDocument): ParseResult {
        // If we have a cached parse then use that instead of reparsing
        const cachedParse = this.parseCache.get(doc);
        if (cachedParse) {
            return cachedParse;
        }

        try {
            const onComment: acorn.Comment[] = [];
            const onToken: acorn.Token[] = [];
            const parseOptions = getParseOptions({
                onToken, onComment
            })
            const parse = acorn.parse(doc.getText(), parseOptions);
            const results: SuccessfulParse = { type: "SuccessfulParse", value: parse, comments: onComment, tokens: onToken };
            this.parseCache.set(doc, results);
            escodegen.attachComments(parse, onComment, onToken);
            return results;
        } catch (e) {
            console.log(e);
            return FAILED_PARSE;
        }
    }

    parse(textDocument: TextDocument): Module {
        const parse = this.tryParse(textDocument);

        switch (parse.type) {
            case "FailedParse": return new Module(textDocument, FAILED_PARSE);
            case "SuccessfulParse": return new Module(textDocument, parse);
        }
    }

    dispose() {
        this.disposables.dispose();
    }
}

export default new Parser();

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
    importStatementOrSource: Import | string,
    extraSpecifiers: string[],
    newline?: boolean
}

export function renderImport(data: ImportRender): string {
    let rendered: string;
    if (typeof data.importStatementOrSource === "string") {
        const importDeclaration: ImportDeclaration = ast.createImportDeclaration(data.importStatementOrSource, data.extraSpecifiers);
        rendered = escodegen.generate(importDeclaration, { format: { indent: { style: " " } } }).replace(/\n/g, "");
    } else {

        const newImport = ast.addSpecifiersToImport(data.importStatementOrSource.importDeclaration, ast.createImportSpecifiers(data.extraSpecifiers));
        rendered = escodegen.generate(newImport, { format: { indent: { style: " " } } }).replace(/\n/g, "");
    }

    return `${rendered}${data.newline ? "\n" : ""}`;
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
