import * as vscode from 'vscode'
import axios from 'axios'
import type { Snippet } from './types'

export class MasscodeAPI {
  private static getApiUrl (): string {
    const preferences = vscode.workspace.getConfiguration('masscodepp')
    return preferences.get('apiUrl') as string
  }

  static async getAllSnippets (): Promise<Snippet[]> {
    try {
      const { data } = await axios.get<Snippet[]>(`${this.getApiUrl()}/snippets/embed-folder`)
      return data
        .filter(snippet => !snippet.isDeleted)
        .sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1))
    } catch (err) {
      vscode.window.showErrorMessage(String(err))
      return []
    }
  }

  static async updateFragmentContent (fragmentId: string, content: string): Promise<void> {
    try {
      await axios.patch(`${this.getApiUrl()}/snippets/fragment/${fragmentId}`, {
        value: content
      })
    } catch (err) {
      throw new Error(`Failed to update fragment: ${err}`)
    }
  }
}
