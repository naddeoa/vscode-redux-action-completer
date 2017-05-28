import {
    ExtensionContext,
    workspace
} from 'vscode';
import Plugin from './Plugin';

let plugin: Plugin;

export function activate(context: ExtensionContext) {
    plugin = new Plugin([`${workspace.asRelativePath}/node_modules`]);
    context.subscriptions.push(plugin.disposables);
}

export function deactivate() {
    plugin.dispose();
}
