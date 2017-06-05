import { ActionSource, createGeneratedImport } from "./ActionSource";
import { flatMap } from "lodash";
import { addImportToDocument } from "./DocumentUtils";
import {
    TextDocument,
    CompletionItemProvider,
    Position,
    CancellationToken,
    CompletionItemKind,
    ProviderResult,
    CompletionItem,
    CompletionList
} from 'vscode';

export default class ActionCompleter implements CompletionItemProvider {

    private readonly imports: ActionSource[];

    constructor(imports: ActionSource[]) {
        this.imports = imports;
    }

    provideCompletionItems(textDocument: TextDocument, position: Position, token: CancellationToken): ProviderResult<CompletionItem[] | CompletionList> {
        if (textDocument.lineAt(position.line).text.search("dispatch") !== -1) {
            return flatMap(this.imports, (actionSource: ActionSource) => actionSource.actions.map((action: string) => {

                const item = new CompletionItem(action, CompletionItemKind.Function)
                item.detail = actionSource.fileName;
                item.additionalTextEdits = [addImportToDocument(textDocument, actionSource.getImportName(textDocument), action)];
                item.filterText = `__${actionSource.fileName}`;
                item.documentation = `Redux action declared in ${actionSource.moduleName}`;
                return item;
            }));
        }

        return [];
    }

    resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
        if (item.label.search("dispatch") !== -1) {
            const item = new CompletionItem("init-chat-view", CompletionItemKind.Function);
            item.detail = "Hello there";
            return item;
        }

        return null;
    }

}