import { useState, useCallback, useEffect } from 'react'
import { Download, FileText, FileCode, Check } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'
import type { ExportFormat, ExportOptions } from '../../../../shared/types'

interface ExportDialogProps {
  onClose?: () => void
}

export function ExportDialog({ onClose }: ExportDialogProps): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const chapters = useProjectStore((s) => s.chapters)
  const currentChapter = useProjectStore((s) => s.currentChapter)

  const [format, setFormat] = useState<ExportFormat>('txt')
  const [scope, setScope] = useState<'all' | 'selected' | 'current'>('all')
  const [selectedChapterIds, setSelectedChapterIds] = useState<Set<number>>(new Set())
  const [includeTitle, setIncludeTitle] = useState(true)
  const [separator, setSeparator] = useState('---')
  const [isExporting, setIsExporting] = useState(false)
  const [exportResult, setExportResult] = useState<'success' | 'error' | null>(null)

  useEffect(() => {
    if (chapters.length > 0) {
      setSelectedChapterIds(new Set(chapters.map((c) => c.id)))
    }
  }, [chapters])

  const toggleChapter = useCallback((id: number) => {
    setSelectedChapterIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleExport = useCallback(async () => {
    if (!currentProject) return
    setIsExporting(true)
    setExportResult(null)

    try {
      let chapterIds: number[] | undefined
      if (scope === 'selected') {
        chapterIds = Array.from(selectedChapterIds)
      } else if (scope === 'current' && currentChapter) {
        chapterIds = [currentChapter.id]
      }

      const options: ExportOptions = {
        format,
        scope,
        includeTitle,
        separator,
        chapterIds
      }

      const result = await window.api.export.file(currentProject.id, options)
      if (result.success) {
        setExportResult('success')
      } else if (result.error === 'Cancelled') {
        // User cancelled save dialog, do nothing
      } else {
        setExportResult('error')
      }
    } catch (error) {
      console.error('Export error:', error)
      setExportResult('error')
    } finally {
      setIsExporting(false)
    }
  }, [currentProject, format, scope, includeTitle, separator, selectedChapterIds])

  return (
    <div className="flex flex-col h-full max-h-[600px]">
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          <Download className="h-3.5 w-3.5 inline mr-1" />
          导出
        </span>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onClose}>
            关闭
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {/* Format selection */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">导出格式</label>
          <div className="flex gap-2">
            <Button
              variant={format === 'txt' ? 'secondary' : 'outline'}
              size="sm"
              className="flex-1 h-9"
              onClick={() => setFormat('txt')}
            >
              <FileText className="h-3.5 w-3.5 mr-1" />
              纯文本
            </Button>
            <Button
              variant={format === 'markdown' ? 'secondary' : 'outline'}
              size="sm"
              className="flex-1 h-9"
              onClick={() => setFormat('markdown')}
            >
              <FileCode className="h-3.5 w-3.5 mr-1" />
              Markdown
            </Button>
          </div>
        </div>

        {/* Scope selection */}
        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">导出范围</label>
          <div className="flex gap-1">
            <Button
              variant={scope === 'all' ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setScope('all')}
            >
              全书
            </Button>
            <Button
              variant={scope === 'selected' ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setScope('selected')}
            >
              选中章节
            </Button>
            <Button
              variant={scope === 'current' ? 'secondary' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setScope('current')}
              disabled={!currentChapter}
            >
              当前章节
            </Button>
          </div>
        </div>

        {/* Chapter selector */}
        {scope === 'selected' && (
          <div className="mb-4">
            <label className="text-xs text-muted-foreground mb-1.5 block">选择章节</label>
            <div className="border rounded-md p-2 max-h-40 overflow-y-auto space-y-0.5">
              {chapters.map((chapter) => (
                <label
                  key={chapter.id}
                  className="flex items-center gap-2 py-0.5 text-xs cursor-pointer hover:bg-muted/50 rounded px-1"
                >
                  <input
                    type="checkbox"
                    checked={selectedChapterIds.has(chapter.id)}
                    onChange={() => toggleChapter(chapter.id)}
                    className="rounded"
                  />
                  <span className="truncate">{chapter.title}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div className="mb-4 space-y-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={includeTitle}
              onChange={(e) => setIncludeTitle(e.target.checked)}
              className="rounded"
            />
            包含章节标题
          </label>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">章节分隔符</label>
            <Input
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              placeholder="---"
              className="h-7 text-xs"
            />
          </div>
        </div>

        {/* Export button */}
        <Button
          onClick={() => void handleExport()}
          disabled={isExporting || !currentProject}
          className="w-full"
          size="sm"
        >
          <Download className="h-3.5 w-3.5 mr-1" />
          {isExporting ? '导出中...' : '导出'}
        </Button>

        {/* Result */}
        {exportResult && (
          <div
            className={`mt-3 rounded-lg border p-3 text-sm text-center ${
              exportResult === 'success'
                ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300'
                : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300'
            }`}
          >
            {exportResult === 'success' ? (
              <span>
                <Check className="h-4 w-4 inline mr-1" />
                导出成功
              </span>
            ) : (
              <span>导出失败，请重试</span>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
