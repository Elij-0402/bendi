import { useState, useCallback, useEffect } from 'react'
import { History, Trash2, ChevronDown, ChevronRight, RotateCcw, Filter } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'
import type { GenerationHistory, AIAction } from '../../../../shared/types'

const ACTION_LABELS: Partial<Record<AIAction, string>> = {
  continue: '续写',
  polish: '润色',
  rewrite: '改写',
  expand: '扩写',
  shrink: '缩写',
  describe: '描写',
  brainstorm: '头脑风暴',
  feedback: '反馈',
  twist: '情节反转',
  pov_change: '视角切换',
  dialogue: '对话生成',
  outline: '大纲',
  style_analysis: '风格分析',
  story_engine: '故事引擎',
  chat: '对话'
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function GenerationHistoryPanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const [items, setItems] = useState<GenerationHistory[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [filterAction, setFilterAction] = useState<AIAction | 'all'>('all')

  const load = useCallback(async () => {
    if (!currentProject) {
      setItems([])
      return
    }
    try {
      const list = await window.api.generationHistory.list(currentProject.id)
      setItems(list)
    } catch (error) {
      console.error('Failed to load history:', error)
    }
  }, [currentProject])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = useCallback(
    async (id: number) => {
      if (!confirm('确定删除该记录？')) return
      await window.api.generationHistory.delete(id)
      await load()
    },
    [load]
  )

  const handleClear = useCallback(async () => {
    if (!currentProject) return
    if (!confirm('确定清空所有生成历史？')) return
    await window.api.generationHistory.clear(currentProject.id)
    await load()
  }, [currentProject, load])

  const handleReapply = useCallback(
    (item: GenerationHistory) => {
      if (!item.outputText) return
      navigator.clipboard.writeText(item.outputText)
    },
    []
  )

  const filteredItems =
    filterAction === 'all' ? items : items.filter((i) => i.action === filterAction)

  const usedActions = [...new Set(items.map((i) => i.action))]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          <History className="h-3.5 w-3.5 inline mr-1" />
          生成历史
        </span>
        {items.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => void handleClear()}
          >
            清空
          </Button>
        )}
      </div>

      {/* Filters */}
      {usedActions.length > 1 && (
        <div className="flex items-center gap-1 px-4 py-1.5 border-b shrink-0 overflow-x-auto">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          <Button
            variant={filterAction === 'all' ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 text-xs shrink-0"
            onClick={() => setFilterAction('all')}
          >
            全部
          </Button>
          {usedActions.map((action) => (
            <Button
              key={action}
              variant={filterAction === action ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs shrink-0"
              onClick={() => setFilterAction(action)}
            >
              {ACTION_LABELS[action] ?? action}
            </Button>
          ))}
        </div>
      )}

      {/* List */}
      <ScrollArea className="flex-1">
        {filteredItems.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-12">暂无生成历史</div>
        ) : (
          <div className="divide-y">
            {filteredItems.map((item) => {
              const isExpanded = expandedId === item.id
              return (
                <div key={item.id} className="px-4 py-2">
                  <div
                    className="flex items-start gap-2 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-block rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium">
                          {ACTION_LABELS[item.action] ?? item.action}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 truncate">
                        {item.inputText.slice(0, 80)}
                      </p>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="ml-5 mt-2 space-y-2">
                      <div className="rounded border bg-muted/30 p-2">
                        <label className="text-[10px] text-muted-foreground font-medium">输入</label>
                        <p className="text-xs whitespace-pre-wrap mt-0.5">{item.inputText}</p>
                      </div>
                      <div className="rounded border bg-muted/30 p-2">
                        <label className="text-[10px] text-muted-foreground font-medium">输出</label>
                        <p className="text-xs whitespace-pre-wrap mt-0.5">{item.outputText}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => handleReapply(item)}
                          title="复制输出到剪贴板"
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          复制结果
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          onClick={() => void handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          删除
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
