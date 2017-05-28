import { Uri } from "vscode";
import * as p from "path";

function basename(filepath: string) {
    return p.basename(filepath, p.extname(filepath));
};

/**
 * @param path The file path for this module. i.e. "/path/to/my-app/src/MyModule".
 * @param fileName The file name of this module. i.e. "MyModule.js".
 * @param moduleName The name of the module. i.e. "my-app".
 * @param actions The actions inside of this module. It is assumed that everything exported from it are action creators/actions.
 * @param importName The string that is used to import this statement. i.e. "my-app/actions/SomeActions""
 */
export interface Import {
    path: string;
    fileName: string;
    moduleName: string,
    actions: string[];
    importName: string,
}

export function createImport({ fsPath: path }: Uri, module: any, moduleName: string): Import {
    return {
        fileName: basename(path),
        path,
        moduleName,
        actions: Object.keys(module),
        importName: deriveImportName(path, moduleName)
    };
}

function deriveImportName(path: string, moduleName: string): string {
    const parse = p.parse(path);
    const reg = new RegExp(`${moduleName}.*`);
    const match = reg.exec(parse.dir);

    if (match) {
        return `${match[0].replace("src/", "")}${p.sep}${parse.name}`;
    }

    return path;
}