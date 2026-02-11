import { useEffect, useCallback, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Underline from '@tiptap/extension-underline'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Quote,
  Minus,
  Pen
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'
import { useInlineAIStore } from '../../stores/inline-ai-store'
import { AISuggestion } from './extensions/ai-suggestion'
import { InlineSuggestionToolbar } from './InlineSuggestionToolbar'
import { GenerationControlsPopover } from './GenerationControlsPopover'

export function NovelEditor(): React.ReactElement {
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const currentProject = useProjectStore((s) => s.currentProject)
  const updateChapter = useProjectStore((s) => s.updateChapter)
  const inlineStatus = useInlineAIStore((s) => s.status)
  const inlineText = useInlineAIStore((s) => s.currentText)
  const inlineIsStreaming = useInlineAIStore((s) => s.isStreaming)
  const startContinuation = useInlineAIStore((s) => s.startContinuation)
  const cancelContinuation = useInlineAIStore((s) => s.cancelContinuation)
  const inlineReset = useInlineAIStore((s) => s.reset)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chapterIdRef = useRef<number | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder: '开始书写你的故事...'
      }),
      CharacterCount,
      Underline,
      AISuggestion
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'tiptap'
      }
    },
    onUpdate: ({ editor: ed }) => {
      // Debounced auto-save
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }

      saveTimerRef.current = setTimeout(() => {
        const id = chapterIdRef.current
        if (!id) return

        const content = JSON.stringify(ed.getJSON())
        // Count characters for Chinese text: use the text content length
        const text = ed.state.doc.textContent
        const wordCount = text.length

        updateChapter({ id, content, wordCount })
      }, 3000)
    }
  })

  // Update editor content when chapter changes
  useEffect(() => {
    if (!editor || !currentChapter) return

    // Avoid re-setting content if it's the same chapter
    if (chapterIdRef.current === currentChapter.id) return

    chapterIdRef.current = currentChapter.id

    // Clear any pending save timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
      saveTimerRef.current = null
    }

    // Try parsing as JSON (Tiptap document), fallback to text
    try {
      if (currentChapter.content) {
        const parsed = JSON.parse(currentChapter.content)
        editor.commands.setContent(parsed)
      } else {
        editor.commands.setContent('')
      }
    } catch {
      // If not valid JSON, set as HTML or plain text
      editor.commands.setContent(currentChapter.content || '')
    }
  }, [editor, currentChapter])

  // Cleanup save timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  const toggleBold = useCallback(() => {
    editor?.chain().focus().toggleBold().run()
  }, [editor])

  const toggleItalic = useCallback(() => {
    editor?.chain().focus().toggleItalic().run()
  }, [editor])

  const toggleUnderline = useCallback(() => {
    editor?.chain().focus().toggleUnderline().run()
  }, [editor])

  const toggleH1 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 1 }).run()
  }, [editor])

  const toggleH2 = useCallback(() => {
    editor?.chain().focus().toggleHeading({ level: 2 }).run()
  }, [editor])

  const toggleBlockquote = useCallback(() => {
    editor?.chain().focus().toggleBlockquote().run()
  }, [editor])

  const insertHR = useCallback(() => {
    editor?.chain().focus().setHorizontalRule().run()
  }, [editor])

  // Trigger inline continuation
  const triggerInlineContinuation = useCallback(() => {
    if (!editor || inlineIsStreaming) return

    const { from } = editor.state.selection
    const textBeforeCursor = editor.state.doc.textBetween(0, from, '\n')
    if (!textBeforeCursor.trim()) return

    editor.commands.startAISuggestion(from)

    startContinuation({
      textBeforeCursor,
      cursorPos: from,
      chapterContent: currentChapter?.content,
      projectId: currentProject?.id,
      chapterId: currentChapter?.id
    })
  }, [editor, inlineIsStreaming, startContinuation, currentChapter, currentProject])

  // Sync inline store text to editor suggestion decoration
  const prevInlineTextRef = useRef('')
  useEffect(() => {
    if (!editor) return

    if (inlineStatus === 'idle') {
      prevInlineTextRef.current = ''
      return
    }

    if (inlineText !== prevInlineTextRef.current) {
      if (inlineIsStreaming) {
        editor.commands.setAISuggestion(inlineText)
      } else {
        editor.commands.setAISuggestion(inlineText)
        if (inlineStatus === 'completed') {
          editor.commands.completeAISuggestion()
        }
      }
      prevInlineTextRef.current = inlineText
    }
  }, [editor, inlineText, inlineIsStreaming, inlineStatus])

  // Clean up inline state on chapter switch
  useEffect(() => {
    return () => {
      inlineReset()
    }
  }, [currentChapter?.id, inlineReset])

  // Handle accept/reject from toolbar
  const handleAcceptSuggestion = useCallback(() => {
    if (!editor) return
    editor.commands.acceptAISuggestion()
    useInlineAIStore.getState().acceptSuggestion()
  }, [editor])

  const handleRejectSuggestion = useCallback(() => {
    if (!editor) return
    editor.commands.rejectAISuggestion()
    useInlineAIStore.getState().rejectSuggestion()
  }, [editor])

  const handleRegenerate = useCallback(() => {
    if (!editor) return
    const { from } = editor.state.selection
    const textBeforeCursor = editor.state.doc.textBetween(0, from, '\n')

    editor.commands.rejectAISuggestion()

    const store = useInlineAIStore.getState()
    editor.commands.startAISuggestion(from)

    store.regenerate({
      textBeforeCursor,
      cursorPos: from,
      chapterContent: currentChapter?.content,
      projectId: currentProject?.id,
      chapterId: currentChapter?.id
    })
  }, [editor, currentChapter, currentProject])

  // Ctrl+J shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.ctrlKey && e.key === 'j') {
        e.preventDefault()
        triggerInlineContinuation()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [triggerInlineContinuation])

  if (!editor) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">加载编辑器...</div>
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 border-b px-4 py-1.5 shrink-0 bg-background">
        <Button
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={toggleBold}
          title="粗体"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={toggleItalic}
          title="斜体"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={toggleUnderline}
          title="下划线"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={toggleH1}
          title="标题 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={toggleH2}
          title="标题 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
          size="icon"
          className="h-8 w-8"
          onClick={toggleBlockquote}
          title="引用"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={insertHR}
          title="分割线"
        >
          <Minus className="h-4 w-4" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs px-2"
          onClick={triggerInlineContinuation}
          disabled={inlineIsStreaming || !currentChapter?.content}
          title="内联续写 (Ctrl+J)"
        >
          <Pen className="h-3.5 w-3.5 mr-1" />
          续写
        </Button>

        <div className="relative">
          <GenerationControlsPopover />
        </div>
      </div>

      {/* Inline suggestion toolbar */}
      <InlineSuggestionToolbar
        onAccept={handleAcceptSuggestion}
        onReject={handleRejectSuggestion}
        onRegenerate={handleRegenerate}
      />

      {/* Editor content */}
      <ScrollArea className="flex-1">
        <EditorContent editor={editor} className="h-full" />
      </ScrollArea>
    </div>
  )
}
