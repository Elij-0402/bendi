import { useState, useCallback, useEffect } from 'react'
import { Rocket, Play, Check, Eye } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { Select } from '../../components/ui/select'
import { StreamingText } from '../ai/StreamingText'
import { useProjectStore } from '../../stores/project-store'
import { useOutlineStore } from '../../stores/outline-store'
import { useAIStore } from '../../stores/ai-store'
import type { OutlineNode, AIStreamChunk } from '../../../../shared/types'

const TONE_OPTIONS = ['紧张', '轻松', '悲伤', '幽默', '史诗', '温馨']

function flattenNodes(nodes: OutlineNode[], depth = 0): Array<OutlineNode & { depth: number }> {
  const result: Array<OutlineNode & { depth: number }> = []
  for (const node of nodes) {
    result.push({ ...node, depth })
    if (node.children) {
      result.push(...flattenNodes(node.children, depth + 1))
    }
  }
  return result
}

export function StoryEnginePanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const updateChapter = useProjectStore((s) => s.updateChapter)
  const outlines = useOutlineStore((s) => s.outlines)
  const loadOutlines = useOutlineStore((s) => s.loadOutlines)
  const currentProvider = useAIStore((s) => s.currentProvider)

  const [selectedOutlineId, setSelectedOutlineId] = useState<number | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set())
  const [tone, setTone] = useState<string>('紧张')
  const [temperature, setTemperature] = useState(0.7)
  const [targetLength, setTargetLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [generatedContent, setGeneratedContent] = useState('')
  const [isPreview, setIsPreview] = useState(false)

  useEffect(() => {
    if (currentProject) {
      void loadOutlines(currentProject.id)
    }
  }, [currentProject, loadOutlines])

  const selectedOutline = outlines.find((o) => o.id === selectedOutlineId)
  const flatNodes = selectedOutline ? flattenNodes(selectedOutline.content) : []

  const toggleNode = useCallback((nodeId: string) => {
    setSelectedNodeIds((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelectedNodeIds(new Set(flatNodes.map((n) => n.id)))
  }, [flatNodes])

  const handleGenerate = useCallback(async () => {
    if (!currentProvider || !selectedOutline || selectedNodeIds.size === 0) return

    setIsGenerating(true)
    setGeneratedContent('')
    setProgress(0)

    const selectedNodes = flatNodes.filter((n) => selectedNodeIds.has(n.id))
    const outlineText = selectedNodes.map((n) => `${'  '.repeat(n.depth)}${n.title}: ${n.description}`).join('\n')

    const requestId = `engine-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
        setGeneratedContent(accumulated)
        setProgress(Math.min(95, (accumulated.length / 2000) * 100))
      } else if (chunk.type === 'done') {
        setIsGenerating(false)
        setProgress(100)
        unsub()
      } else if (chunk.type === 'error') {
        setGeneratedContent(`[Error] ${chunk.content}`)
        setIsGenerating(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action: 'story_engine',
        providerId: currentProvider.id,
        text: outlineText,
        source: 'chat',
        requestId,
        outlineId: selectedOutline.id,
        generationOptions: {
          tone,
          temperature,
          targetLength
        },
        context: {
          projectId: currentProject?.id
        }
      })
    } catch (error) {
      console.error('Story engine error:', error)
      setIsGenerating(false)
    }
  }, [currentProvider, selectedOutline, selectedNodeIds, flatNodes, tone, temperature, targetLength, currentProject])

  const handleConfirmWrite = useCallback(async () => {
    if (!generatedContent || !currentProject) return
    const chapters = useProjectStore.getState().chapters
    if (chapters.length === 0) return

    const lastChapter = chapters[chapters.length - 1]
    let parsed: { type?: string; content?: Array<Record<string, unknown>> }
    try {
      parsed = lastChapter.content ? JSON.parse(lastChapter.content) : { type: 'doc', content: [] }
    } catch {
      parsed = { type: 'doc', content: [] }
    }

    const existing = Array.isArray(parsed.content) ? parsed.content : []
    const nodes = generatedContent
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => ({ type: 'paragraph', content: [{ type: 'text', text: l }] }))

    const nextDoc = { type: 'doc', content: [...existing, ...nodes] }
    await updateChapter({ id: lastChapter.id, content: JSON.stringify(nextDoc) })
    setGeneratedContent('')
    setProgress(0)
  }, [generatedContent, currentProject, updateChapter])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          <Rocket className="h-3.5 w-3.5 inline mr-1" />
          故事引擎
        </span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Outline selection */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">选择大纲</label>
          <Select
            value={selectedOutlineId?.toString() ?? ''}
            onChange={(e) => {
              const val = e.target.value ? parseInt(e.target.value, 10) : null
              setSelectedOutlineId(val)
              setSelectedNodeIds(new Set())
            }}
          >
            <option value="">-- 选择大纲 --</option>
            {outlines.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </Select>
        </div>

        {/* Node selection */}
        {selectedOutline && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">选择章节节点</label>
              <Button variant="ghost" size="sm" className="h-5 text-xs" onClick={selectAll}>
                全选
              </Button>
            </div>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-0.5">
              {flatNodes.map((node) => (
                <label
                  key={node.id}
                  className="flex items-center gap-2 py-0.5 text-xs cursor-pointer hover:bg-muted/50 rounded px-1"
                  style={{ paddingLeft: `${node.depth * 12 + 4}px` }}
                >
                  <input
                    type="checkbox"
                    checked={selectedNodeIds.has(node.id)}
                    onChange={() => toggleNode(node.id)}
                    className="rounded"
                  />
                  <span className="truncate">{node.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Style options */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">语调</label>
          <div className="flex flex-wrap gap-1">
            {TONE_OPTIONS.map((t) => (
              <Button
                key={t}
                variant={tone === t ? 'secondary' : 'outline'}
                size="sm"
                className="h-6 text-xs"
                onClick={() => setTone(t)}
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
            <span>创造性</span>
            <span>{temperature.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min="0.3"
            max="1.2"
            step="0.1"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
          />
        </div>

        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">目标长度</label>
          <div className="flex gap-1">
            {([['short', '短'], ['medium', '中'], ['long', '长']] as const).map(([val, label]) => (
              <Button
                key={val}
                variant={targetLength === val ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs flex-1"
                onClick={() => setTargetLength(val)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <Button
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !currentProvider || !selectedOutline || selectedNodeIds.size === 0}
          className="w-full mb-3"
          size="sm"
        >
          <Play className="h-3.5 w-3.5 mr-1" />
          {isGenerating ? '生成中...' : '开始生成'}
        </Button>

        {/* Progress */}
        {isGenerating && (
          <div className="mb-3">
            <div className="w-full bg-muted rounded-full h-1.5">
              <div
                className="bg-primary h-1.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {progress < 100 ? `生成进度 ${Math.round(progress)}%` : '生成完成'}
            </p>
          </div>
        )}

        {/* Preview result */}
        {generatedContent && (
          <div className="rounded-lg border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium">生成结果</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setIsPreview(!isPreview)}
              >
                <Eye className="h-3 w-3 mr-1" />
                {isPreview ? '收起' : '预览'}
              </Button>
            </div>

            {isPreview && (
              <div className="text-sm whitespace-pre-wrap max-h-60 overflow-y-auto mb-2">
                {isGenerating ? (
                  <StreamingText content={generatedContent} />
                ) : (
                  generatedContent
                )}
              </div>
            )}

            {!isGenerating && (
              <Button
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => void handleConfirmWrite()}
              >
                <Check className="h-3 w-3 mr-1" />
                确认写入章节
              </Button>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
