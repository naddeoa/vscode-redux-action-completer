import {
    Comment,
    ImportDeclaration,
    ImportDefaultSpecifier,
    ImportNamespaceSpecifier,
    ImportSpecifier,
    Program,
    SourceLocation,
    ExportNamedDeclaration,
    ExportDefaultDeclaration
} from 'estree';
import * as acorn from 'acorn';
import * as escodegen from 'escodegen';
import * as _ from 'lodash';
import * as path from 'path';
import { Disposable, TextDocument, workspace } from 'vscode';

export class ParsedModule {
    private readonly text: TextDocument;
    private readonly parseResults: ParseResult;

    constructor(text: TextDocument, parse: ParseResult) {
        this.text = text;
        this.parseResults = parse;
    }

    getImports(): ParsedImports {
        switch (this.parseResults.type) {
            case "FailedParse": return [];
            case "SuccessfulParse": {
                return getAllImports(this.parseResults);
            }
        }
    }

    getImportsForModule(targetModule: string): ParsedImports {
        switch (this.parseResults.type) {
            case "FailedParse": return [];
            case "SuccessfulParse": {
                return getImportsForModule(targetModule, this.parseResults);
            }
        }

    }

    getExports(): ParsedExports {
        switch (this.parseResults.type) {
            case "FailedParse": return [];
            case "SuccessfulParse": {
                return getAllExports(this.parseResults);
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

export type ParsedImports = ParsedImport[];

export interface ParsedImport {
    importDeclaration: ImportDeclaration
}


export type ParsedExports = ParsedExport[];

export interface ParsedExport {
    exportDeclaration: ExportNamedDeclaration | ExportDefaultDeclaration
}

export function getExportName(exp: ParsedExport): string[] {
    const declaration = exp.exportDeclaration.declaration;
    if (!declaration) {
        return [];
    }

    switch (declaration.type) {
        case "VariableDeclaration":
            return _.flatMap(declaration.declarations, (dec => {
                switch (dec.id.type) {
                    case "Identifier":
                        return [dec.id.name];
                    default:
                        return [];

                }
            }));
        case "FunctionDeclaration":
            switch (declaration.id.type) {
                case "Identifier":
                    return [declaration.id.name];
                default:
                    return [];
            }
        default:
            return [];
    }
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
            // escodegen.attachComments(parse, onComment, onToken);
            return results;
        } catch (e) {
            console.log(e);
            return FAILED_PARSE;
        }
    }

    private extractText(thing: string | TextDocument) {
        if (typeof thing === "string") {
            return thing;
        }

        return thing.getText();
    }

    parse(textDocument: TextDocument): ParsedModule {
        const parse = this.tryParse(textDocument);

        switch (parse.type) {
            case "FailedParse": return new ParsedModule(textDocument, FAILED_PARSE);
            case "SuccessfulParse": return new ParsedModule(textDocument, parse);
        }
    }

    dispose() {
        this.disposables.dispose();
    }
}

export default new Parser();

export function getLocationData(imp: ParsedImport): SourceLocation | null {
    const specifierNode: SourceLocation | null | undefined = imp.importDeclaration.loc

    if (specifierNode === null || specifierNode === undefined) {
        return null;
    } else {
        return specifierNode;
    }
}

export function containsSpecifier(imports: ParsedImports, specifier: string): boolean {
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

function importContainsSpecifier(importNodes: ParsedImports, specifier: string): boolean {
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

function getAllImports(parse: SuccessfulParse): ParsedImports {
    return _.chain(parse.value.body)
        .filter(node => node.type === "ImportDeclaration")
        .map(node => <ImportDeclaration>node)
        .map((node: ImportDeclaration) => ({ importDeclaration: node }))
        .value();
}

function getAllExports(parse: SuccessfulParse): ParsedExports {
    return _.chain(parse.value.body)
        .filter(node => node.type === "ExportNamedDeclaration")
        .map(node => <ExportNamedDeclaration>node)
        .map((node: ExportNamedDeclaration) => ({ exportDeclaration: node }))
        .value();
}

function getImportsForModule(targetModuleName: string, parse: SuccessfulParse): ParsedImports {
    return _.chain(getAllImports(parse))
        .filter((node: ParsedImport) => importStatementsEqual(new String(node.importDeclaration.source.value).toString(), targetModuleName))
        .value();
}
