// Adapted from vscode's configuration editing completion tests
// https://github.com/microsoft/vscode/blob/9ed20df09361f583516ca4ebe54ad2a5aca083ac/extensions/configuration-editing/src/test/completion.test.ts

import * as vscode from 'vscode';
import * as assert from 'assert';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import 'mocha';

const testFolder = fs.mkdtemp(path.join(os.tmpdir(), 'role-completions-'));


suite('Role tests', () => {
    const testFile = 'iam.yaml';

    test('No characters', async () => {
        {
            const content = [
                'role: roles/|'
            ].join('\n');
            const resultText = [
                'role: roles/bigquery.admin'
            ].join('\n');
            const expected = { label: 'bigquery.admin', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Nonconsecutive characters', async () => {
        {
            const content = [
                'role: roles/bq|'
            ].join('\n');
            const resultText = [
                'role: roles/bigquery.admin'
            ].join('\n');
            const expected = { label: 'bigquery.admin', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Space prevent completion', async () => {
        {
            const content = [
                'role: roles/ |'
            ].join('\n');
            const expected = { label: 'bigquery.admin', notAvailable: true };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Special character prevent completion', async () => {
        {
            const content = [
                'role: roles/$|'
            ].join('\n');
            const expected = { label: 'bigquery.admin', notAvailable: true };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
});

suite('Role namespace tests', () => {
    const testFile = 'iam.yaml';

    test('No quotes', async () => {
        {
            const content = [
                'role: |'
            ].join('\n');
            const resultText = [
                'role: roles/'
            ].join('\n');
            const expected = { label: 'roles', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Open single', async () => {
        {
            const content = [
                "role: '|"
            ].join('\n');
            const resultText = [
                "role: 'roles/"
            ].join('\n');
            const expected = { label: 'roles', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Closed single', async () => {
        {
            const content = [
                "role: '|'"
            ].join('\n');
            const resultText = [
                "role: 'roles/'"
            ].join('\n');
            const expected = { label: 'roles', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Open double', async () => {
        {
            const content = [
                'role: "|'
            ].join('\n');
            const resultText = [
                'role: "roles/'
            ].join('\n');
            const expected = { label: 'roles', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Closed double', async () => {
        {
            const content = [
                'role: "|"'
            ].join('\n');
            const resultText = [
                'role: "roles/"'
            ].join('\n');
            const expected = { label: 'roles', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('Partial', async () => {
        {
            const content = [
                'role: ro|'
            ].join('\n');
            const resultText = [
                'role: roles/'
            ].join('\n');
            const expected = { label: 'roles', resultText };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
    test('No match', async () => {
        {
            const content = [
                'role: z|'
            ].join('\n');
            const expected = { label: 'roles', notAvailable: true };
            await testCompletion(testFile, 'yaml', content, expected);
        }
    });
});

interface ItemDescription {
	label: string;
	resultText?: string;
	notAvailable?: boolean;
}

async function testCompletion(testFileName: string, languageId: string, content: string, expected: ItemDescription) {

	const offset = content.indexOf('|');
	content = content.substring(0, offset) + content.substring(offset + 1);

	const docUri = vscode.Uri.file(path.join(await testFolder, testFileName));
	await fs.writeFile(docUri.fsPath, content);

	const editor = await setTestContent(docUri, languageId, content);
	const position = editor.document.positionAt(offset);

	// Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
	const actualCompletions = (await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', docUri, position)) as vscode.CompletionList;

	const matches = actualCompletions.items.filter(completion => {
		return completion.label === expected.label;
	});
	if (expected.notAvailable) {
		assert.strictEqual(matches.length, 0, `${expected.label} should not exist in results`);
	} else {
		assert.strictEqual(matches.length, 1, `${expected.label} should exist exactly once: Actual: ${actualCompletions.items.map(c => c.label).join(', ')}`);

		if (expected.resultText) {
			const match = matches[0];
			if (match.range && match.insertText) {
				const range = match.range instanceof vscode.Range ? match.range : match.range.replacing;
				const text = typeof match.insertText === 'string' ? match.insertText : match.insertText.value;

				await editor.edit(eb => eb.replace(range, text));
				assert.strictEqual(editor.document.getText(), expected.resultText);
			} else {
				assert.fail(`Range or insertText missing`);
			}
		}
	}
}

async function setTestContent(docUri: vscode.Uri, languageId: string, content: string): Promise<vscode.TextEditor> {
	const doc = await vscode.workspace.openTextDocument(docUri);
	await vscode.languages.setTextDocumentLanguage(doc, languageId);
	const editor = await vscode.window.showTextDocument(doc);

	const fullRange = new vscode.Range(new vscode.Position(0, 0), doc.positionAt(doc.getText().length));
	await editor.edit(eb => eb.replace(fullRange, content));
	return editor;
}