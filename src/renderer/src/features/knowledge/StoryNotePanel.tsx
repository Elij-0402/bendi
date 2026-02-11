import { useState, useCallback, useEffect } from 'react'
import { Plus, Save, Trash2, Tag, StickyNote, Search } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'
import type { StoryNote, StoryNoteCategory } from '../../../../shared/types'

const CATEGORY_OPTIONS: Array<{ value: StoryNoteCategory; label: string }> = [
  { value: 'plot', label: '情节' },
  { value: 'character', label: '角色' },
  { value: 'scene', label: '场景' },
  { value: 'research', label: '研究' },
  { value: 'idea', label: '灵感' },
  { value: 'other', label: '其他' }
]

const EMPTY_FORM = {
  title: '',
  category: 'other' as StoryNoteCategory,
  content: '',
  tagsInput: ''
}

export function StoryNotePanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const [items, setItems] = useState<StoryNote[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [filterCategory, setFilterCategory] = useState<StoryNoteCategory | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    if (!currentProject) {
      setItems([])
      setSelectedId(null)
      return
    }
    const list = await window.api.storyNote.list(currentProject.id)
    setItems(list)
    if (list.length === 0) {
      setSelectedId(null)
      setForm(EMPTY_FORM)
      return
    }
    const target = list.find((n) => n.id === selectedId) ?? list[0]
    setSelectedId(target.id)
    setForm({
      title: target.title,
      category: target.category,
      content: target.content,
      tagsInput: target.tags.join(', ')
    })
  }, [currentProject, selectedId])

  useEffect(() => {
    void load()
  }, [load])

  const onSelect = useCallback(
    (id: number) => {
      const item = items.find((n) => n.id === id)
      if (!item) return
      setSelectedId(id)
      setForm({
        title: item.title,
        category: item.category,
        content: item.content,
        tagsInput: item.tags.join(', ')
      })
    },
    [items]
  )

  const createNote = useCallback(async () => {
    if (!currentProject) return
    const created = await window.api.storyNote.create({
      projectId: currentProject.id,
      category: 'other',
      title: `笔记${items.length + 1}`,
      content: ''
    })
    await load()
    onSelect(created.id)
  }, [currentProject, items.length, load, onSelect])

  const save = useCallback(async () => {
    if (!selectedId || !form.title.trim()) return
    setIsSaving(true)
    try {
      const tags = form.tagsInput
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean)
      await window.api.storyNote.update(selectedId, {
        title: form.title.trim(),
        category: form.category,
        content: form.content.trim(),
        tags
      })
      await load()
    } finally {
      setIsSaving(false)
    }
  }, [selectedId, form, load])

  const remove = useCallback(async () => {
    if (!selectedId) return
    if (!confirm('确定删除该笔记？')) return
    await window.api.storyNote.delete(selectedId)
    await load()
  }, [selectedId, load])

  const filteredItems = items.filter((item) => {
    if (filterCategory !== 'all' && item.category !== filterCategory) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchTitle = item.title.toLowerCase().includes(q)
      const matchContent = item.content.toLowerCase().includes(q)
      const matchTags = item.tags.some((t) => t.toLowerCase().includes(q))
      if (!matchTitle && !matchContent && !matchTags) return false
    }
    return true
  })

  return (
    <div className="flex h-full">
      {/* Left sidebar */}
      <div className="w-48 border-r shrink-0 flex flex-col">
        <div className="p-2 border-b space-y-1">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void createNote()}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建笔记
          </Button>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记..."
              className="h-7 text-xs pl-7"
            />
          </div>
          {/* Category filter */}
          <div className="flex flex-wrap gap-1">
            <Button
              variant={filterCategory === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => setFilterCategory('all')}
            >
              全部
            </Button>
            {CATEGORY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={filterCategory === opt.value ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 text-xs"
                onClick={() => setFilterCategory(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {filteredItems.length === 0 && (
              <div className="text-xs text-muted-foreground text-center py-4">
                {searchQuery ? '无匹配结果' : '暂无笔记'}
              </div>
            )}
            {filteredItems.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left rounded-md px-2 py-1.5 text-sm ${
                  selectedId === item.id ? 'bg-secondary' : 'hover:bg-muted'
                }`}
                onClick={() => onSelect(item.id)}
              >
                <div className="flex items-center gap-1">
                  <StickyNote className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </div>
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {item.content.slice(0, 50)}
                </p>
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 mt-0.5">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="inline-block rounded bg-muted px-1 text-[10px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right form */}
      <ScrollArea className="flex-1 p-3">
        {selectedId ? (
          <div className="space-y-3">
            <Input
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="笔记标题"
            />
            <Select
              value={form.category}
              onChange={(e) =>
                setForm((s) => ({ ...s, category: e.target.value as StoryNoteCategory }))
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
              placeholder="笔记内容"
              className="min-h-44"
            />
            <div>
              <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Tag className="h-3 w-3" />
                标签（逗号分隔）
              </label>
              <Input
                value={form.tagsInput}
                onChange={(e) => setForm((s) => ({ ...s, tagsInput: e.target.value }))}
                placeholder="标签1, 标签2, ..."
              />
            </div>
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
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">请选择或创建笔记</div>
        )}
      </ScrollArea>
    </div>
  )
}
