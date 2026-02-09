import { Pen } from 'lucide-react'
import { useProjectStore } from '../../stores/project-store'
import { NovelEditor } from '../editor/NovelEditor'

export function ProjectWorkspace(): React.ReactElement {
  const currentChapter = useProjectStore((s) => s.currentChapter)

  if (!currentChapter) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Pen className="h-12 w-12 mb-4 opacity-20" />
        <p className="text-lg">选择一个章节开始写作</p>
        <p className="text-sm mt-1">从左侧章节列表中选择或创建新章节</p>
      </div>
    )
  }

  return <NovelEditor />
}
