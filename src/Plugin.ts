import ActionCompleter from './ActionCompleter';
import * as _ from "lodash/fp";
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

    constructor(nodePath) {
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
        const files = await Promise.all(this.getActionModules().map((module: string) => workspace.findFiles(`node_modules/${module}/**/*Actions.js`)));

        return _.flow(
            _.flatten,
            _.map((file: Uri) => createImport(file, this.require(file.fsPath)))
        )(files);
    }

    dispose() {
        this.disposables.dispose();
    }
}

