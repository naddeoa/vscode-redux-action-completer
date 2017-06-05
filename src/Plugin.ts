import ActionCompleter from './ActionCompleter';
import { flatMap, map, reduce, flatten } from "lodash";
import { Uri, languages, Disposable, WorkspaceConfiguration, workspace } from 'vscode';
import { crossProduct3, Triple, CrossProduct3 } from "./util/cross-product";
import parser, { ParsedModule, ParsedExport, getExportName } from "./parsing/Parser";
import * as actions from "./actions"; // TODO circular dependency
import * as fs from "fs";

export default class Plugin implements Disposable {

    private readonly config: WorkspaceConfiguration;
    public disposables: Disposable

    constructor() {
        this.config = workspace.getConfiguration();
        this.require = this.require.bind(this);
        this.setup();
    }

    private async setup() {
        const allActions = await actions.getActions(this);
        const completionDisposable = languages.registerCompletionItemProvider(["javascript"], new ActionCompleter(allActions), ".");
        this.disposables = Disposable.from(completionDisposable);
    }

    /**
     * Execute require with this plugin's node path.
     * @param path The path to require on.
     */
    require(path: string) {
        const previousPath = process.env["NODE_PATH"];
        process.env["NODE_PATH"] = this.getNodeModulePaths().join(":");
        delete require.cache[path];
        const module = require(path);
        process.env["NODE_PATH"] = previousPath;
        return module;
    }

    /**
     * Get all modules that should be searched for actions.
     */
    getActionModules(): string[] {
        return this.config.get("redux-action-finder.modules", []);
    }

    /**
     * Get all file globs that should be used when searching modules
     * for files that contain actions;
     */
    getFileGlobs(): string[] {
        return this.config.get("redux-aciton-finder.fileGlobs", []);
    }

    /**
     * Get all node paths that should be searched for modules.
     */
    getNodeModulePaths(): string[] {
        return this.config.get("redux-aciton-finder.nodeModulePaths", ["node_modules"]);
    }

    getLocalFileGlobs(): string[] {
        return this.config.get("redux-aciton-finder.localFileGlobs", [])
    }

    getLocalSourceDir(): string {
        return this.config.get("redux-aciton-finder.localSourceDir", "src");
    }

    dispose() {
        this.disposables.dispose();
    }
}
