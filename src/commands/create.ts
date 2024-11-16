import * as vscode from 'vscode'
import axios from 'axios'
import type { Snippet } from '../types'

export async function createCommand () {
  await vscode.commands.executeCommand('editor.action.clipboardCopyAction')

  const preferences = vscode.workspace.getConfiguration('masscodepp')
  const isNotify = preferences.get('notify')
  const apiUrl = preferences.get('apiUrl') as string

  const content = await vscode.env.clipboard.readText()
  content.trim()

  if (content.length <= 1) return

  const name = await vscode.window.showInputBox()
  const snippet: Partial<Snippet> = {
    name,
    content: [
      {
        label: 'Fragment 1',
        value: content,
        language: 'plain_text'
      }
    ]
  }

  try {
    await axios.post(`${apiUrl}/snippets/create`, snippet)
    if (isNotify) {
      vscode.window.showInformationMessage('Snippet successfully created')
    }
  } catch (err) {
    vscode.window.showErrorMessage('massCode app is not running.')
  }
}
