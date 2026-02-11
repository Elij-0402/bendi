import { useEffect, useState, useCallback } from 'react'
import { Outlet, useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Settings,
  PanelRight,
  Users,
  Globe2,
  MessageSquare,
  BookOpen,
  StickyNote,
  Palette,
  History,
  Download,
  Wand2,
  Eye,
  Lightbulb,
  MessageCircle
} from 'lucide-react'
import { Button } from '../ui/button'
import { StatusBar } from './StatusBar'
import { ChapterList } from '../../features/editor/ChapterList'
import { AIChatPanel } from '../../features/ai/AIChatPanel'
import { CharacterPanel } from '../../features/knowledge/CharacterPanel'
import { WorldSettingPanel } from '../../features/knowledge/WorldSettingPanel'
import { OutlinePanel } from '../../features/outline/OutlinePanel'
import { StoryEnginePanel } from '../../features/outline/StoryEnginePanel'
import { StoryNotePanel } from '../../features/knowledge/StoryNotePanel'
import { WritingStylePanel } from '../../features/knowledge/WritingStylePanel'
import { GenerationHistoryPanel } from '../../features/history/GenerationHistoryPanel'
import { ExportDialog } from '../../features/export/ExportDialog'
import { DescribePanel } from '../../features/ai/DescribePanel'
import { BrainstormPanel } from '../../features/ai/BrainstormPanel'
import { FeedbackPanel } from '../../features/ai/FeedbackPanel'
import { useProjectStore } from '../../stores/project-store'
import { useAIStore } from '../../stores/ai-store'

type SidePanelTab =
  | 'ai'
  | 'character'
  | 'world'
  | 'outline'
  | 'note'
  | 'style'
  | 'history'
  | 'describe'
  | 'brainstorm'
  | 'feedback'
  | 'export'
  | 'engine'

const AI_TABS: Array<{ key: SidePanelTab; label: string; icon: typeof MessageSquare }> = [
  { key: 'ai', label: 'AI', icon: MessageSquare },
  { key: 'describe', label: '描写', icon: Eye },
  { key: 'brainstorm', label: '风暴', icon: Lightbulb },
  { key: 'feedback', label: '反馈', icon: MessageCircle }
]

const KNOWLEDGE_TABS: Array<{ key: SidePanelTab; label: string; icon: typeof Users }> = [
  { key: 'character', label: '角色', icon: Users },
  { key: 'world', label: '世界观', icon: Globe2 },
  { key: 'outline', label: '大纲', icon: BookOpen },
  { key: 'note', label: '笔记', icon: StickyNote },
  { key: 'style', label: '风格', icon: Palette },
  { key: 'history', label: '历史', icon: History }
]

export function AppLayout(): React.ReactElement {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const [showAIPanel, setShowAIPanel] = useState(false)
  const [sidePanelTab, setSidePanelTab] = useState<SidePanelTab>('ai')
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showStoryEngine, setShowStoryEngine] = useState(false)

  const currentProject = useProjectStore((s) => s.currentProject)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const loadChapters = useProjectStore((s) => s.loadChapters)
  const loadProviders = useAIStore((s) => s.loadProviders)

  const loadProject = useCallback(async () => {
    if (!projectId) return
    const id = parseInt(projectId, 10)
    if (isNaN(id)) return
    try {
      const project = await window.api.project.get(id)
      if (project) {
        setCurrentProject(project)
        await loadChapters(id)
      }
    } catch (error) {
      console.error('Failed to load project:', error)
    }
  }, [projectId, setCurrentProject, loadChapters])

  useEffect(() => {
    loadProject()
    loadProviders()

    return () => {
      // Clean up on unmount
      useProjectStore.getState().setCurrentProject(null)
      useProjectStore.getState().setCurrentChapter(null)
    }
  }, [loadProject, loadProviders])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top toolbar */}
      <div className="flex h-12 items-center justify-between border-b px-4 shrink-0 bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-sm font-semibold truncate max-w-[200px]">
            {currentProject?.title ?? '加载中...'}
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={showStoryEngine ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => {
              if (showStoryEngine) {
                setShowStoryEngine(false)
                setShowAIPanel(false)
              } else {
                setShowStoryEngine(true)
                setShowAIPanel(true)
                setShowExportDialog(false)
              }
            }}
            title="故事引擎"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button
            variant={showExportDialog ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => {
              if (showExportDialog) {
                setShowExportDialog(false)
                setShowAIPanel(false)
              } else {
                setShowExportDialog(true)
                setShowAIPanel(true)
                setShowStoryEngine(false)
              }
            }}
            title="导出"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant={showAIPanel && !showStoryEngine && !showExportDialog ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => {
              if (showAIPanel && !showStoryEngine && !showExportDialog) {
                setShowAIPanel(false)
              } else {
                setShowAIPanel(true)
                setShowStoryEngine(false)
                setShowExportDialog(false)
              }
            }}
            title="侧面板"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - Chapter list */}
        <div className="w-60 border-r bg-sidebar-background flex flex-col shrink-0">
          <ChapterList />
        </div>

        {/* Center - Editor area */}
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>

        {/* Right panel */}
        {showAIPanel && (
          <div className="w-[400px] border-l bg-background flex flex-col shrink-0">
            {showStoryEngine ? (
              <StoryEnginePanel />
            ) : showExportDialog ? (
              <ExportDialog onClose={() => { setShowExportDialog(false); setShowAIPanel(false) }} />
            ) : (
              <>
                {/* Tab rows */}
                <div className="border-b shrink-0 px-2 py-1.5 space-y-1">
                  {/* Row 1: AI tools */}
                  <div className="flex items-center gap-0.5">
                    {AI_TABS.map(({ key, label, icon: Icon }) => (
                      <Button
                        key={key}
                        variant={sidePanelTab === key ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setSidePanelTab(key)}
                      >
                        <Icon className="h-3.5 w-3.5 mr-1" />
                        {label}
                      </Button>
                    ))}
                  </div>
                  {/* Row 2: Knowledge management */}
                  <div className="flex items-center gap-0.5 flex-wrap">
                    {KNOWLEDGE_TABS.map(({ key, label, icon: Icon }) => (
                      <Button
                        key={key}
                        variant={sidePanelTab === key ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 text-xs px-2"
                        onClick={() => setSidePanelTab(key)}
                      >
                        <Icon className="h-3.5 w-3.5 mr-1" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>
                {/* Panel content */}
                <div className="flex-1 min-h-0">
                  {sidePanelTab === 'ai' && <AIChatPanel />}
                  {sidePanelTab === 'character' && <CharacterPanel />}
                  {sidePanelTab === 'world' && <WorldSettingPanel />}
                  {sidePanelTab === 'outline' && <OutlinePanel />}
                  {sidePanelTab === 'note' && <StoryNotePanel />}
                  {sidePanelTab === 'style' && <WritingStylePanel />}
                  {sidePanelTab === 'history' && <GenerationHistoryPanel />}
                  {sidePanelTab === 'describe' && <DescribePanel />}
                  {sidePanelTab === 'brainstorm' && <BrainstormPanel />}
                  {sidePanelTab === 'feedback' && <FeedbackPanel />}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  )
}
