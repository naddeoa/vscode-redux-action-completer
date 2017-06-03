import { GeneratedImport, createGeneratedImport } from "./GeneratedImport";
import { flatMap } from "lodash";
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

    private readonly imports: GeneratedImport[];

    constructor(imports: GeneratedImport[]) {
        this.imports = imports;
    }

    provideCompletionItems(textDocument: TextDocument, position: Position, token: CancellationToken): ProviderResult<CompletionItem[] | CompletionList> {
        if (textDocument.lineAt(position.line).text.search("dispatch") !== -1) {
            return flatMap(this.imports, (generatedImport: GeneratedImport) => generatedImport.actions.map((action: string) => {

                const item = new CompletionItem(action, CompletionItemKind.Function)
                item.detail = generatedImport.fileName;
                item.additionalTextEdits = [addImportToDocument(textDocument, generatedImport.getImportName(textDocument), action)];
                item.filterText = `__${generatedImport.fileName}`;
                item.documentation = `Redux action declared in ${generatedImport.moduleName}`;
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