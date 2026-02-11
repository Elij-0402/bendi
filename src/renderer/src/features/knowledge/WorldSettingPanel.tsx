import { useCallback, useEffect, useState } from 'react'
import { Plus, Save, Trash2, Sparkles } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from '../ai/StreamingText'
import { useProjectStore } from '../../stores/project-store'
import { useAIStore } from '../../stores/ai-store'
import type { WorldSetting, WorldSettingCategory, AIStreamChunk } from '../../../../shared/types'

const CATEGORY_OPTIONS: Array<{ value: WorldSettingCategory; label: string }> = [
  { value: 'geography', label: '地理' },
  { value: 'history', label: '历史' },
  { value: 'power_system', label: '力量体系' },
  { value: 'culture', label: '文化' },
  { value: 'technology', label: '科技' },
  { value: 'other', label: '其他' }
]

const CATEGORY_COLORS: Record<WorldSettingCategory, string> = {
  geography: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  history: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  power_system: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  culture: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  technology: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

const EMPTY_FORM = {
  title: '',
  category: 'other' as WorldSettingCategory,
  content: ''
}

type ViewMode = 'edit' | 'timeline'

export function WorldSettingPanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentProvider = useAIStore((s) => s.currentProvider)
  const [items, setItems] = useState<WorldSetting[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [aiExpansion, setAiExpansion] = useState('')
  const [isExpanding, setIsExpanding] = useState(false)

  const load = useCallback(async () => {
    if (!currentProject) {
      setItems([])
      setSelectedId(null)
      return
    }
    const list = await window.api.worldSetting.list(currentProject.id)
    setItems(list)
    if (list.length === 0) {
      setSelectedId(null)
      setForm(EMPTY_FORM)
      return
    }
    const target = list.find((c) => c.id === selectedId) ?? list[0]
    setSelectedId(target.id)
    setForm({
      title: target.title,
      category: target.category,
      content: target.content
    })
  }, [currentProject, selectedId])

  useEffect(() => {
    void load()
  }, [load])

  const onSelect = useCallback(
    (id: number) => {
      const item = items.find((c) => c.id === id)
      if (!item) return
      setSelectedId(id)
      setForm({
        title: item.title,
        category: item.category,
        content: item.content
      })
      setAiExpansion('')
    },
    [items]
  )

  const createItem = useCallback(async () => {
    if (!currentProject) return
    const created = await window.api.worldSetting.create({
      projectId: currentProject.id,
      title: `设定${items.length + 1}`,
      category: 'other'
    })
    await load()
    onSelect(created.id)
  }, [currentProject, items.length, load, onSelect])

  const save = useCallback(async () => {
    if (!selectedId || !form.title.trim()) return
    setIsSaving(true)
    try {
      await window.api.worldSetting.update({
        id: selectedId,
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim()
      })
      await load()
    } finally {
      setIsSaving(false)
    }
  }, [selectedId, form, load])

  const remove = useCallback(async () => {
    if (!selectedId) return
    if (!confirm('确定删除该世界观设定？')) return
    await window.api.worldSetting.delete(selectedId)
    await load()
  }, [selectedId, load])

  const handleAIExpand = useCallback(async () => {
    if (!currentProvider || !selectedId || !form.content.trim()) return

    setIsExpanding(true)
    setAiExpansion('')

    const requestId = `world-expand-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
        setAiExpansion(accumulated)
      } else if (chunk.type === 'done') {
        setIsExpanding(false)
        unsub()
      } else if (chunk.type === 'error') {
        setAiExpansion(`[Error] ${chunk.content}`)
        setIsExpanding(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action: 'chat',
        providerId: currentProvider.id,
        text: `请基于以下世界观设定进行扩展和丰富，补充更多细节，保持风格一致：\n\n标题: ${form.title}\n分类: ${CATEGORY_OPTIONS.find((c) => c.value === form.category)?.label}\n内容: ${form.content}`,
        source: 'chat',
        requestId,
        context: {
          projectId: currentProject?.id
        }
      })
    } catch (error) {
      console.error('AI expand error:', error)
      setIsExpanding(false)
    }
  }, [currentProvider, selectedId, form, currentProject])

  const applyExpansion = useCallback(() => {
    if (!aiExpansion) return
    setForm((s) => ({ ...s, content: s.content + '\n\n' + aiExpansion }))
    setAiExpansion('')
  }, [aiExpansion])

  // Group items by category for timeline view
  const groupedByCategory = CATEGORY_OPTIONS.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value)
  })).filter((g) => g.items.length > 0)

  return (
    <div className="flex h-full">
      <div className="w-44 border-r shrink-0 flex flex-col">
        <div className="p-2 border-b space-y-1">
          <Button variant="outline" size="sm" className="w-full" onClick={() => void createItem()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建设定
          </Button>
          <div className="flex gap-1">
            <Button
              variant={viewMode === 'edit' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={() => setViewMode('edit')}
            >
              编辑
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={() => setViewMode('timeline')}
            >
              总览
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left rounded-md px-2 py-1.5 text-sm ${
                  selectedId === item.id ? 'bg-secondary' : 'hover:bg-muted'
                }`}
                onClick={() => {
                  onSelect(item.id)
                  setViewMode('edit')
                }}
              >
                <span className="truncate block">{item.title}</span>
                <span
                  className={`inline-block rounded px-1 text-[10px] mt-0.5 ${CATEGORY_COLORS[item.category]}`}
                >
                  {CATEGORY_OPTIONS.find((c) => c.value === item.category)?.label}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1 p-3">
        {viewMode === 'timeline' ? (
          /* Timeline / overview view */
          <div className="space-y-4">
            <h3 className="text-sm font-medium">世界观总览</h3>
            {groupedByCategory.length === 0 ? (
              <div className="text-xs text-muted-foreground">暂无世界观设定</div>
            ) : (
              groupedByCategory.map((group) => (
                <div key={group.value}>
                  <h4 className="text-xs font-medium mb-1.5 flex items-center gap-1">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${CATEGORY_COLORS[group.value]}`}>
                      {group.label}
                    </span>
                    <span className="text-muted-foreground">({group.items.length})</span>
                  </h4>
                  <div className="relative pl-4 border-l-2 border-muted space-y-2">
                    {group.items.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded border p-2 cursor-pointer hover:bg-muted/30 transition-colors"
                        onClick={() => {
                          onSelect(item.id)
                          setViewMode('edit')
                        }}
                      >
                        <div className="absolute -left-[21px] top-3 w-2.5 h-2.5 rounded-full bg-border border-2 border-background" />
                        <div className="text-xs font-medium">{item.title}</div>
                        <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : selectedId ? (
          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="设定标题"
            />
            <Select
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({ ...s, category: e.target.value as WorldSettingCategory }))
              }
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Textarea
              value={form.content}
              onChange={(e) => setForm((s) => ({ ...s, content: e.target.value }))}
              placeholder="设定内容"
              className="min-h-44"
            />
            <div className="flex items-center gap-2">
              <Button onClick={() => void save()} disabled={isSaving || !form.title.trim()}>
                <Save className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
              <Button variant="outline" onClick={() => void remove()}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                删除
              </Button>
            </div>

            {/* AI expansion */}
            <div className="border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void handleAIExpand()}
                disabled={isExpanding || !currentProvider || !form.content.trim()}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {isExpanding ? 'AI 扩展中...' : 'AI 扩展设定'}
              </Button>

              {(aiExpansion || isExpanding) && (
                <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                  {isExpanding ? (
                    <StreamingText content={aiExpansion} />
                  ) : (
                    <>
                      <div className="text-xs whitespace-pre-wrap">{aiExpansion}</div>
                      <Button
                        size="sm"
                        className="h-6 text-xs mt-2"
                        onClick={applyExpansion}
                      >
                        追加到设定内容
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">请选择或创建世界观设定</div>
        )}
      </ScrollArea>
    </div>
  )
}
