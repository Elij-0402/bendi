import { useCallback, useEffect, useState } from 'react'
import { Plus, Save, Trash2, Sparkles, Network } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { Select } from '../../components/ui/select'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from '../ai/StreamingText'
import { useProjectStore } from '../../stores/project-store'
import { useAIStore } from '../../stores/ai-store'
import type { Character, CharacterRole, AIStreamChunk } from '../../../../shared/types'

const ROLE_OPTIONS: Array<{ value: CharacterRole; label: string }> = [
  { value: 'protagonist', label: '主角' },
  { value: 'antagonist', label: '反派' },
  { value: 'supporting', label: '配角' },
  { value: 'minor', label: '龙套' }
]

const ROLE_COLORS: Record<CharacterRole, string> = {
  protagonist: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  antagonist: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
  supporting: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  minor: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
}

const EMPTY_FORM = {
  name: '',
  aliases: '',
  role: 'supporting' as CharacterRole,
  appearance: '',
  personality: '',
  background: ''
}

type ViewMode = 'edit' | 'relationships'

export function CharacterPanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const currentProvider = useAIStore((s) => s.currentProvider)
  const [items, setItems] = useState<Character[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSaving, setIsSaving] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [isAISuggesting, setIsAISuggesting] = useState(false)

  const load = useCallback(async () => {
    if (!currentProject) {
      setItems([])
      setSelectedId(null)
      return
    }
    const list = await window.api.character.list(currentProject.id)
    setItems(list)
    if (list.length === 0) {
      setSelectedId(null)
      setForm(EMPTY_FORM)
      return
    }
    const target = list.find((c) => c.id === selectedId) ?? list[0]
    setSelectedId(target.id)
    setForm({
      name: target.name,
      aliases: target.aliases,
      role: target.role,
      appearance: target.appearance,
      personality: target.personality,
      background: target.background
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
        name: item.name,
        aliases: item.aliases,
        role: item.role,
        appearance: item.appearance,
        personality: item.personality,
        background: item.background
      })
      setAiSuggestion('')
    },
    [items]
  )

  const createCharacter = useCallback(async () => {
    if (!currentProject) return
    const created = await window.api.character.create({
      projectId: currentProject.id,
      name: `角色${items.length + 1}`,
      role: 'supporting'
    })
    await load()
    onSelect(created.id)
  }, [currentProject, items.length, load, onSelect])

  const save = useCallback(async () => {
    if (!selectedId || !form.name.trim()) return
    setIsSaving(true)
    try {
      await window.api.character.update({
        id: selectedId,
        name: form.name.trim(),
        aliases: form.aliases.trim(),
        role: form.role,
        appearance: form.appearance.trim(),
        personality: form.personality.trim(),
        background: form.background.trim()
      })
      await load()
    } finally {
      setIsSaving(false)
    }
  }, [selectedId, form, load])

  const remove = useCallback(async () => {
    if (!selectedId) return
    if (!confirm('确定删除该角色？')) return
    await window.api.character.delete(selectedId)
    await load()
  }, [selectedId, load])

  const handleAISuggest = useCallback(async () => {
    if (!currentProvider || !selectedId) return

    setIsAISuggesting(true)
    setAiSuggestion('')

    const charInfo = `角色: ${form.name}\n角色类型: ${form.role}\n外貌: ${form.appearance}\n性格: ${form.personality}\n背景: ${form.background}`

    const requestId = `char-suggest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
        setAiSuggestion(accumulated)
      } else if (chunk.type === 'done') {
        setIsAISuggesting(false)
        unsub()
      } else if (chunk.type === 'error') {
        setAiSuggestion(`[Error] ${chunk.content}`)
        setIsAISuggesting(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action: 'chat',
        providerId: currentProvider.id,
        text: `请基于以下角色信息，提供角色发展建议，包括：角色弧线发展方向、潜在的内心冲突、与其他角色的关系建议、可能的成长转变点。\n\n${charInfo}`,
        source: 'chat',
        requestId,
        context: {
          chapterContent: currentChapter?.content,
          projectId: currentProject?.id,
          chapterId: currentChapter?.id
        }
      })
    } catch (error) {
      console.error('AI suggest error:', error)
      setIsAISuggesting(false)
    }
  }, [currentProvider, selectedId, form, currentChapter, currentProject])

  return (
    <div className="flex h-full">
      <div className="w-44 border-r shrink-0 flex flex-col">
        <div className="p-2 border-b space-y-1">
          <Button variant="outline" size="sm" className="w-full" onClick={() => void createCharacter()}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建角色
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
              variant={viewMode === 'relationships' ? 'secondary' : 'ghost'}
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={() => setViewMode('relationships')}
            >
              <Network className="h-3 w-3 mr-0.5" />
              关系
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
                onClick={() => onSelect(item.id)}
              >
                <span className="truncate block">{item.name}</span>
                <span
                  className={`inline-block rounded px-1 text-[10px] mt-0.5 ${ROLE_COLORS[item.role]}`}
                >
                  {ROLE_OPTIONS.find((r) => r.value === item.role)?.label}
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <ScrollArea className="flex-1 p-3">
        {viewMode === 'relationships' ? (
          /* Simple relationship overview */
          <div className="space-y-3">
            <h3 className="text-sm font-medium">角色关系图</h3>
            {items.length < 2 ? (
              <div className="text-xs text-muted-foreground">至少需要 2 个角色来展示关系</div>
            ) : (
              <div className="space-y-2">
                {/* Simple grid-based relationship display */}
                <div className="flex flex-wrap gap-3 justify-center py-4">
                  {items.map((char) => (
                    <div
                      key={char.id}
                      className={`rounded-lg border p-2 text-center min-w-[80px] cursor-pointer ${
                        selectedId === char.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => onSelect(char.id)}
                    >
                      <div className="text-xs font-medium">{char.name}</div>
                      <span
                        className={`inline-block rounded px-1 text-[10px] mt-0.5 ${ROLE_COLORS[char.role]}`}
                      >
                        {ROLE_OPTIONS.find((r) => r.value === char.role)?.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Role group summary */}
                <div className="border rounded-lg p-3 space-y-1">
                  <h4 className="text-xs font-medium mb-2">角色构成</h4>
                  {ROLE_OPTIONS.map((role) => {
                    const count = items.filter((c) => c.role === role.value).length
                    if (count === 0) return null
                    return (
                      <div key={role.value} className="flex items-center gap-2">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] ${ROLE_COLORS[role.value]}`}>
                          {role.label}
                        </span>
                        <div className="flex-1 bg-muted rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full"
                            style={{ width: `${(count / items.length) * 100}%`, opacity: 0.6 }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <p className="text-[10px] text-muted-foreground text-center">
                  选择角色可在编辑模式查看详情，使用 AI 建议获取角色关系分析
                </p>
              </div>
            )}
          </div>
        ) : selectedId ? (
          <div className="space-y-3">
            <Input
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              placeholder="角色名称"
            />
            <Input
              value={form.aliases}
              onChange={(e) => setForm((s) => ({ ...s, aliases: e.target.value }))}
              placeholder="别名"
            />
            <Select
              value={form.role}
              onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as CharacterRole }))}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Textarea
              value={form.appearance}
              onChange={(e) => setForm((s) => ({ ...s, appearance: e.target.value }))}
              placeholder="外貌"
              className="min-h-20"
            />
            <Textarea
              value={form.personality}
              onChange={(e) => setForm((s) => ({ ...s, personality: e.target.value }))}
              placeholder="性格"
              className="min-h-20"
            />
            <Textarea
              value={form.background}
              onChange={(e) => setForm((s) => ({ ...s, background: e.target.value }))}
              placeholder="背景"
              className="min-h-24"
            />
            <div className="flex items-center gap-2">
              <Button onClick={() => void save()} disabled={isSaving || !form.name.trim()}>
                <Save className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
              <Button variant="outline" onClick={() => void remove()}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                删除
              </Button>
            </div>

            {/* AI suggestion */}
            <div className="border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => void handleAISuggest()}
                disabled={isAISuggesting || !currentProvider || !form.name.trim()}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {isAISuggesting ? 'AI 分析中...' : 'AI 角色发展建议'}
              </Button>

              {(aiSuggestion || isAISuggesting) && (
                <div className="mt-2 rounded-lg border bg-muted/50 p-3">
                  {isAISuggesting ? (
                    <StreamingText content={aiSuggestion} />
                  ) : (
                    <div className="text-xs whitespace-pre-wrap">{aiSuggestion}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">请选择或创建角色</div>
        )}
      </ScrollArea>
    </div>
  )
}
