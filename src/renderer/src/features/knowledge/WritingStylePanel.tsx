import { useState, useCallback, useEffect } from 'react'
import { Plus, Save, Trash2, Sparkles, Check, Palette } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'
import { useAIStore } from '../../stores/ai-store'
import type { WritingStyleProfile, StyleAnalysis, AIStreamChunk } from '../../../../shared/types'

const ANALYSIS_DIMENSIONS: Array<{
  key: keyof Omit<StyleAnalysis, 'rhetoricalDevices' | 'summary'>
  label: string
  color: string
}> = [
  { key: 'tone', label: '语调', color: 'bg-blue-500' },
  { key: 'pacing', label: '节奏', color: 'bg-green-500' },
  { key: 'vocabularyLevel', label: '词汇', color: 'bg-purple-500' },
  { key: 'sentenceStructure', label: '句式', color: 'bg-orange-500' },
  { key: 'narrativeVoice', label: '视角', color: 'bg-pink-500' }
]

/** Map descriptive text to a 0-100 score for bar chart visualization */
function estimateScore(value: string): number {
  if (!value) return 0
  const lower = value.toLowerCase()
  const highKeywords = ['丰富', '复杂', '强烈', '精细', '高级', '多变', '鲜明', '紧凑', '快', '密集']
  const lowKeywords = ['简单', '朴素', '平淡', '基础', '缓慢', '松散', '单一', '直白']
  let score = 50
  for (const kw of highKeywords) {
    if (lower.includes(kw)) score += 10
  }
  for (const kw of lowKeywords) {
    if (lower.includes(kw)) score -= 10
  }
  return Math.max(10, Math.min(95, score))
}

function StyleBarChart({ analysis }: { analysis: StyleAnalysis }): React.ReactElement {
  return (
    <div className="space-y-2">
      {ANALYSIS_DIMENSIONS.map(({ key, label, color }) => {
        const value = analysis[key]
        const score = estimateScore(value)
        return (
          <div key={key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-[10px] text-muted-foreground truncate max-w-[140px] text-right">
                {value}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${color}`}
                style={{ width: `${score}%`, opacity: 0.8 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function WritingStylePanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const currentProvider = useAIStore((s) => s.currentProvider)

  const [profiles, setProfiles] = useState<WritingStyleProfile[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [sampleText, setSampleText] = useState('')
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [activeProfileId, setActiveProfileId] = useState<number | null>(null)

  const load = useCallback(async () => {
    if (!currentProject) {
      setProfiles([])
      setSelectedId(null)
      return
    }
    const list = await window.api.writingStyle.list(currentProject.id)
    setProfiles(list)
    if (list.length === 0) {
      setSelectedId(null)
      setName('')
      setSampleText('')
      setAnalysis(null)
      return
    }
    const target = list.find((p) => p.id === selectedId) ?? list[0]
    setSelectedId(target.id)
    setName(target.name)
    setSampleText(target.sampleText)
    setAnalysis(target.analysis)
  }, [currentProject, selectedId])

  useEffect(() => {
    void load()
  }, [load])

  const onSelect = useCallback(
    (id: number) => {
      const item = profiles.find((p) => p.id === id)
      if (!item) return
      setSelectedId(id)
      setName(item.name)
      setSampleText(item.sampleText)
      setAnalysis(item.analysis)
    },
    [profiles]
  )

  const createProfile = useCallback(async () => {
    if (!currentProject) return
    const created = await window.api.writingStyle.create({
      projectId: currentProject.id,
      name: `风格${profiles.length + 1}`,
      sampleText: ''
    })
    await load()
    onSelect(created.id)
  }, [currentProject, profiles.length, load, onSelect])

  const save = useCallback(async () => {
    if (!selectedId || !name.trim()) return
    setIsSaving(true)
    try {
      await window.api.writingStyle.update(selectedId, {
        name: name.trim(),
        sampleText: sampleText.trim(),
        analysis
      })
      await load()
    } finally {
      setIsSaving(false)
    }
  }, [selectedId, name, sampleText, analysis, load])

  const remove = useCallback(async () => {
    if (!selectedId) return
    if (!confirm('确定删除该风格配置？')) return
    await window.api.writingStyle.delete(selectedId)
    await load()
  }, [selectedId, load])

  const handleAnalyze = useCallback(async () => {
    if (!currentProvider || !sampleText.trim() || !selectedId) return

    setIsAnalyzing(true)

    const requestId = `style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
      } else if (chunk.type === 'done') {
        try {
          const parsed = JSON.parse(accumulated) as StyleAnalysis
          setAnalysis(parsed)
        } catch {
          setAnalysis({
            tone: accumulated,
            pacing: '',
            vocabularyLevel: '',
            sentenceStructure: '',
            narrativeVoice: '',
            rhetoricalDevices: [],
            summary: accumulated
          })
        }
        setIsAnalyzing(false)
        unsub()
      } else if (chunk.type === 'error') {
        setIsAnalyzing(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action: 'style_analysis',
        providerId: currentProvider.id,
        text: sampleText.trim(),
        source: 'chat',
        requestId,
        styleProfileId: selectedId,
        context: {
          projectId: currentProject?.id
        }
      })
    } catch (error) {
      console.error('Style analysis error:', error)
      setIsAnalyzing(false)
    }
  }, [currentProvider, sampleText, selectedId, currentProject])

  return (
    <div className="flex h-full">
      {/* Left list */}
      <div className="w-44 border-r shrink-0 flex flex-col">
        <div className="p-2 border-b">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => void createProfile()}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            新建风格
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {profiles.map((item) => (
              <button
                key={item.id}
                className={`w-full text-left rounded-md px-2 py-1.5 text-sm flex items-center gap-1 ${
                  selectedId === item.id ? 'bg-secondary' : 'hover:bg-muted'
                }`}
                onClick={() => onSelect(item.id)}
              >
                <Palette className="h-3 w-3 shrink-0" />
                <span className="truncate">{item.name}</span>
                {activeProfileId === item.id && (
                  <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right editor */}
      <ScrollArea className="flex-1 p-3">
        {selectedId ? (
          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="风格名称"
            />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">文本样本</label>
              <Textarea
                value={sampleText}
                onChange={(e) => setSampleText(e.target.value)}
                placeholder="粘贴代表该写作风格的文本样本..."
                className="min-h-32"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => void handleAnalyze()}
              disabled={isAnalyzing || !currentProvider || !sampleText.trim()}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              {isAnalyzing ? '分析中...' : 'AI 分析风格'}
            </Button>

            {/* Analysis results with bar chart */}
            {analysis && (
              <div className="rounded-lg border p-3 space-y-3">
                <h4 className="text-xs font-medium">风格维度分析</h4>

                <StyleBarChart analysis={analysis} />

                {analysis.rhetoricalDevices.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">修辞手法：</span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {analysis.rhetoricalDevices.map((d, i) => (
                        <span
                          key={i}
                          className="inline-block rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {analysis.summary && (
                  <div>
                    <span className="text-xs text-muted-foreground">总结：</span>
                    <p className="text-xs mt-0.5">{analysis.summary}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={() => void save()} disabled={isSaving || !name.trim()}>
                <Save className="h-3.5 w-3.5 mr-1" />
                保存
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveProfileId(selectedId)}
                disabled={!analysis}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                应用此风格
              </Button>
              <Button variant="outline" onClick={() => void remove()}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                删除
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">请选择或创建写作风格</div>
        )}
      </ScrollArea>
    </div>
  )
}
