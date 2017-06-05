import { Uri, window, workspace, TextDocument } from "vscode";
import * as p from "path";

function basename(filepath: string) {
    return p.basename(filepath, p.extname(filepath));
};

/**
 * A generated import is a collection of data that can be used to generate an import statememnt.
 * @param path The file path for this module. i.e. "/path/to/my-app/src/actions/MyModule".
 * @param fileName The file name of this module. i.e. "MyModule.js".
 * @param moduleName The name of the module. i.e. "my-app".
 * @param actions The actions inside of this module. It is assumed that everything exported from it are action creators/actions.
 * @param getImportName A function that returns the string that is used to import this statement. i.e. "my-app/actions/SomeActions""
 */
export interface ActionSource {
    path: string;
    fileName: string;
    moduleName: string,
    actions: string[];
    getImportName: (doc: TextDocument) => string
}

export function createGeneratedImport(local: boolean, { fsPath: path }: Uri, actions: string[], moduleName: string): ActionSource {
    return {
        fileName: basename(path),
        path,
        moduleName,
        actions,
        getImportName: deriveImportName(local, path, moduleName),
    };
}


/**
 * Given a path and a module name, derive what a user would need to type if
 * they were to import it into their project.
 * @param path Full path to a file, i.e. "/path/to/my-app/src/actions/MyModule".
 * @param moduleName The name of the module that this file resides in. i.e. "my-app".
 * @returns Something like "my-app/actions/SomeActions".
 */
function deriveImportName(local: boolean, path: string, moduleName: string): (doc: TextDocument) => string {
    const fn = local ? deriveLocalImportName : deriveDependencyImportName;
    return fn(path, moduleName);
}

function deriveDependencyImportName(path: string, moduleName: string): (doc: TextDocument) => string {

    const parse = p.parse(path);
    const reg = new RegExp(`${moduleName}.*`);
    const match = reg.exec(parse.dir);

    if (match) {
        return (doc) => `${match[0].replace("src/", "")}${p.sep}${parse.name}`;
    }

    return (doc) => path;
}

function deriveLocalImportName(path: string, moduleName: string): (doc: TextDocument) => string {
    return (doc) => {
        const relativePath = p.relative(doc.fileName, path).replace(/^\.\./, ".");
        const parsedPath = p.parse(relativePath);
        return relativePath.replace(parsedPath.ext, "");
    };
}
