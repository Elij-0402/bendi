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
  Minus
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'

export function NovelEditor(): React.ReactElement {
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const updateChapter = useProjectStore((s) => s.updateChapter)

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
      Underline
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
      </div>

      {/* Editor content */}
      <ScrollArea className="flex-1">
        <EditorContent editor={editor} className="h-full" />
      </ScrollArea>
    </div>
  )
}
