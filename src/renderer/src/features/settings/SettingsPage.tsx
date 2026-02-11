import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Zap, Save } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { ScrollArea } from '../../components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog'
import { useAIStore } from '../../stores/ai-store'
import type { AIProviderType, CreateAIProviderInput, ExportFormat } from '../../../../shared/types'

// Provider presets
const PROVIDER_PRESETS: Array<{
  label: string
  name: string
  type: AIProviderType
  baseUrl: string
  model: string
}> = [
  {
    label: 'OpenAI 官方',
    name: 'OpenAI',
    type: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o'
  },
  {
    label: 'OpenAI 中转站',
    name: 'OpenAI (中转)',
    type: 'openai',
    baseUrl: 'https://api.openai-proxy.com/v1',
    model: 'gpt-4o'
  },
  {
    label: '通义千问',
    name: '通义千问',
    type: 'openai',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus'
  },
  {
    label: 'Claude',
    name: 'Claude',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    model: 'claude-sonnet-4-20250514'
  },
  {
    label: 'Ollama (本地)',
    name: 'Ollama',
    type: 'openai',
    baseUrl: 'http://127.0.0.1:11434/v1',
    model: 'qwen2.5:7b'
  }
]

interface ProviderFormData {
  name: string
  type: AIProviderType
  baseUrl: string
  apiKey: string
  model: string
  isDefault: boolean
}

const emptyForm: ProviderFormData = {
  name: '',
  type: 'openai',
  baseUrl: '',
  apiKey: '',
  model: '',
  isDefault: false
}

export function SettingsPage(): React.ReactElement {
  const navigate = useNavigate()
  const providers = useAIStore((s) => s.providers)
  const loadProviders = useAIStore((s) => s.loadProviders)

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [form, setForm] = useState<ProviderFormData>({ ...emptyForm })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string }>>({})
  const [testingIds, setTestingIds] = useState<Set<number>>(new Set())

  // Export defaults
  const [defaultExportFormat, setDefaultExportFormat] = useState<ExportFormat>('txt')
  const [defaultIncludeTitle, setDefaultIncludeTitle] = useState(true)
  const [defaultSeparator, setDefaultSeparator] = useState('---')

  // AI defaults
  const [defaultTemperature, setDefaultTemperature] = useState(0.7)
  const [defaultTargetLength, setDefaultTargetLength] = useState<'short' | 'medium' | 'long'>('medium')
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => {
    loadProviders()
    // Load saved settings
    void (async () => {
      try {
        const exportFmt = await window.api.settings.get('export.defaultFormat')
        if (exportFmt) setDefaultExportFormat(exportFmt as ExportFormat)
        const inclTitle = await window.api.settings.get('export.includeTitle')
        if (inclTitle !== null && inclTitle !== undefined) setDefaultIncludeTitle(inclTitle as boolean)
        const sep = await window.api.settings.get('export.separator')
        if (sep) setDefaultSeparator(sep as string)
        const temp = await window.api.settings.get('ai.defaultTemperature')
        if (temp !== null && temp !== undefined) setDefaultTemperature(temp as number)
        const len = await window.api.settings.get('ai.defaultTargetLength')
        if (len) setDefaultTargetLength(len as 'short' | 'medium' | 'long')
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    })()
  }, [loadProviders])

  const updateForm = useCallback(
    <K extends keyof ProviderFormData>(key: K, value: ProviderFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const applyPreset = useCallback((presetIndex: number) => {
    const preset = PROVIDER_PRESETS[presetIndex]
    if (!preset) return
    setForm((prev) => ({
      ...prev,
      name: preset.name,
      type: preset.type,
      baseUrl: preset.baseUrl,
      model: preset.model
    }))
  }, [])

  const handleAddProvider = useCallback(async () => {
    const requiresApiKey = !(form.type === 'openai' && /^https?:\/\/(127\.0\.0\.1|localhost)/.test(form.baseUrl.trim()))
    if (
      !form.name.trim() ||
      !form.baseUrl.trim() ||
      !form.model.trim() ||
      (requiresApiKey && !form.apiKey.trim())
    ) {
      return
    }

    setIsSubmitting(true)
    try {
      const input: CreateAIProviderInput = {
        name: form.name.trim(),
        type: form.type,
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim(),
        model: form.model.trim(),
        isDefault: form.isDefault
      }
      await window.api.aiProvider.create(input)
      await loadProviders()
      setShowAddDialog(false)
      setForm({ ...emptyForm })
    } catch (error) {
      console.error('Failed to add provider:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [form, loadProviders])

  const handleDeleteProvider = useCallback(
    async (id: number) => {
      if (!confirm('确定删除此 AI 服务商？')) return
      try {
        await window.api.aiProvider.delete(id)
        await loadProviders()
      } catch (error) {
        console.error('Failed to delete provider:', error)
      }
    },
    [loadProviders]
  )

  const handleTestProvider = useCallback(async (id: number) => {
    setTestingIds((prev) => new Set(prev).add(id))
    try {
      const result = await window.api.aiProvider.test(id)
      setTestResults((prev) => ({ ...prev, [id]: result }))
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [id]: { success: false, message: String(error) }
      }))
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [])

  const handleSaveDefaults = useCallback(async () => {
    try {
      await window.api.settings.set('export.defaultFormat', defaultExportFormat)
      await window.api.settings.set('export.includeTitle', defaultIncludeTitle)
      await window.api.settings.set('export.separator', defaultSeparator)
      await window.api.settings.set('ai.defaultTemperature', defaultTemperature)
      await window.api.settings.set('ai.defaultTargetLength', defaultTargetLength)
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }, [defaultExportFormat, defaultIncludeTitle, defaultSeparator, defaultTemperature, defaultTargetLength])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold">设置</h1>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-6 py-6">
        <div className="max-w-2xl mx-auto">
          {/* AI Provider Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold">AI 服务商</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  配置 AI 服务商以使用 AI 辅助写作功能
                </p>
              </div>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加服务商
              </Button>
            </div>

            {/* Provider list */}
            {providers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                <p>尚未配置 AI 服务商</p>
                <p className="mt-1">点击"添加服务商"开始配置</p>
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between rounded-lg border bg-card p-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{provider.name}</span>
                        {provider.isDefault && (
                          <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs">
                            默认
                          </span>
                        )}
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {provider.type}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        模型: {provider.model}
                      </div>
                      {testResults[provider.id] && (
                        <div
                          className={`text-xs mt-1 ${
                            testResults[provider.id].success
                              ? 'text-green-600'
                              : 'text-destructive'
                          }`}
                        >
                          {testResults[provider.id].message}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handleTestProvider(provider.id)}
                        disabled={testingIds.has(provider.id)}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1" />
                        {testingIds.has(provider.id) ? '测试中...' : '测试'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteProvider(provider.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Export Defaults */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-base font-semibold">导出默认设置</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                配置导出功能的默认参数
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">默认格式</label>
                <div className="flex gap-2">
                  <Button
                    variant={defaultExportFormat === 'txt' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setDefaultExportFormat('txt')}
                  >
                    纯文本
                  </Button>
                  <Button
                    variant={defaultExportFormat === 'markdown' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setDefaultExportFormat('markdown')}
                  >
                    Markdown
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="defaultIncludeTitle"
                  checked={defaultIncludeTitle}
                  onChange={(e) => setDefaultIncludeTitle(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                <label htmlFor="defaultIncludeTitle" className="text-sm">
                  默认包含章节标题
                </label>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">章节分隔符</label>
                <Input
                  value={defaultSeparator}
                  onChange={(e) => setDefaultSeparator(e.target.value)}
                  placeholder="---"
                  className="max-w-xs"
                />
              </div>
            </div>
          </section>

          {/* AI Generation Defaults */}
          <section className="mt-8">
            <div className="mb-4">
              <h2 className="text-base font-semibold">AI 生成默认参数</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                配置 AI 生成功能的默认参数
              </p>
            </div>
            <div className="rounded-lg border bg-card p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>默认创造性 (Temperature)</span>
                  <span className="text-muted-foreground">{defaultTemperature.toFixed(1)}</span>
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={defaultTemperature}
                  onChange={(e) => setDefaultTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  较低值产生更稳定的输出，较高值产生更有创意的输出
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">默认目标长度</label>
                <div className="flex gap-2">
                  {([['short', '短'], ['medium', '中'], ['long', '长']] as const).map(([val, label]) => (
                    <Button
                      key={val}
                      variant={defaultTargetLength === val ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => setDefaultTargetLength(val)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Save button */}
          <div className="mt-8 mb-8">
            <Button onClick={() => void handleSaveDefaults()}>
              <Save className="h-4 w-4 mr-2" />
              {settingsSaved ? '已保存' : '保存设置'}
            </Button>
          </div>
        </div>
      </ScrollArea>

      {/* Add provider dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加 AI 服务商</DialogTitle>
            <DialogDescription>配置 AI 服务商信息以连接 AI 服务</DialogDescription>
          </DialogHeader>

          {/* Presets */}
          <div className="flex flex-wrap gap-2 py-2">
            <span className="text-xs text-muted-foreground leading-7">快速填充：</span>
            {PROVIDER_PRESETS.map((preset, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyPreset(idx)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                名称 <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="如：我的 OpenAI"
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                类型 <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.type}
                onChange={(e) => updateForm('type', e.target.value as AIProviderType)}
              >
                <option value="openai">OpenAI (兼容)</option>
                <option value="anthropic">Anthropic</option>
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                Base URL <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="https://api.openai.com/v1"
                value={form.baseUrl}
                onChange={(e) => updateForm('baseUrl', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                API Key <span className="text-destructive">*</span>
              </label>
              <Input
                type="password"
                placeholder="sk-..."
                value={form.apiKey}
                onChange={(e) => updateForm('apiKey', e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">
                模型名称 <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="如：gpt-4o"
                value={form.model}
                onChange={(e) => updateForm('model', e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={form.isDefault}
                onChange={(e) => updateForm('isDefault', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="isDefault" className="text-sm">
                设为默认服务商
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleAddProvider}
              disabled={
                !form.name.trim() ||
                !form.baseUrl.trim() ||
                (!(form.type === 'openai' &&
                  /^https?:\/\/(127\.0\.0\.1|localhost)/.test(form.baseUrl.trim())) &&
                  !form.apiKey.trim()) ||
                !form.model.trim() ||
                isSubmitting
              }
            >
              {isSubmitting ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
