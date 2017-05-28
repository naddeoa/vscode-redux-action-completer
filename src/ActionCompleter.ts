import { Import, createImport } from "./Import";
import * as _ from "lodash/fp";
import { addImportToDocument } from "./DocumentUtils";
import {
    TextDocument,
    CompletionItemProvider,
    Position,
    CancellationToken,
    CompletionItemKind,
    ProviderResult,
    TextEdit,
    CompletionItem,
    CompletionList
} from 'vscode';

export default class ActionCompleter implements CompletionItemProvider {

    private readonly imports: Import[];

    constructor(imports) {
        this.imports = imports;
    }

    provideCompletionItems(textDocument: TextDocument, position: Position, token: CancellationToken): ProviderResult<CompletionItem[] | CompletionList> {
        if (textDocument.lineAt(position.line).text.search("dispatch") !== -1) {
            return _.flatMap((imp: Import) => imp.actions.map((action: string) => {

                const item = new CompletionItem(action, CompletionItemKind.Function)
                item.detail = imp.fileName;
                item.additionalTextEdits = [addImportToDocument(textDocument, imp.importName, action)];
                item.filterText = `__${imp.fileName}`;
                item.documentation = "Redux action for Huddles";
                return item;
            }))(this.imports);
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