import { Uri } from "vscode";
import * as path from "path";

function basename(filepath) {
    return path.basename(filepath, path.extname(filepath));
};

export interface Import {
    path: string;
    name: string;
    actions: string[];
}

export function createImport({ fsPath: path }: Uri, module: any): Import {
    return {
        name: basename(path),
        path,
        actions: Object.keys(module)
    }
}