import { TextDocument, TextEdit, Position, Range } from 'vscode';
import * as  _ from "lodash/fp" ;
import * as path from "path";
import * as acorn from "acorn";
import { Program } from "estree";


const acornOptions: acorn.Options = {
    sourceType: "module",
    locations: true
};


const NOOP_EDIT = TextEdit.insert(new Position(0, 0), "");

function tryParse(line: string): Program | null {
    try {
        return acorn.parse(line, acornOptions);
    } catch (e) {
        return null;
    }
}


export function addImportToDocument(textDocument: TextDocument, moduleName: string, specifier: string) {
    const existingImports = getImportsForModule(textDocument, moduleName);

    if (existingImports.length === 0) {
        // No existing imports for this module
        return TextEdit.insert(new Position(0, 0), renderImport({ specifiers: [] }, moduleName, [specifier]));
    }

    if (importContainsSpecifier(existingImports, specifier)) {
        // The import exists and is already specified, nothing todo
        return NOOP_EDIT;
    }

    const replaceRange = new Range(new Position(existingImports[0].loc.start.line - 1, existingImports[0].loc.start.column), new Position(existingImports[0].loc.end.line - 1, existingImports[0].loc.end.column));
    return new TextEdit(replaceRange, renderImport(existingImports[0], moduleName, [specifier], false));
}

function getImportsForModule(textDocument: TextDocument, moduleName: string): any[] {
    return getImportStatementForModule(textDocument)
        .filter((node: any) => importStatementsEqual(node.source.value, moduleName))
}

function getImportStatementForModule(textDocument: TextDocument): object[] {
    const parse = tryParse(textDocument.getText());
    if (!parse) {
        return [];
    }

    return _.flow(
        _.filter(node => node.type === "ImportDeclaration")
    )(parse.body)
}

function renderImport(importStatement: any, moduleName: string, extraSpecifiers: string[], newline = true): string {
    const specifiers = `{${importStatement.specifiers.map(specifier => specifier.imported.name).concat(extraSpecifiers).join(", ")}}`;
    return `import ${specifiers} from "${moduleName}"${newline ? '\n' : ''}`;
}

function importContainsSpecifier(importNodes: any[], specifier: string) {
    return _.flow(
        _.flatMap(importNode => importNode.specifiers),
        _.any(specifierNode => specifierNode.imported.name === specifier)
    )(importNodes);
}

function importStatementsEqual(i1: string, i2: string): boolean {
    const parse1 = path.parse(i1);
    const parse2 = path.parse(i2);
    return (parse1.dir === parse2.dir) && (parse1.name === parse2.name);
}