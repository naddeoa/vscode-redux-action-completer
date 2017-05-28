import { TextDocument, TextEdit, Position, Range } from 'vscode';
import * as  _ from "lodash";
import * as path from "path";
import * as acorn from "acorn";
import { Program, ExpressionStatement, Statement, ModuleDeclaration } from "estree";

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


export function addImportToDocument(textDocument: TextDocument, moduleName: string, specifier: string) : TextEdit {
    const existingImports = getImportsForModule(textDocument, moduleName);

    if (existingImports.length === 0) {
        // No existing imports for this module
        return TextEdit.insert(new Position(0, 0), renderImport({ specifiers: [] }, moduleName, [specifier]));
    }

    if (importContainsSpecifier(existingImports, specifier)) {
        // The import exists and is already specified, nothing todo
        return NOOP_EDIT;
    }

    // Just work with the first one. There will only be multiples if the user has imported the
    // same module multiple times.
    const existingImport: (Statement | ModuleDeclaration) = existingImports[0];

    // If we have location information in the parse from acorn then use it
    if (existingImport.loc) {
        const replaceRange = new Range(new Position(existingImport.loc.start.line - 1, existingImport.loc.start.column), new Position(existingImport.loc.end.line - 1, existingImport.loc.end.column));
        return new TextEdit(replaceRange, renderImport(existingImports[0], moduleName, [specifier], false))
    } else {
        return TextEdit.insert(new Position(0, 0), renderImport(existingImports[0], moduleName, [specifier]));
    }
}

function getImportsForModule(textDocument: TextDocument, moduleName: string): (Statement | ModuleDeclaration)[] {
    return getImportStatementForModule(textDocument)
        .filter((node: any) => importStatementsEqual(node.source.value, moduleName))
}

function getImportStatementForModule(textDocument: TextDocument): (Statement | ModuleDeclaration)[] {
    const parse = tryParse(textDocument.getText());
    if (parse === null) {
        return [];
    }

    return _.chain(parse.body)
        .filter(node => node.type === "ImportDeclaration")
        .value();
}

function renderImport(importStatement: any, moduleName: string, extraSpecifiers: string[], newline = true): string {
    const specifiers = `{${importStatement.specifiers.map((  specifier: any )=> specifier.imported.name).concat(extraSpecifiers).join(", ")}}`;
    return `import ${specifiers} from "${moduleName}"${newline ? '\n' : ''}`;
}

function importContainsSpecifier(importNodes: any[], specifier: string) {
    return _.chain(importNodes)
        .flatMap(importNode => importNode.specifiers)
        .filter( (specifierNode : any) => specifierNode.imported.name === specifier)
        .value().length > 0;
}

function importStatementsEqual(i1: string, i2: string): boolean {
    const parse1 = path.parse(i1);
    const parse2 = path.parse(i2);
    return (parse1.dir === parse2.dir) && (parse1.name === parse2.name);
}