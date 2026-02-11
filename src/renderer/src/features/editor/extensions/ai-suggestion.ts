import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { Extension } from '@tiptap/react'
import type { CommandProps } from '@tiptap/react'

export interface AISuggestionState {
  active: boolean
  anchorPos: number
  text: string
  completed: boolean
}

const aiSuggestionPluginKey = new PluginKey<AISuggestionState>('aiSuggestion')

export const AISuggestion = Extension.create({
  name: 'aiSuggestion',

  addStorage() {
    return {
      active: false,
      anchorPos: 0,
      text: '',
      completed: false
    }
  },

  addCommands() {
    return {
      startAISuggestion:
        (pos: number) =>
        ({ tr, dispatch }: CommandProps) => {
          if (dispatch) {
            tr.setMeta(aiSuggestionPluginKey, {
              action: 'start',
              pos
            })
            dispatch(tr)
          }
          return true
        },

      appendAISuggestion:
        (text: string) =>
        ({ tr, dispatch }: CommandProps) => {
          if (dispatch) {
            tr.setMeta(aiSuggestionPluginKey, {
              action: 'append',
              text
            })
            dispatch(tr)
          }
          return true
        },

      setAISuggestion:
        (text: string) =>
        ({ tr, dispatch }: CommandProps) => {
          if (dispatch) {
            tr.setMeta(aiSuggestionPluginKey, {
              action: 'set',
              text
            })
            dispatch(tr)
          }
          return true
        },

      completeAISuggestion:
        () =>
        ({ tr, dispatch }: CommandProps) => {
          if (dispatch) {
            tr.setMeta(aiSuggestionPluginKey, {
              action: 'complete'
            })
            dispatch(tr)
          }
          return true
        },

      acceptAISuggestion:
        () =>
        ({ tr, dispatch, state }: CommandProps) => {
          const pluginState = aiSuggestionPluginKey.getState(state)
          if (!pluginState?.active || !pluginState.text) return false

          if (dispatch) {
            tr.insertText(pluginState.text, pluginState.anchorPos)
            tr.setMeta(aiSuggestionPluginKey, { action: 'clear' })
            dispatch(tr)
          }
          return true
        },

      acceptAISuggestionPartial:
        () =>
        ({ tr, dispatch, state }: CommandProps) => {
          const pluginState = aiSuggestionPluginKey.getState(state)
          if (!pluginState?.active || !pluginState.text) return false

          const text = pluginState.text
          const sentenceEnd = text.search(/[。！？.!?\n]/)
          if (sentenceEnd === -1) {
            if (dispatch) {
              tr.insertText(text, pluginState.anchorPos)
              tr.setMeta(aiSuggestionPluginKey, { action: 'clear' })
              dispatch(tr)
            }
          } else {
            const acceptText = text.slice(0, sentenceEnd + 1)
            const remaining = text.slice(sentenceEnd + 1)
            if (dispatch) {
              tr.insertText(acceptText, pluginState.anchorPos)
              tr.setMeta(aiSuggestionPluginKey, {
                action: 'partial_accept',
                newAnchor: pluginState.anchorPos + acceptText.length,
                remaining
              })
              dispatch(tr)
            }
          }
          return true
        },

      rejectAISuggestion:
        () =>
        ({ tr, dispatch }: CommandProps) => {
          if (dispatch) {
            tr.setMeta(aiSuggestionPluginKey, { action: 'clear' })
            dispatch(tr)
          }
          return true
        }
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        const pluginState = aiSuggestionPluginKey.getState(editor.state)
        if (pluginState?.active && pluginState.text) {
          editor.commands.acceptAISuggestion()
          return true
        }
        return false
      },
      Escape: ({ editor }) => {
        const pluginState = aiSuggestionPluginKey.getState(editor.state)
        if (pluginState?.active) {
          editor.commands.rejectAISuggestion()
          return true
        }
        return false
      },
      'Ctrl-ArrowRight': ({ editor }) => {
        const pluginState = aiSuggestionPluginKey.getState(editor.state)
        if (pluginState?.active && pluginState.text) {
          editor.commands.acceptAISuggestionPartial()
          return true
        }
        return false
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin<AISuggestionState>({
        key: aiSuggestionPluginKey,
        state: {
          init(): AISuggestionState {
            return { active: false, anchorPos: 0, text: '', completed: false }
          },
          apply(tr, prev): AISuggestionState {
            const meta = tr.getMeta(aiSuggestionPluginKey)
            if (!meta) {
              // If document changed from user input (not our insert), clear suggestion
              if (tr.docChanged && prev.active) {
                const isSuggestionInsert = tr.getMeta('aiSuggestionInsert')
                if (!isSuggestionInsert) {
                  return { active: false, anchorPos: 0, text: '', completed: false }
                }
              }
              return prev
            }

            switch (meta.action) {
              case 'start':
                return { active: true, anchorPos: meta.pos, text: '', completed: false }
              case 'append':
                return { ...prev, text: prev.text + meta.text }
              case 'set':
                return { ...prev, text: meta.text }
              case 'complete':
                return { ...prev, completed: true }
              case 'clear':
                return { active: false, anchorPos: 0, text: '', completed: false }
              case 'partial_accept':
                return { ...prev, anchorPos: meta.newAnchor, text: meta.remaining }
              default:
                return prev
            }
          }
        },
        props: {
          decorations(state) {
            const pluginState = aiSuggestionPluginKey.getState(state)
            if (!pluginState?.active || !pluginState.text) return DecorationSet.empty

            const widget = document.createElement('span')
            widget.className = pluginState.completed
              ? 'ai-suggestion'
              : 'ai-suggestion ai-suggestion-streaming'
            widget.textContent = pluginState.text

            if (!pluginState.completed) {
              const cursor = document.createElement('span')
              cursor.className = 'ai-suggestion-cursor'
              widget.appendChild(cursor)
            }

            return DecorationSet.create(state.doc, [
              Decoration.widget(pluginState.anchorPos, widget, {
                side: 1,
                key: 'ai-suggestion'
              })
            ])
          },
          handleKeyDown(_view, event) {
            // Let Tab, Escape, Ctrl+Right be handled by keyboard shortcuts above
            // For other keys while suggestion is active, the state.apply handles clearing
            // We need to handle character input specifically
            const state = _view.state
            const pluginState = aiSuggestionPluginKey.getState(state)
            if (pluginState?.active && event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
              // Normal character input — let it clear the suggestion via docChanged
              return false
            }
            return false
          }
        }
      })
    ]
  }
})

export { aiSuggestionPluginKey }

// Type augmentation for editor commands
declare module '@tiptap/react' {
  interface Commands<ReturnType> {
    aiSuggestion: {
      startAISuggestion: (pos: number) => ReturnType
      appendAISuggestion: (text: string) => ReturnType
      setAISuggestion: (text: string) => ReturnType
      completeAISuggestion: () => ReturnType
      acceptAISuggestion: () => ReturnType
      acceptAISuggestionPartial: () => ReturnType
      rejectAISuggestion: () => ReturnType
    }
  }
}
