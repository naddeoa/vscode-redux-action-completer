import * as ast from './ast';
import { ParsedImport } from './Parser';
import * as escodegen from 'escodegen';
import { ImportDeclaration } from 'estree';

export type ImportRender = {
    importStatementOrSource: ParsedImport | string,
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
