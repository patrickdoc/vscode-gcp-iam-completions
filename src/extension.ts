// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as vscode from 'vscode';
import { iam_v1 } from 'googleapis';

import * as gcpRoles from './google/data/roles.json';

const getRoleDetail = (role: iam_v1.Schema$Role): string | undefined => {
    if (role.title && role.stage && role.stage !== 'GA') {
        return `${role.title} (${role.stage})`;
    }
    return role.title ?? undefined;
};

const getCompletions = (range: vscode.Range): vscode.CompletionItem[] => {
    const result: vscode.CompletionItem[] = [];

    gcpRoles.forEach((role: iam_v1.Schema$Role) => {
        if (role.name) {
            const item: vscode.CompletionItem = new vscode.CompletionItem(role.name.slice(role.name.lastIndexOf('/') + 1));
            item.detail = getRoleDetail(role);
            item.documentation = role.description ?? undefined;
            item.kind = vscode.CompletionItemKind.Value;
            item.range = {
                inserting: new vscode.Range(range.start, range.start),
                replacing: range
            };
            result.push(item);
        }
    });
    return result;
};

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    const disposable = vscode.languages.registerCompletionItemProvider(
        '*',
        {
            provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, _token: vscode.CancellationToken, _context: vscode.CompletionContext) {

                // Role ID naming rules: https://cloud.google.com/iam/docs/roles-overview#custom-role-creation
                const roleIdRegex = /^.*roles\/[a-zA-Z_\.]*$/;

                const linePrefix = document.lineAt(position).text.slice(0,position.character+1);

                // Completions for available roles
                if (roleIdRegex.test(linePrefix)) {
                    const range = document.getWordRangeAtPosition(position, /[a-zA-Z_\.]+/) || new vscode.Range(position, position);
                    return getCompletions(range);
                }

                const range = document.getWordRangeAtPosition(position, /[a-z]+/) || new vscode.Range(position, position);
                const currentWord = range ? document.getText(range) : '';

                // "Namespace" completions for roles: predefined roles, custom organization roles, and custom project roles
                if ("roles".startsWith(currentWord)) {
                    const item = new vscode.CompletionItem("roles");
                    item.detail = "Predefined GCP IAM roles";
                    item.documentation = new vscode.MarkdownString("[Predefined role documentation](https://cloud.google.com/iam/docs/understanding-roles)");
                    item.kind = vscode.CompletionItemKind.Module;
                    item.insertText = "roles/";
                    item.command = { command: 'editor.action.triggerSuggest', title: 'Re-trigger completions...' };
                    item.range = {
                        inserting: new vscode.Range(range.start, range.start),
                        replacing: range
                    };

                    return [
                        item,
                    ];
                }


                return undefined;
            }
        },
        '/'
    );

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
