import * as vscode from 'vscode'
import axios from 'axios'
import type { Snippet, SnippetContent } from '../types'

export class SnippetsProvider implements vscode.TreeDataProvider<Snippet | SnippetContent> {
  private _onDidChangeTreeData: vscode.EventEmitter<Snippet | SnippetContent | undefined | null | void> = new vscode.EventEmitter<Snippet | SnippetContent | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<Snippet | SnippetContent | undefined | null | void> = this._onDidChangeTreeData.event

  // Add private dictionary to track opened fragments
  private openedFragments = new Map<string, { snippetId: string; fragmentName: string }>()

  refresh (): void {
    this._onDidChangeTreeData.fire()
  }

  getTreeItem (element: Snippet | SnippetContent): vscode.TreeItem {
    if ('content' in element) {
      // This is a Snippet - no command, just expandable
      return {
        label: element.name || 'Untitled Snippet',
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        tooltip: `${element.folder?.name || 'Inbox'}`,
        description: element.folder?.name || 'Inbox'
      }
    } else {
      // This is a SnippetContent - pass both fragment and parent snippet id
      return {
        label: element.label || 'Untitled Fragment',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        tooltip: element.language,
        description: element.language,
        command: {
          command: 'masscodepp.openFragment',
          title: 'Open Fragment',
          arguments: [element, (element as any).parentSnippetId] // Pass parent snippet id
        }
      }
    }
  }

  async getChildren (element?: Snippet | SnippetContent): Promise<(Snippet | SnippetContent)[]> {
    if (!element) {
      // Root level - fetch all snippets
      try {
        const preferences = vscode.workspace.getConfiguration('masscodepp')
        const apiUrl = preferences.get('apiUrl') as string
        const { data } = await axios.get<Snippet[]>(`${apiUrl}/snippets/embed-folder`)
        return data
          .filter(snippet => !snippet.isDeleted)
          .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
      } catch (err) {
        vscode.window.showErrorMessage(String(err))
        return []
      }
    } else if ('content' in element) {
      // Snippet level - add parent snippet id to each fragment
      return element.content.map(fragment => ({
        ...fragment,
        parentSnippetId: element.id // Add parent snippet id to each fragment
      }))
    }
    return []
  }

  async openFragment (fragment: SnippetContent, parentSnippetId: string): Promise<void> {
    // Check if fragment is already open by looking through tracked documents
    for (const [uri, info] of this.openedFragments.entries()) {
      if (info.snippetId === parentSnippetId && info.fragmentName === fragment.label) {
        // Fragment is already open, find and show the document
        const docs = vscode.workspace.textDocuments
        const existingDoc = docs.find(doc => doc.uri.toString() === uri)
        if (existingDoc) {
          await vscode.window.showTextDocument(existingDoc)
          return
        }
      }
    }

    // If we get here, fragment isn't open, so create new document
    const document = await vscode.workspace.openTextDocument({
      content: fragment.value,
      language: fragment.language
    })

    await vscode.window.showTextDocument(document)

    this.openedFragments.set(document.uri.toString(), {
      snippetId: parentSnippetId,
      fragmentName: fragment.label
    })
  }

  // Add method to handle tab closure
  private handleDocumentClose (document: vscode.TextDocument) {
    this.openedFragments.delete(document.uri.toString())
  }

  // Helper method to get snippet info for a document
  getFragmentInfo (documentUri: string) {
    return this.openedFragments.get(documentUri)
  }

  // Helper method to get metadata from any document
  static getSnippetMetadata (document: vscode.TextDocument) {
    return (document as any)._masscodeMetadata
  }

  registerCommands (context: vscode.ExtensionContext) {
    context.subscriptions.push(
      vscode.commands.registerCommand('masscodepp.openFragment', this.openFragment.bind(this)),
      // Add refresh command
      vscode.commands.registerCommand('masscodepp.refreshSnippets', () => {
        this.refresh()
      })
    )

    context.subscriptions.push(
      vscode.workspace.onDidCloseTextDocument(this.handleDocumentClose.bind(this))
    )
  }
}
