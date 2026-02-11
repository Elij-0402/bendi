import { useState, useCallback, useEffect } from 'react'
import { Check, X, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from './StreamingText'
import { useAIStore } from '../../stores/ai-store'
import { useProjectStore } from '../../stores/project-store'
import type { AIAction, AIStreamChunk } from '../../../../shared/types'

const ACTION_LABELS: Partial<Record<AIAction, string>> = {
  expand: '扩写',
  shrink: '缩写',
  rewrite: '改写',
  describe: '描写',
  pov_change: '视角切换',
  dialogue: '对话生成',
  twist: '情节反转'
}

interface AIActionResultPanelProps {
  action: AIAction
  originalText: string
  onAccept?: (text: string) => void
  onReject?: () => void
  onClose?: () => void
}

export function AIActionResultPanel({
  action,
  originalText,
  onAccept,
  onReject,
  onClose
}: AIActionResultPanelProps): React.ReactElement {
  const [generatedText, setGeneratedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const currentProvider = useAIStore((s) => s.currentProvider)
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentChapter = useProjectStore((s) => s.currentChapter)

  const generate = useCallback(async () => {
    if (!currentProvider || !originalText.trim()) return

    setIsStreaming(true)
    setGeneratedText('')

    const requestId = `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
        setGeneratedText(accumulated)
      } else if (chunk.type === 'done') {
        setIsStreaming(false)
        unsub()
      } else if (chunk.type === 'error') {
        setGeneratedText(`[Error] ${chunk.content}`)
        setIsStreaming(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action,
        providerId: currentProvider.id,
        text: originalText,
        source: 'chat',
        requestId,
        selectedText: originalText,
        context: {
          chapterContent: currentChapter?.content,
          projectId: currentProject?.id,
          chapterId: currentChapter?.id
        }
      })
    } catch (error) {
      console.error('AI action error:', error)
      setIsStreaming(false)
    }
  }, [currentProvider, originalText, action, currentChapter, currentProject])

  useEffect(() => {
    void generate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAccept = useCallback(() => {
    if (generatedText && onAccept) {
      onAccept(generatedText)
    }
  }, [generatedText, onAccept])

  const handleReject = useCallback(() => {
    onReject?.()
    onClose?.()
  }, [onReject, onClose])

  const handleRegenerate = useCallback(() => {
    void generate()
  }, [generate])

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="flex items-center gap-2">
          <span className="inline-block rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">
            {ACTION_LABELS[action] ?? action}
          </span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClose}>
            关闭
          </Button>
        )}
      </div>

      {/* Comparison view */}
      <div className="flex flex-1 min-h-0">
        {/* Original text */}
        <ScrollArea className="flex-1 border-r">
          <div className="p-3">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">原文</label>
            <div className="text-sm whitespace-pre-wrap">{originalText}</div>
          </div>
        </ScrollArea>

        {/* Generated text */}
        <ScrollArea className="flex-1">
          <div className="p-3">
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">生成结果</label>
            {isStreaming ? (
              <StreamingText content={generatedText} />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{generatedText}</div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2 px-4 py-2 border-t shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleRegenerate}
          disabled={isStreaming}
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          重新生成
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleReject}
          disabled={isStreaming}
        >
          <X className="h-3 w-3 mr-1" />
          拒绝
        </Button>
        <Button
          size="sm"
          className="h-7 text-xs"
          onClick={handleAccept}
          disabled={isStreaming || !generatedText}
        >
          <Check className="h-3 w-3 mr-1" />
          接受
        </Button>
      </div>
    </div>
  )
}
