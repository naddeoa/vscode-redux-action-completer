import { crossProduct3, Triple, CrossProduct3 } from "./util/cross-product";
import { ActionSource, createGeneratedImport } from "./ActionSource";
import { window, Uri, languages, Disposable, WorkspaceConfiguration, workspace } from 'vscode';
import parser, { ParsedModule, ParsedExport, getExportName } from "./parsing/Parser";
import Plugin from "./Plugin";
import { flatMap, map, reduce, flatten } from "lodash";

/**
 * 
 * @param plugin 
 */
export async function getActions(plugin: Plugin): Promise<ActionSource[]> {
    // For now, just ignore module types. I don't have a great way of importing them without
    // having to parse the file with acorn. I can just use require on the script types.
    const modules = await generateListings(plugin.getActionModules(), plugin.getNodeModulePaths(), plugin.getFileGlobs());
    const localFiles = await generateLocalListings(plugin.getLocalFileGlobs(), plugin.getLocalSourceDir());

    const imports = await getAllImports(false, modules, plugin.require);
    const localImports = await getAllImports(true, localFiles, plugin.require);
    return imports.concat(localImports);
}

/**
 * 
 * @param listings 
 * @param localListings 
 * @param requireFn 
 */
async function getAllImports(local: boolean, listings: FileListing[], requireFn: (path: string) => any): Promise<ActionSource[]> {

    const imports: Promise<ActionSource[]>[] = flatMap(listings, async (moduleLookup: FileListing) => {
        try {
            return moduleLookup.files.map((file: Uri) => createGeneratedImport(local, file, Object.keys(requireFn(file.fsPath)), moduleLookup.moduleName));
        } catch (e) {
            console.error("Probably failed to require the file because it uses es2015. Will attempt to parse it next.", e);
        }

        try{
            return extractActionSources(local, moduleLookup);
        } catch(e){
            window.showWarningMessage(`Could not get actions for ${moduleLookup.moduleName}, skipping it.`);
        }
    });

    return flatten(await Promise.all(imports));
}

/**
 * 
 * @param localFileGlobs 
 * @param localSourceDir 
 */
async function generateLocalListings(localFileGlobs: string[], localSourceDir: string): Promise<FileListing[]> {
    return Promise.all(localFileGlobs.map(async (glob: string) => {
        const files = await workspace.findFiles(`${localSourceDir}/${glob}`, "node_modules"); // TODO exclude multiple node modules from plugin.getNodeModulePaths
        return { moduleName: localSourceDir, files };
    }));
}

/**
 * 
 * @param moduleNames
 * @param nodeModulePaths 
 * @param fileGlobs 
 */
async function generateListings(moduleNames: string[], nodeModulePaths: string[], fileGlobs: string[]): Promise<FileListing[]> {
    const targetPaths: CrossProduct3 = crossProduct3(nodeModulePaths, moduleNames, fileGlobs);

    switch (targetPaths.type) {
        case "Success":
            return Promise.all(targetPaths.result.map(async ([modulePath, moduleName, fileGlob]: Triple) => {
                const files = await workspace.findFiles(`${modulePath}/${moduleName}/${fileGlob}`);
                return { moduleName, files }
            }));

        default:
            window.showErrorMessage("Could not parse files to lookup available actions.");
            return Promise.resolve([]);
    }
}

/**
 * 
 * @param moduleLookup 
 */
async function extractActionSources(local: boolean, moduleLookup: FileListing): Promise<ActionSource[]> {
    const imports: Promise<ActionSource[]> = Promise.all(moduleLookup.files.map(async (file: Uri) => {
        const textDocument = await workspace.openTextDocument(file);
        const module: ParsedModule = parser.parse(textDocument);
        const actions = module.getExports().map(getExportName);
        return createGeneratedImport(local, file, flatten(actions), moduleLookup.moduleName);
    }));

    return await imports;
}

/**
 * DTO for mapping files/modules to retain some context.
 * Relates a module with the files that we care about from it.
 */
type FileListing = {
    moduleName: string,
    files: Uri[]
}
