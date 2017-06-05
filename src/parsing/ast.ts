import { Identifier, ImportDeclaration, ImportSpecifier, SimpleLiteral } from 'estree';

export function createImportSpecifiers(names: string[]): ImportSpecifier[] {
    return names.map(name => {
        const identifier = createIdentifier(name);
        return <ImportSpecifier>{
            type: "ImportSpecifier",
            imported: identifier,
            local: identifier
        };
    })
}

export function createIdentifier(name: string): Identifier {
    return {
        type: "Identifier",
        name
    };
}

export function createSimpleLiteral(value: string): SimpleLiteral {
    return {
        type: "Literal",
        value: value,
        raw: `'${value}'`
    };
}

export function createImportDeclaration(source: string, specifiers: string[]): ImportDeclaration {
    return {
        type: "ImportDeclaration",
        specifiers: createImportSpecifiers(specifiers),
        source: createSimpleLiteral(source)
    }
}

export function addSpecifiersToImport(importDeclaration: ImportDeclaration, specifiers: ImportSpecifier[]): ImportDeclaration {
    if (specifiers.length === 0) {
        return importDeclaration;
    }

    return Object.assign({}, importDeclaration, { specifiers: importDeclaration.specifiers.concat(specifiers) });
}