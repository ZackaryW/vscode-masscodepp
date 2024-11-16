import * as vscode from 'vscode'
import axios from 'axios'
import type { Snippet } from '../types'

export async function searchCommand (context: vscode.ExtensionContext) {
  const preferences = vscode.workspace.getConfiguration('masscodepp')
  const apiUrl = preferences.get('apiUrl') as string

  try {
    const { data } = await axios.get<Snippet[]>(
      `${apiUrl}/snippets/embed-folder`
    )
    const lastSelectedId = context.globalState.get('masscode:last-selected') as string
    const options = buildQuickPickOptions(data, lastSelectedId)
    const result = await showQuickPick(options, data)

    if (result.fragmentContent.length) {
      await pasteContent(result.fragmentContent, context, result.snippet?.id)
    }
  } catch (err) {
    vscode.window.showErrorMessage('massCode app is not running.')
  }
}

function buildQuickPickOptions (data: Snippet[], lastSelectedId: string) {
  const options = data
    .filter(i => !i.isDeleted)
    .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    .reduce((acc: vscode.QuickPickItem[], snippet) => {
      const fragments = snippet.content.map(fragment => ({
        label: snippet.name || 'Untitled snippet',
        detail: snippet.content.length > 1 ? fragment.label : '',
        description: `${fragment.language} • ${
          snippet.folder?.name || 'Inbox'
        }`,
        picked: lastSelectedId === snippet.id
      }))
      return [...acc, ...fragments]
    }, [])

  const isExist = options.find(i => i.picked)
  if (isExist) {
    options.sort(i => (i.picked ? -1 : 1))
    options.unshift({ label: 'Last selected', kind: -1 })
  }

  return options
}

async function showQuickPick (options: vscode.QuickPickItem[], data: Snippet[]) {
  let snippet: Snippet | undefined
  let fragmentContent = ''

  const picked = await vscode.window.showQuickPick(options, {
    placeHolder: 'Type to search...',
    onDidSelectItem (item: vscode.QuickPickItem) {
      snippet = data.find(i => i.name === item.label)
      if (snippet) {
        fragmentContent = getFragmentContent(snippet, item.detail)
      } else {
        fragmentContent = ''
      }
    }
  })

  return picked
    ? { snippet, fragmentContent }
    : { snippet: undefined, fragmentContent: '' }
}

function getFragmentContent (snippet: Snippet, detail: string | undefined) {
  if (snippet.content.length === 1) {
    return snippet.content[0].value
  }
  return snippet.content.find(i => i.label === detail)?.value || ''
}

async function pasteContent (
  content: string,
  context: vscode.ExtensionContext,
  snippetId?: string
) {
  await vscode.env.clipboard.writeText(content)
  await vscode.commands.executeCommand('editor.action.clipboardPasteAction')
  await context.globalState.update('masscode:last-selected', snippetId)
}
