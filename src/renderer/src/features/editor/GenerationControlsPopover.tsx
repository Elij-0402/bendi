import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { useInlineAIStore } from '../../stores/inline-ai-store'
import type { GenerationOptions } from '../../../../shared/types'

const LENGTH_OPTIONS = [
  { label: '短', value: 'short' as const, desc: '100-200字' },
  { label: '中', value: 'medium' as const, desc: '300-500字' },
  { label: '长', value: 'long' as const, desc: '500-1000字' }
]

const TONE_PRESETS = ['紧张', '轻松', '悲伤', '幽默']

export function GenerationControlsPopover(): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const generationOptions = useInlineAIStore((s) => s.generationOptions)
  const setGenerationOptions = useInlineAIStore((s) => s.setGenerationOptions)
  const [customTone, setCustomTone] = useState('')

  const handleLengthChange = (length: GenerationOptions['targetLength']): void => {
    setGenerationOptions({
      targetLength: generationOptions.targetLength === length ? undefined : length
    })
  }

  const handleToneChange = (tone: string): void => {
    setGenerationOptions({
      tone: generationOptions.tone === tone ? undefined : tone
    })
  }

  const handleCustomTone = (): void => {
    if (customTone.trim()) {
      setGenerationOptions({ tone: customTone.trim() })
      setCustomTone('')
    }
  }

  const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setGenerationOptions({ temperature: parseFloat(e.target.value) })
  }

  const handleStyleNoteChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setGenerationOptions({ styleNote: e.target.value || undefined })
  }

  if (!isOpen) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => setIsOpen(true)}
        title="生成参数"
      >
        <Settings2 className="h-3.5 w-3.5" />
      </Button>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border bg-popover p-3 shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">生成控制</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => setIsOpen(false)}
        >
          关闭
        </Button>
      </div>

      {/* Length */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-1 block">长度</label>
        <div className="flex gap-1">
          {LENGTH_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              variant={generationOptions.targetLength === opt.value ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 text-xs flex-1"
              onClick={() => handleLengthChange(opt.value)}
              title={opt.desc}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tone */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-1 block">语调</label>
        <div className="flex flex-wrap gap-1 mb-1">
          {TONE_PRESETS.map((tone) => (
            <Button
              key={tone}
              variant={generationOptions.tone === tone ? 'secondary' : 'outline'}
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleToneChange(tone)}
            >
              {tone}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          <Input
            value={customTone}
            onChange={(e) => setCustomTone(e.target.value)}
            placeholder="自定义语调..."
            className="h-7 text-xs"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCustomTone()
            }}
          />
        </div>
        {generationOptions.tone && !TONE_PRESETS.includes(generationOptions.tone) && (
          <span className="text-xs text-muted-foreground mt-1 block">
            当前: {generationOptions.tone}
          </span>
        )}
      </div>

      {/* Style Note */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-1 block">写作要求</label>
        <Input
          value={generationOptions.styleNote ?? ''}
          onChange={handleStyleNoteChange}
          placeholder="如：多用对话、增加环境描写..."
          className="h-7 text-xs"
        />
      </div>

      {/* Temperature */}
      <div>
        <label className="text-xs text-muted-foreground mb-1 flex items-center justify-between">
          <span>创造性</span>
          <span>{generationOptions.temperature?.toFixed(1) ?? '默认'}</span>
        </label>
        <input
          type="range"
          min="0.3"
          max="1.2"
          step="0.1"
          value={generationOptions.temperature ?? 0.7}
          onChange={handleTemperatureChange}
          className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
          <span>精确</span>
          <span>创意</span>
        </div>
      </div>
    </div>
  )
}
