import parser, { containsSpecifier, getLocationData, ParsedImport, ParsedModule } from './parsing/Parser';
import { renderImport } from './parsing/Renderer';
import { Position, Range, TextDocument, TextEdit } from 'vscode';

const NOOP_EDIT = TextEdit.insert(new Position(0, 0), "");

export function addImportToDocument(textDocument: TextDocument, moduleName: string, specifier: string): TextEdit {
    const module: ParsedModule = parser.parse(textDocument);

    const existingImports = module.getImportsForModule(moduleName);

    if (existingImports.length === 0) {
        // No existing imports for this module
        const renderedImport = renderImport({
            importStatementOrSource: moduleName,
            extraSpecifiers: [specifier],
            newline: true
        });
        return TextEdit.insert(new Position(0, 0), renderedImport);
    }

    if (containsSpecifier(existingImports, specifier)) {
        // The import exists and is already specified, nothing todo
        return NOOP_EDIT;
    }

    // Just work with the first one. There will only be multiples if the user has imported the
    // same module multiple times.
    const existingImport: ParsedImport = existingImports[0];
    const locationData = getLocationData(existingImport);

    // If we have location information in the parse from acorn then use it
    if (locationData) {
        const renderedImport = renderImport({
            importStatementOrSource: existingImport,
            extraSpecifiers: [specifier]
        })
        const replaceRange = new Range(new Position(locationData.start.line - 1, locationData.start.column), new Position(locationData.end.line - 1, locationData.end.column));
        return new TextEdit(replaceRange, renderedImport)
    } else {
        const renderedImport = renderImport({
            importStatementOrSource: existingImport,
            extraSpecifiers: [specifier]
        })
        return TextEdit.insert(new Position(0, 0), renderedImport);
    }
}