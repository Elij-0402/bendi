import { useState, useCallback } from 'react'
import { MessageCircle, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from './StreamingText'
import { useAIStore } from '../../stores/ai-store'
import { useProjectStore } from '../../stores/project-store'
import type { AIStreamChunk } from '../../../../shared/types'

const FEEDBACK_DIMENSIONS = ['情节', '人物', '文笔', '节奏', '对话', '场景'] as const

interface FeedbackItem {
  dimension: string
  feedback: string
  suggestion: string
}

function parseFeedback(text: string): FeedbackItem[] {
  const items: FeedbackItem[] = []
  const sections = text.split(/(?=###?\s)/).filter((s) => s.trim())

  if (sections.length <= 1 && !text.startsWith('#')) {
    return [{ dimension: '综合反馈', feedback: text.trim(), suggestion: '' }]
  }

  for (const section of sections) {
    const lines = section.trim().split('\n')
    const heading = lines[0].replace(/^#+\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()

    const suggestionMatch = body.match(/(?:建议|改进|suggestion)[：:]\s*([\s\S]*)/i)
    const feedback = suggestionMatch ? body.slice(0, suggestionMatch.index).trim() : body
    const suggestion = suggestionMatch ? suggestionMatch[1].trim() : ''

    items.push({ dimension: heading, feedback, suggestion })
  }

  return items
}

export function FeedbackPanel(): React.ReactElement {
  const [rawResult, setRawResult] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [expandedDim, setExpandedDim] = useState<string | null>(null)

  const currentProvider = useAIStore((s) => s.currentProvider)
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const currentProject = useProjectStore((s) => s.currentProject)

  const handleGenerate = useCallback(async () => {
    if (!currentProvider || !currentChapter?.content) return

    setIsStreaming(true)
    setRawResult('')
    setExpandedDim(null)

    const requestId = `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
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
        action: 'feedback',
        providerId: currentProvider.id,
        text: '请对当前章节提供写作反馈',
        source: 'chat',
        requestId,
        context: {
          chapterContent: currentChapter.content,
          projectId: currentProject?.id,
          chapterId: currentChapter.id
        }
      })
    } catch (error) {
      console.error('Feedback error:', error)
      setIsStreaming(false)
    }
  }, [currentProvider, currentChapter, currentProject])

  const feedbackItems = rawResult && !isStreaming ? parseFeedback(rawResult) : []

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          <MessageCircle className="h-3.5 w-3.5 inline mr-1" />
          写作反馈
        </span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Current text preview */}
        {currentChapter?.content && (
          <div className="mb-3 rounded-lg border bg-muted/30 p-2">
            <label className="text-xs text-muted-foreground mb-1 block">当前章节</label>
            <p className="text-xs line-clamp-3">{currentChapter.title}</p>
          </div>
        )}

        {/* Dimension tags */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">反馈维度</label>
          <div className="flex flex-wrap gap-1">
            {FEEDBACK_DIMENSIONS.map((dim) => (
              <span
                key={dim}
                className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs"
              >
                {dim}
              </span>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => void handleGenerate()}
          disabled={isStreaming || !currentProvider || !currentChapter?.content}
          className="w-full mb-3"
          size="sm"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {isStreaming ? '分析中...' : '生成反馈'}
        </Button>

        {/* Streaming */}
        {isStreaming && rawResult && (
          <div className="rounded-lg border bg-muted/50 p-3 mb-3">
            <StreamingText content={rawResult} />
          </div>
        )}

        {/* Feedback cards */}
        {!isStreaming && feedbackItems.length > 0 && (
          <div className="space-y-2">
            {feedbackItems.map((item, idx) => (
              <div
                key={idx}
                className="rounded-lg border p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setExpandedDim(expandedDim === item.dimension ? null : item.dimension)}
              >
                <h4 className="text-sm font-medium">{item.dimension}</h4>
                <p
                  className={`text-xs text-muted-foreground mt-1 whitespace-pre-wrap ${
                    expandedDim === item.dimension ? '' : 'line-clamp-2'
                  }`}
                >
                  {item.feedback}
                </p>
                {item.suggestion && expandedDim === item.dimension && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-xs font-medium">改进建议：</span>
                    <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
                      {item.suggestion}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!currentChapter?.content && !isStreaming && (
          <div className="text-xs text-muted-foreground text-center py-8">
            请先在编辑器中编写内容后再获取反馈
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
