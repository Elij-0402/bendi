import { useState, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import { useProjectStore } from '../../stores/project-store'
import type { Chapter } from '../../../../shared/types'

// ---- Sortable Chapter Item ----
interface SortableChapterItemProps {
  chapter: Chapter
  isActive: boolean
  onSelect: (chapter: Chapter) => void
  onDelete: (id: number) => void
}

function SortableChapterItem({
  chapter,
  isActive,
  onSelect,
  onDelete
}: SortableChapterItemProps): React.ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chapter.id
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded-md text-sm transition-colors ${
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
      }`}
      onClick={() => onSelect(chapter)}
    >
      {/* Drag handle */}
      <button
        className="shrink-0 cursor-grab opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Title and word count */}
      <div className="flex-1 min-w-0">
        <div className="truncate">{chapter.title}</div>
        <div className="text-xs text-muted-foreground">
          {chapter.wordCount.toLocaleString()} 字
        </div>
      </div>

      {/* Delete button */}
      <button
        className="shrink-0 opacity-0 group-hover:opacity-60 hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(chapter.id)
        }}
        title="删除章节"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ---- ChapterList ----
export function ChapterList(): React.ReactElement {
  const chapters = useProjectStore((s) => s.chapters)
  const currentChapter = useProjectStore((s) => s.currentChapter)
  const currentProject = useProjectStore((s) => s.currentProject)
  const createChapter = useProjectStore((s) => s.createChapter)
  const deleteChapter = useProjectStore((s) => s.deleteChapter)
  const setCurrentChapter = useProjectStore((s) => s.setCurrentChapter)
  const reorderChapters = useProjectStore((s) => s.reorderChapters)

  const [isCreating, setIsCreating] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 }
    }),
    useSensor(KeyboardSensor)
  )

  const handleAddChapter = useCallback(async () => {
    if (!currentProject || isCreating) return
    setIsCreating(true)
    try {
      const chapterNum = chapters.length + 1
      const chapter = await createChapter(currentProject.id, `第${chapterNum}章`)
      setCurrentChapter(chapter)
    } catch (error) {
      console.error('Failed to create chapter:', error)
    } finally {
      setIsCreating(false)
    }
  }, [currentProject, chapters.length, createChapter, setCurrentChapter, isCreating])

  const handleDeleteChapter = useCallback(
    async (id: number) => {
      if (!confirm('确定删除此章节？')) return
      try {
        await deleteChapter(id)
      } catch (error) {
        console.error('Failed to delete chapter:', error)
      }
    },
    [deleteChapter]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id || !currentProject) return

      const oldIndex = chapters.findIndex((ch) => ch.id === active.id)
      const newIndex = chapters.findIndex((ch) => ch.id === over.id)

      if (oldIndex === -1 || newIndex === -1) return

      const newOrder = arrayMove(chapters, oldIndex, newIndex)
      const chapterIds = newOrder.map((ch) => ch.id)

      // Optimistically update local state by triggering reorder
      reorderChapters(currentProject.id, chapterIds)
    },
    [chapters, currentProject, reorderChapters]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <span className="text-sm font-semibold text-sidebar-foreground">章节</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleAddChapter}
          disabled={isCreating}
          title="添加章节"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Chapter list */}
      <ScrollArea className="flex-1 px-2 py-1">
        {chapters.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-xs text-muted-foreground">
            <p>暂无章节</p>
            <p className="mt-1">点击 + 创建第一章</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={chapters.map((ch) => ch.id)}
              strategy={verticalListSortingStrategy}
            >
              {chapters.map((chapter) => (
                <SortableChapterItem
                  key={chapter.id}
                  chapter={chapter}
                  isActive={currentChapter?.id === chapter.id}
                  onSelect={setCurrentChapter}
                  onDelete={handleDeleteChapter}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>
    </div>
  )
}
