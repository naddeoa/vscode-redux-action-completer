import ActionCompleter from './ActionCompleter';
import { flatMap, map, reduce, flatten } from "lodash";
import { Import, createImport } from "./Import";
import { Uri, languages, Disposable, WorkspaceConfiguration, workspace } from 'vscode';
import { crossProduct3, Triple, CrossProduct3 } from "./util/cross-product";


export default class Plugin implements Disposable {

    private readonly config: WorkspaceConfiguration;
    public disposables: Disposable

    constructor() {
        this.config = workspace.getConfiguration();
        this.setup();
    }

    private async setup() {
        const actions = await this.getActions();
        const completionDisposable = languages.registerCompletionItemProvider(["javascript"], new ActionCompleter(actions), ".");
        this.disposables = Disposable.from(completionDisposable);
    }

    /**
     * Execute require with this plugin's node path.
     * @param path The path to require on.
     */
    private require(path: string) {
        const previousPath = process.env["NODE_PATH"];
        process.env["NODE_PATH"] = this.getNodeModulePaths();
        const module = require(path);
        process.env["NODE_PATH"] = previousPath;
        return module;
    }

    /**
     * Get all modules that should be searched for actions.
     */
    private getActionModules(): string[] {
        return this.config.get("redux-action-finder.modules", []);
    }

    /**
     * Get all file globs that should be used when searching modules
     * for files that contain actions;
     */
    private getFileGlobs(): string[] {
        return this.config.get("redux-aciton-finder.fileGlobs", []);
    }

    /**
     * Get all node paths that should be searched for modules.
     */
    private getNodeModulePaths(): string[] {
        return this.config.get("redux-aciton-finder.nodeModulePaths", ["node_modules"]);
    }

    /**
     * Find all actions in the modules of this project.
     */
    private async getActions(): Promise<Import[]> {
        const targetPaths: CrossProduct3 = crossProduct3(this.getNodeModulePaths(), this.getActionModules(), this.getFileGlobs());

        let modules: ModuleLookupListing[];
        switch (targetPaths.type) {
            case "Success":
                modules = await Promise.all(targetPaths.result.map(async ([modulePath, moduleName, fileGlob]: Triple) => {
                    const files = await workspace.findFiles(`${modulePath}/${moduleName}/${fileGlob}`);
                    return { moduleName, files }
                }));

                return flatMap(modules, (moduleLookup: ModuleLookupListing) => {
                    return moduleLookup.files.map((file: Uri) => createImport(file, this.require(file.fsPath), moduleLookup.moduleName));
                });

            case "Failure":
                modules = [];
                return Promise.resolve([]);

        }
    }

    dispose() {
        this.disposables.dispose();
    }
}



/**
 * DTO for mapping files/modules to retain some context
 */
type ModuleLookupListing = {
    moduleName: string,
    files: Uri[]
}