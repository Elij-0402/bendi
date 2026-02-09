import { useProjectStore } from '../../stores/project-store'
import { useAIStore } from '../../stores/ai-store'

export function StatusBar(): React.ReactElement {
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const chapters = useProjectStore((s) => s.chapters)
  const currentProvider = useAIStore((s) => s.currentProvider)

  const totalWordCount = chapters.reduce((sum, ch) => sum + ch.wordCount, 0)
  const chapterWordCount = currentChapter?.wordCount ?? 0

  return (
    <div className="flex h-7 items-center justify-between border-t bg-muted px-4 text-xs text-muted-foreground shrink-0">
      <div className="flex items-center gap-4">
        {currentChapter && (
          <span>
            本章字数: {chapterWordCount.toLocaleString()}
          </span>
        )}
        <span>
          项目总字数: {totalWordCount.toLocaleString()}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {currentProvider ? (
          <span>
            AI: {currentProvider.name} ({currentProvider.model})
          </span>
        ) : (
          <span className="text-muted-foreground/60">AI: 未配置</span>
        )}
      </div>
    </div>
  )
}
