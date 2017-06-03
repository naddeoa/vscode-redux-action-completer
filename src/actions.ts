import { crossProduct3, Triple, CrossProduct3 } from "./util/cross-product";
import { GeneratedImport, createGeneratedImport } from "./GeneratedImport";
import { window, Uri, languages, Disposable, WorkspaceConfiguration, workspace } from 'vscode';
import parser, { Module, ParsedExport, getExportName } from "./parsing/Parser";
import Plugin from "./Plugin";
import { flatMap, map, reduce, flatten } from "lodash";

/**
 * 
 * @param plugin 
 */
export async function getActions(plugin: Plugin): Promise<GeneratedImport[]> {
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
async function getAllImports(local: boolean, listings: ModuleLookupListing[], requireFn: (path: string) => any): Promise<GeneratedImport[]> {

    const imports: Promise<GeneratedImport[]>[] = flatMap(listings, async (moduleLookup: ModuleLookupListing) => {
        try {
            return moduleLookup.files.map((file: Uri) => createGeneratedImport(local, file, Object.keys(requireFn(file.fsPath)), moduleLookup.moduleName));
        } catch (e) {
            console.error("Probably failed to require the file because it uses es2015. Will attempt to parse it next.", e);
        }

        return extractImports(local, moduleLookup);
    });

    return flatten(await Promise.all(imports));
}

/**
 * 
 * @param localFileGlobs 
 * @param localSourceDir 
 */
async function generateLocalListings(localFileGlobs: string[], localSourceDir: string): Promise<ModuleLookupListing[]> {
    return Promise.all(localFileGlobs.map(async (glob: string) => {
        const files = await workspace.findFiles(`${localSourceDir}/${glob}`, "node_modules"); // TODO exclude multiple node modules from plugin.getNodeModulePaths
        return { moduleName: localSourceDir, files };
    }));
}

/**
 * 
 * @param configs 
 * @param nodeModulePaths 
 * @param fileGlobs 
 */
async function generateListings(configs: ModuleConfig[], nodeModulePaths: string[], fileGlobs: string[]): Promise<ModuleLookupListing[]> {
    const moduleNames: string[] = configs.map(config => config.name);
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
async function extractImports(local: boolean, moduleLookup: ModuleLookupListing): Promise<GeneratedImport[]> {

    // TODO Woo it works. So far, I can find local stuff and create imoprt statements, but I'm not
    // generating the right relativve file paths in the import staements yet.
    const imports: Promise<GeneratedImport[]> = Promise.all(moduleLookup.files.map(async (file: Uri) => {
        const textDocument = await workspace.openTextDocument(file);
        const module: Module = parser.parse(textDocument);
        const actions = module.getExports().map(getExportName);
        return createGeneratedImport(local, file, flatten(actions), moduleLookup.moduleName);
    }));

    return await imports;
}

/**
 * DTO for mapping files/modules to retain some context
 */
export type ModuleLookupListing = {
    moduleName: string,
    files: Uri[]
}

/**
 * Represents the type in the configuration for key "redux-action-finder.modules".
 */
export type ModuleConfig = {
    name: string,
    sourceType: SourceType
};

/**
 * 
 */
export type SourceType = "module" | "script";

