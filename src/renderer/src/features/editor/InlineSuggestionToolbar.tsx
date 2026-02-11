import { Check, X, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useInlineAIStore } from '../../stores/inline-ai-store'

interface InlineSuggestionToolbarProps {
  onAccept: () => void
  onReject: () => void
  onRegenerate: () => void
}

export function InlineSuggestionToolbar({
  onAccept,
  onReject,
  onRegenerate
}: InlineSuggestionToolbarProps): React.ReactElement | null {
  const status = useInlineAIStore((s) => s.status)
  const isStreaming = useInlineAIStore((s) => s.isStreaming)
  const alternatives = useInlineAIStore((s) => s.alternatives)
  const currentAlternativeIndex = useInlineAIStore((s) => s.currentAlternativeIndex)
  const nextAlternative = useInlineAIStore((s) => s.nextAlternative)
  const prevAlternative = useInlineAIStore((s) => s.prevAlternative)
  const cancelContinuation = useInlineAIStore((s) => s.cancelContinuation)

  if (status === 'idle') return null

  const totalVersions = alternatives.length + (status === 'completed' && currentAlternativeIndex === -1 ? 1 : 0)
  const currentVersion = currentAlternativeIndex === -1 ? totalVersions : currentAlternativeIndex + 1

  return (
    <div className="flex items-center gap-1 px-4 py-1 border-b bg-muted/50 shrink-0">
      {isStreaming ? (
        <>
          <span className="text-xs text-muted-foreground mr-2">AI 续写中...</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={cancelContinuation}
          >
            <X className="h-3 w-3 mr-1" />
            停止
          </Button>
        </>
      ) : status === 'completed' ? (
        <>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2 text-green-600 hover:text-green-700"
            onClick={onAccept}
            title="Tab"
          >
            <Check className="h-3 w-3 mr-1" />
            采纳
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onReject}
            title="Esc"
          >
            <X className="h-3 w-3 mr-1" />
            放弃
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onRegenerate}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            重新生成
          </Button>
          {totalVersions > 1 && (
            <>
              <div className="w-px h-4 bg-border mx-1" />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={prevAlternative}
                disabled={totalVersions <= 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-xs text-muted-foreground min-w-[2rem] text-center">
                {currentVersion}/{totalVersions}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={nextAlternative}
                disabled={totalVersions <= 1}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </>
          )}
        </>
      ) : status === 'error' ? (
        <>
          <span className="text-xs text-destructive mr-2">生成失败</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onRegenerate}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            重试
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs px-2"
            onClick={onReject}
          >
            <X className="h-3 w-3 mr-1" />
            关闭
          </Button>
        </>
      ) : null}
    </div>
  )
}
