import * as vscode from 'vscode'
import { searchCommand } from './commands/search'
import { createCommand } from './commands/create'
import { SnippetsProvider } from './providers/SnippetsProvider'

export function activate (context: vscode.ExtensionContext) {
  const search = vscode.commands.registerCommand('masscodepp.search', () =>
    searchCommand(context)
  )

  const create = vscode.commands.registerCommand(
    'masscodepp.simple-create',
    createCommand
  )

  // Register Tree View
  const snippetsProvider = new SnippetsProvider()
  vscode.window.registerTreeDataProvider(
    'masscodepp-snippets',
    snippetsProvider
  )

  // Register the commands
  snippetsProvider.registerCommands(context)

  context.subscriptions.push(search, create)
}

export function deactivate () {}
