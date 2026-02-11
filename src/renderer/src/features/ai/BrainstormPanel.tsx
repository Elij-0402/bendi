import { useState, useCallback } from 'react'
import { Lightbulb, Sparkles, Bookmark } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from './StreamingText'
import { useAIStore } from '../../stores/ai-store'
import { useProjectStore } from '../../stores/project-store'
import type { BrainstormType, AIStreamChunk } from '../../../../shared/types'

const BRAINSTORM_TYPES: Array<{ type: BrainstormType; label: string }> = [
  { type: 'plot', label: '情节' },
  { type: 'character', label: '角色' },
  { type: 'dialogue', label: '对话' },
  { type: 'scene', label: '场景' },
  { type: 'conflict', label: '冲突' }
]

interface IdeaCard {
  title: string
  content: string
}

function parseIdeas(text: string): IdeaCard[] {
  const blocks = text.split(/(?=###?\s)/).filter((b) => b.trim())
  if (blocks.length <= 1 && !text.startsWith('#')) {
    const numbered = text.split(/(?=\d+[\.\)]\s)/).filter((b) => b.trim())
    if (numbered.length > 1) {
      return numbered.map((block) => {
        const lines = block.trim().split('\n')
        const title = lines[0].replace(/^\d+[\.\)]\s*/, '').trim()
        const content = lines.slice(1).join('\n').trim()
        return { title: title || '想法', content: content || title }
      })
    }
    return [{ title: '灵感', content: text.trim() }]
  }
  return blocks.map((block) => {
    const lines = block.trim().split('\n')
    const title = lines[0].replace(/^#+\s*/, '').trim()
    const content = lines.slice(1).join('\n').trim()
    return { title, content: content || title }
  })
}

export function BrainstormPanel(): React.ReactElement {
  const [activeType, setActiveType] = useState<BrainstormType>('plot')
  const [inputText, setInputText] = useState('')
  const [rawResult, setRawResult] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const currentProvider = useAIStore((s) => s.currentProvider)
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentChapter = useProjectStore((s) => s.currentChapter)

  const handleGenerate = useCallback(async () => {
    if (!currentProvider || !inputText.trim()) return

    setIsStreaming(true)
    setRawResult('')

    const requestId = `brainstorm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
        setRawResult(accumulated)
      } else if (chunk.type === 'done') {
        setIsStreaming(false)
        unsub()
      } else if (chunk.type === 'error') {
        setRawResult(`[Error] ${chunk.content}`)
        setIsStreaming(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action: 'brainstorm',
        providerId: currentProvider.id,
        text: inputText.trim(),
        source: 'chat',
        requestId,
        brainstormType: activeType,
        context: {
          chapterContent: currentChapter?.content,
          projectId: currentProject?.id,
          chapterId: currentChapter?.id
        }
      })
    } catch (error) {
      console.error('Brainstorm error:', error)
      setIsStreaming(false)
    }
  }, [currentProvider, inputText, activeType, currentChapter, currentProject])

  const handleSaveNote = useCallback(
    async (card: IdeaCard) => {
      if (!currentProject) return
      try {
        await window.api.storyNote.create({
          projectId: currentProject.id,
          category: 'idea',
          title: card.title,
          content: card.content,
          tags: [activeType]
        })
      } catch (error) {
        console.error('Failed to save note:', error)
      }
    },
    [currentProject, activeType]
  )

  const ideas = rawResult && !isStreaming ? parseIdeas(rawResult) : []

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          <Lightbulb className="h-3.5 w-3.5 inline mr-1" />
          头脑风暴
        </span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Sub-type tabs */}
        <div className="mb-3">
          <div className="flex flex-wrap gap-1">
            {BRAINSTORM_TYPES.map(({ type, label }) => (
              <Button
                key={type}
                variant={activeType === type ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setActiveType(type)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="mb-3">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`描述你需要的${BRAINSTORM_TYPES.find((t) => t.type === activeType)?.label ?? ''}灵感方向...`}
            className="min-h-20 text-sm"
          />
        </div>

        {/* Generate */}
        <Button
          onClick={() => void handleGenerate()}
          disabled={isStreaming || !currentProvider || !inputText.trim()}
          className="w-full mb-3"
          size="sm"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {isStreaming ? '生成中...' : '开始头脑风暴'}
        </Button>

        {/* Streaming result */}
        {isStreaming && rawResult && (
          <div className="rounded-lg border bg-muted/50 p-3 mb-3">
            <StreamingText content={rawResult} />
          </div>
        )}

        {/* Idea cards */}
        {!isStreaming && ideas.length > 0 && (
          <div className="space-y-2">
            {ideas.map((card, idx) => (
              <div key={idx} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium">{card.title}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs shrink-0"
                    onClick={() => void handleSaveNote(card)}
                    title="保存为笔记"
                  >
                    <Bookmark className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{card.content}</p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
