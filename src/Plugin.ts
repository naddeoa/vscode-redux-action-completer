import ActionCompleter from './ActionCompleter';
import { flatMap } from "lodash";
import { Import, createImport } from "./Import";
import {
    Uri,
    languages,
    Disposable,
    WorkspaceConfiguration,
    workspace
} from 'vscode';

export default class Plugin implements Disposable {

    private readonly nodePath: string[];
    private readonly config: WorkspaceConfiguration;
    public disposables: Disposable

    constructor(nodePath: string[]) {
        this.nodePath = nodePath;
        this.config = workspace.getConfiguration("actionfinder");
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
        process.env["NODE_PATH"] = this.nodePath;
        const module = require(path);
        process.env["NODE_PATH"] = previousPath;
        return module;
    }

    /**
     * Get all modules that should be searched for actions.
     */
    private getActionModules(): string[] {
        return this.config.get("modules", ["huddles-app"]);
    }

    /**
     * Find all actions in the modules of this project.
     */
    private async getActions(): Promise<Import[]> {
        const modules: ModuleLookupListing[] = await Promise.all(this.getActionModules().map(async (moduleName: string) => {
            const files = await workspace.findFiles(`node_modules/${moduleName}/**/*Actions.js`);
            return { moduleName, files }
        }));

        return flatMap(modules, (moduleLookup: ModuleLookupListing) => {
            return moduleLookup.files.map((file: Uri) => createImport(file, this.require(file.fsPath), moduleLookup.moduleName));
        });
    }

    dispose() {
        this.disposables.dispose();
    }
}



/**
 * DTO for mapping files/modules to retain some context
 */
interface ModuleLookupListing {
    moduleName: string,
    files: Uri[]
}