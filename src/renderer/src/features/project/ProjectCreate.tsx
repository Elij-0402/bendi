import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog'

interface ProjectCreateProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (title: string, description?: string, genre?: string) => Promise<{ id: number }>
}

export function ProjectCreate({
  open,
  onOpenChange,
  onCreate
}: ProjectCreateProps): React.ReactElement {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [genre, setGenre] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (): Promise<void> => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      const project = await onCreate(
        title.trim(),
        description.trim() || undefined,
        genre.trim() || undefined
      )
      onOpenChange(false)
      setTitle('')
      setDescription('')
      setGenre('')
      navigate(`/project/${project.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建项目</DialogTitle>
          <DialogDescription>创建一个新的小说写作项目</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              标题 <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="输入项目标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit()
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">描述</label>
            <Textarea
              placeholder="简短描述你的小说"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">类型/分类</label>
            <Input
              placeholder="如：玄幻、都市、科幻..."
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? '创建中...' : '创建项目'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
