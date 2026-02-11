import { useState, useCallback } from 'react'
import { Eye, Ear, Wind, UtensilsCrossed, Hand, Sparkles, Copy, ArrowDownToLine } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from './StreamingText'
import { useAIStore } from '../../stores/ai-store'
import { useProjectStore } from '../../stores/project-store'
import type { SenseType, AIStreamChunk } from '../../../../shared/types'

const SENSES: Array<{ type: SenseType; label: string; icon: typeof Eye }> = [
  { type: 'sight', label: '视觉', icon: Eye },
  { type: 'sound', label: '听觉', icon: Ear },
  { type: 'smell', label: '嗅觉', icon: Wind },
  { type: 'taste', label: '味觉', icon: UtensilsCrossed },
  { type: 'touch', label: '触觉', icon: Hand }
]

export function DescribePanel(): React.ReactElement {
  const [selectedSenses, setSelectedSenses] = useState<SenseType[]>(['sight'])
  const [sceneInput, setSceneInput] = useState('')
  const [result, setResult] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)

  const currentProvider = useAIStore((s) => s.currentProvider)
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const currentProject = useProjectStore((s) => s.currentProject)
  const updateChapter = useProjectStore((s) => s.updateChapter)

  const toggleSense = useCallback((sense: SenseType) => {
    setSelectedSenses((prev) =>
      prev.includes(sense) ? prev.filter((s) => s !== sense) : [...prev, sense]
    )
  }, [])

  const handleGenerate = useCallback(async () => {
    if (!currentProvider || !sceneInput.trim() || selectedSenses.length === 0) return

    setIsStreaming(true)
    setResult('')

    const requestId = `describe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    let accumulated = ''

    const unsub = window.api.ai.onStream((chunk: AIStreamChunk) => {
      if (chunk.requestId !== requestId) return
      if (chunk.type === 'text') {
        accumulated += chunk.content
        setResult(accumulated)
      } else if (chunk.type === 'done') {
        setIsStreaming(false)
        unsub()
      } else if (chunk.type === 'error') {
        setResult(`[Error] ${chunk.content}`)
        setIsStreaming(false)
        unsub()
      }
    })

    try {
      await window.api.ai.chat({
        action: 'describe',
        providerId: currentProvider.id,
        text: sceneInput.trim(),
        source: 'chat',
        requestId,
        senses: selectedSenses,
        context: {
          chapterContent: currentChapter?.content,
          projectId: currentProject?.id,
          chapterId: currentChapter?.id
        }
      })
    } catch (error) {
      console.error('Describe error:', error)
      setIsStreaming(false)
    }
  }, [currentProvider, sceneInput, selectedSenses, currentChapter, currentProject])

  const handleCopy = useCallback(() => {
    if (result) navigator.clipboard.writeText(result)
  }, [result])

  const handleInsert = useCallback(async () => {
    if (!result || !currentChapter) return
    let parsed: { type?: string; content?: Array<Record<string, unknown>> }
    try {
      parsed = currentChapter.content ? JSON.parse(currentChapter.content) : { type: 'doc', content: [] }
    } catch {
      parsed = { type: 'doc', content: [] }
    }
    const existing = Array.isArray(parsed.content) ? parsed.content : []
    const nodes = result
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => ({ type: 'paragraph', content: [{ type: 'text', text: l }] }))
    const nextDoc = { type: 'doc', content: [...existing, ...nodes] }
    await updateChapter({ id: currentChapter.id, content: JSON.stringify(nextDoc) })
  }, [result, currentChapter, updateChapter])

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">五感描写</span>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Sense checkboxes */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1.5 block">选择感官维度</label>
          <div className="flex flex-wrap gap-1.5">
            {SENSES.map(({ type, label, icon: Icon }) => (
              <Button
                key={type}
                variant={selectedSenses.includes(type) ? 'secondary' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleSense(type)}
              >
                <Icon className="h-3 w-3 mr-1" />
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Scene input */}
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">场景/关键词</label>
          <Textarea
            value={sceneInput}
            onChange={(e) => setSceneInput(e.target.value)}
            placeholder="描述需要生成五感描写的场景，如：雨后的竹林小径..."
            className="min-h-20 text-sm"
          />
        </div>

        {/* Generate button */}
        <Button
          onClick={() => void handleGenerate()}
          disabled={isStreaming || !currentProvider || !sceneInput.trim() || selectedSenses.length === 0}
          className="w-full mb-3"
          size="sm"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" />
          {isStreaming ? '生成中...' : '生成描写'}
        </Button>

        {/* Result */}
        {(result || isStreaming) && (
          <div className="rounded-lg border bg-muted/50 p-3">
            {isStreaming && !result ? (
              <StreamingText content="" />
            ) : isStreaming ? (
              <StreamingText content={result} />
            ) : (
              <div className="text-sm whitespace-pre-wrap">{result}</div>
            )}

            {result && !isStreaming && (
              <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleCopy}>
                  <Copy className="h-3 w-3 mr-1" />
                  复制
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void handleInsert()}
                >
                  <ArrowDownToLine className="h-3 w-3 mr-1" />
                  插入编辑器
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
