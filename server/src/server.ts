/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
  TextDocumentPositionParams,
  CompletionItem,
} from 'vscode-languageserver/node'

import { compile } from '@mdx-js/mdx'

import { TextDocument } from 'vscode-languageserver-textdocument'
import { isMDXParseError, parseMDXError } from './error'

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all)

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument)

let hasConfigurationCapability = false
let hasWorkspaceFolderCapability = false
let hasDiagnosticRelatedInformationCapability = false

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities

  // Does the client support the `workspace/configuration` request?
  // If not, we fall back using global settings.
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  )
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  )
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  )

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion.
      completionProvider: {
        resolveProvider: true,
      },
    },
  }
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    }
  }
  return result
})

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined
    )
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log('Workspace folder change event received.')
    })
  }
})

// The example settings
interface ExampleSettings {
  maxNumberOfProblems: number
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 }
let globalSettings: ExampleSettings = defaultSettings

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map()

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear()
  } else {
    globalSettings = <ExampleSettings>(
      (change.settings.languageServerExample || defaultSettings)
    )
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument)
})

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings)
  }
  let result = documentSettings.get(resource)
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'vscode-mdx-checker',
    })
    documentSettings.set(resource, result)
  }
  return result
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri)
})

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  validateTextDocument(change.document)
})

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  // In this simple example we get the settings for every validate run.
  const settings = await getDocumentSettings(textDocument.uri)

  // The validator creates diagnostics for all uppercase words length 2 and more
  const text = textDocument.getText()

  const diagnostics: Diagnostic[] = []
  try {
    await compile(text.replace(/{{< copyable\s+(.+)\s+>}}\r?\n/g, '\n'))
  } catch (e) {
    if (isMDXParseError(e)) {
      const position = parseMDXError(e)
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: position.start,
          end: position.end,
        },
        message: position.reason,
        source: e.source,
      }
      if (diagnostic.message.trimRight().endsWith('`</span>`')) {
        const startOffset = textDocument.offsetAt(diagnostic.range.start)
        try {
          const str = text.substring(
            startOffset,
            startOffset + diagnostic.range.end.character
          )
          if (/^<\s*br\s*>$/.test(str)) {
            diagnostic.message = diagnostic.message.replace('`</span>`', '<br>')
          }
        } catch (e) {
          console.log(e)
        }
      }
      diagnostics.push(diagnostic)
    }
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics })
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log('We received an file change event')
})

connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    return []
  }
)

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item
})

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection)

// Listen on the connection
connection.listen()
