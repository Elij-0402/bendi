import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Settings, BookOpen } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { useProjectStore } from '../../stores/project-store'
import { ProjectCreate } from './ProjectCreate'

export function ProjectList(): React.ReactElement {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const projects = useProjectStore((s) => s.projects)
  const isLoading = useProjectStore((s) => s.isLoading)
  const loadProjects = useProjectStore((s) => s.loadProjects)
  const createProject = useProjectStore((s) => s.createProject)

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8 pb-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">笔境</h1>
          <p className="text-sm text-muted-foreground mt-1">AI辅助小说写作</p>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {/* Actions */}
      <div className="px-8 py-4">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          新建项目
        </Button>
      </div>

      {/* Project grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            加载中...
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mb-4 opacity-30" />
            <p className="text-lg">还没有项目</p>
            <p className="text-sm mt-1">点击"新建项目"开始你的创作之旅</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group cursor-pointer rounded-lg border bg-card p-5 transition-colors hover:bg-accent hover:border-accent-foreground/20"
                onClick={() => navigate(`/project/${project.id}`)}
              >
                <h3 className="font-semibold text-card-foreground truncate">{project.title}</h3>
                {project.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                  {project.genre && (
                    <span className="rounded-full bg-secondary px-2 py-0.5">
                      {project.genre}
                    </span>
                  )}
                  <span>{project.currentWordCount.toLocaleString()} 字</span>
                  <span>{new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create dialog */}
      <ProjectCreate
        open={showCreate}
        onOpenChange={setShowCreate}
        onCreate={createProject}
      />
    </div>
  )
}
