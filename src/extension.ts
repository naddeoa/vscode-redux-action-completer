import { ExtensionContext, workspace, commands } from 'vscode';
import parser from './parsing/Parser';
import Plugin from './Plugin';

let plugin: Plugin;

function init(context: ExtensionContext) {
    plugin && plugin.dispose();
    plugin = new Plugin();
    context.subscriptions.push(plugin.disposables);
}

export function activate(context: ExtensionContext) {
    commands.registerCommand("redux-action-finder.commands.refresh", () => init(context));
    init(context);
}

export function deactivate() {
    plugin.dispose();
    parser.dispose();
}
