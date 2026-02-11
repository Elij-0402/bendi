import { useState, useCallback, useEffect } from 'react'
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Sparkles,
  Pencil,
  Save,
  FileText,
  LayoutGrid
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { ScrollArea } from '../../components/ui/scroll-area'
import { Select } from '../../components/ui/select'
import { BeatSheetTemplate, getTemplateNodes } from './BeatSheetTemplate'
import { useProjectStore } from '../../stores/project-store'
import { useOutlineStore } from '../../stores/outline-store'
import type { OutlineNode, BeatSheetTemplateType } from '../../../../shared/types'

const TEMPLATE_OPTIONS: Array<{ value: BeatSheetTemplateType; label: string }> = [
  { value: 'three_act', label: '三幕结构' },
  { value: 'heros_journey', label: '英雄之旅' },
  { value: 'qi_cheng_zhuan_he', label: '起承转合' },
  { value: 'save_the_cat', label: 'Save the Cat' },
  { value: 'custom', label: '自定义' }
]

interface OutlineNodeItemProps {
  node: OutlineNode
  depth: number
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onAddChild: (parentId: string) => void
  dragState: { sourceId: string | null; overId: string | null }
  onDragStart: (id: string) => void
  onDragOver: (id: string) => void
  onDrop: (targetId: string) => void
  onDragEnd: () => void
  editingId: string | null
  editForm: { title: string; description: string }
  setEditForm: (form: { title: string; description: string }) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
}

function OutlineNodeItem({
  node,
  depth,
  onEdit,
  onDelete,
  onAddChild,
  dragState,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  editingId,
  editForm,
  setEditForm,
  onSaveEdit,
  onCancelEdit
}: OutlineNodeItemProps): React.ReactElement {
  const [collapsed, setCollapsed] = useState(false)
  const hasChildren = node.children && node.children.length > 0
  const isEditing = editingId === node.id
  const isDragOver = dragState.overId === node.id && dragState.sourceId !== node.id

  return (
    <div>
      <div
        className={`flex items-start gap-1 py-1 px-1 rounded group transition-colors ${
          isDragOver ? 'bg-primary/10 border border-dashed border-primary/40' : 'hover:bg-muted/50'
        }`}
        style={{ paddingLeft: `${depth * 16 + 4}px` }}
        draggable={!isEditing}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move'
          onDragStart(node.id)
        }}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          onDragOver(node.id)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onDrop(node.id)
        }}
        onDragEnd={onDragEnd}
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-1 opacity-0 group-hover:opacity-100 cursor-grab shrink-0" />

        <button
          className="shrink-0 mt-1"
          onClick={() => setCollapsed(!collapsed)}
        >
          {hasChildren ? (
            collapsed ? (
              <ChevronRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )
          ) : (
            <span className="w-3.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-1">
              <Input
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                placeholder="标题"
                className="h-7 text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSaveEdit()
                  if (e.key === 'Escape') onCancelEdit()
                }}
              />
              <Textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="描述"
                className="min-h-14 text-xs"
              />
              <div className="flex gap-1">
                <Button size="sm" className="h-6 text-xs" onClick={onSaveEdit}>
                  <Save className="h-3 w-3 mr-1" />
                  保存
                </Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onCancelEdit}>
                  取消
                </Button>
              </div>
            </div>
          ) : (
            <>
              <span className="text-sm font-medium">{node.title}</span>
              {node.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{node.description}</p>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onAddChild(node.id)}
              title="添加子节点"
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onEdit(node.id)}
              title="编辑"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onDelete(node.id)}
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {!collapsed && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddChild={onAddChild}
              dragState={dragState}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              editingId={editingId}
              editForm={editForm}
              setEditForm={setEditForm}
              onSaveEdit={onSaveEdit}
              onCancelEdit={onCancelEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

type RightPanelView = 'tree' | 'template'

export function OutlinePanel(): React.ReactElement {
  const currentProject = useProjectStore((s) => s.currentProject)
  const outlines = useOutlineStore((s) => s.outlines)
  const selectedOutlineId = useOutlineStore((s) => s.selectedOutlineId)
  const loadOutlines = useOutlineStore((s) => s.loadOutlines)
  const selectOutline = useOutlineStore((s) => s.selectOutline)
  const createOutline = useOutlineStore((s) => s.createOutline)
  const updateOutlineContent = useOutlineStore((s) => s.updateOutlineContent)
  const deleteOutline = useOutlineStore((s) => s.deleteOutline)
  const generateOutline = useOutlineStore((s) => s.generateOutline)

  const [template, setTemplate] = useState<BeatSheetTemplateType>('three_act')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ title: '', description: '' })
  const [dragState, setDragState] = useState<{ sourceId: string | null; overId: string | null }>({
    sourceId: null,
    overId: null
  })
  const [isGenerating, setIsGenerating] = useState(false)
  const [rightView, setRightView] = useState<RightPanelView>('tree')

  const selectedOutline = outlines.find((o) => o.id === selectedOutlineId)

  useEffect(() => {
    if (currentProject) {
      void loadOutlines(currentProject.id)
    }
  }, [currentProject, loadOutlines])

  const handleCreate = useCallback(async () => {
    if (!currentProject) return
    const tplNodes = template !== 'custom' ? getTemplateNodes(template) : null
    await createOutline(currentProject.id, `大纲${outlines.length + 1}`, template)
    // If template selected and nodes available, apply them to the newest outline
    if (tplNodes) {
      const refreshed = useOutlineStore.getState().outlines
      const newest = refreshed[refreshed.length - 1]
      if (newest && newest.content.length === 0) {
        await updateOutlineContent(newest.id, tplNodes)
      }
    }
  }, [currentProject, outlines.length, template, createOutline, updateOutlineContent])

  const handleAIGenerate = useCallback(async () => {
    if (!currentProject) return
    setIsGenerating(true)
    try {
      await generateOutline(currentProject.id, template)
    } finally {
      setIsGenerating(false)
    }
  }, [currentProject, template, generateOutline])

  // --- Tree manipulation helpers ---

  const findNode = useCallback(
    (nodes: OutlineNode[], id: string): OutlineNode | null => {
      for (const node of nodes) {
        if (node.id === id) return node
        if (node.children) {
          const found = findNode(node.children, id)
          if (found) return found
        }
      }
      return null
    },
    []
  )

  const addNodeToParent = useCallback(
    (nodes: OutlineNode[], parentId: string): OutlineNode[] => {
      return nodes.map((node) => {
        if (node.id === parentId) {
          const newChild: OutlineNode = {
            id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: '新节点',
            description: '',
            children: []
          }
          return { ...node, children: [...(node.children ?? []), newChild] }
        }
        if (node.children) {
          return { ...node, children: addNodeToParent(node.children, parentId) }
        }
        return node
      })
    },
    []
  )

  const removeNode = useCallback(
    (nodes: OutlineNode[], id: string): OutlineNode[] => {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => (n.children ? { ...n, children: removeNode(n.children, id) } : n))
    },
    []
  )

  const updateNode = useCallback(
    (nodes: OutlineNode[], id: string, data: { title: string; description: string }): OutlineNode[] => {
      return nodes.map((node) => {
        if (node.id === id) return { ...node, ...data }
        if (node.children) return { ...node, children: updateNode(node.children, id, data) }
        return node
      })
    },
    []
  )

  /** Move a node (sourceId) to become a sibling after targetId at root level, or insert before */
  const moveNode = useCallback(
    (nodes: OutlineNode[], sourceId: string, targetId: string): OutlineNode[] => {
      if (sourceId === targetId) return nodes
      const sourceNode = findNode(nodes, sourceId)
      if (!sourceNode) return nodes

      // Remove source from tree
      const withoutSource = removeNode(nodes, sourceId)

      // Insert source after target at the same level
      function insertAfter(list: OutlineNode[], tId: string, nodeToInsert: OutlineNode): OutlineNode[] {
        const result: OutlineNode[] = []
        for (const n of list) {
          result.push(n)
          if (n.id === tId) {
            result.push(nodeToInsert)
          }
          if (n.children) {
            const lastPushed = result[result.length - 1]
            if (lastPushed.id === n.id) {
              result[result.length - 1] = { ...n, children: insertAfter(n.children, tId, nodeToInsert) }
            }
          }
        }
        return result
      }

      return insertAfter(withoutSource, targetId, sourceNode)
    },
    [findNode, removeNode]
  )

  // --- Event handlers ---

  const handleAddRoot = useCallback(() => {
    if (!selectedOutline) return
    const newNode: OutlineNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: '新节点',
      description: '',
      children: []
    }
    void updateOutlineContent(selectedOutline.id, [...selectedOutline.content, newNode])
  }, [selectedOutline, updateOutlineContent])

  const handleAddChild = useCallback(
    (parentId: string) => {
      if (!selectedOutline) return
      const updated = addNodeToParent(selectedOutline.content, parentId)
      void updateOutlineContent(selectedOutline.id, updated)
    },
    [selectedOutline, addNodeToParent, updateOutlineContent]
  )

  const handleDelete = useCallback(
    (id: string) => {
      if (!selectedOutline) return
      const updated = removeNode(selectedOutline.content, id)
      void updateOutlineContent(selectedOutline.id, updated)
    },
    [selectedOutline, removeNode, updateOutlineContent]
  )

  const handleEdit = useCallback(
    (id: string) => {
      if (!selectedOutline) return
      const node = findNode(selectedOutline.content, id)
      if (node) {
        setEditingId(id)
        setEditForm({ title: node.title, description: node.description })
      }
    },
    [selectedOutline, findNode]
  )

  const handleSaveEdit = useCallback(() => {
    if (!selectedOutline || !editingId) return
    const updated = updateNode(selectedOutline.content, editingId, editForm)
    void updateOutlineContent(selectedOutline.id, updated)
    setEditingId(null)
  }, [selectedOutline, editingId, editForm, updateNode, updateOutlineContent])

  const handleCancelEdit = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleDragStart = useCallback((id: string) => {
    setDragState({ sourceId: id, overId: null })
  }, [])

  const handleDragOver = useCallback((id: string) => {
    setDragState((prev) => ({ ...prev, overId: id }))
  }, [])

  const handleDrop = useCallback(
    (targetId: string) => {
      if (!selectedOutline || !dragState.sourceId || dragState.sourceId === targetId) {
        setDragState({ sourceId: null, overId: null })
        return
      }
      const updated = moveNode(selectedOutline.content, dragState.sourceId, targetId)
      void updateOutlineContent(selectedOutline.id, updated)
      setDragState({ sourceId: null, overId: null })
    },
    [selectedOutline, dragState.sourceId, moveNode, updateOutlineContent]
  )

  const handleDragEnd = useCallback(() => {
    setDragState({ sourceId: null, overId: null })
  }, [])

  const handleApplyTemplate = useCallback(
    (nodes: OutlineNode[], templateType: BeatSheetTemplateType) => {
      if (!selectedOutline) return
      void updateOutlineContent(selectedOutline.id, nodes)
      setTemplate(templateType)
      setRightView('tree')
    },
    [selectedOutline, updateOutlineContent]
  )

  // Count nodes recursively
  function countNodes(nodes: OutlineNode[]): number {
    let count = nodes.length
    for (const n of nodes) {
      if (n.children) count += countNodes(n.children)
    }
    return count
  }

  return (
    <div className="flex h-full">
      {/* Left: outline list */}
      <div className="w-44 border-r shrink-0 flex flex-col">
        <div className="p-2 border-b space-y-1">
          <Select
            value={template}
            onChange={(e) => setTemplate(e.target.value as BeatSheetTemplateType)}
          >
            {TEMPLATE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => void handleCreate()}
            >
              <Plus className="h-3 w-3 mr-1" />
              新建
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={() => void handleAIGenerate()}
              disabled={isGenerating}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              AI生成
            </Button>
          </div>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {outlines.map((outline) => (
              <button
                key={outline.id}
                className={`w-full text-left rounded-md px-2 py-1.5 text-sm ${
                  selectedOutlineId === outline.id ? 'bg-secondary' : 'hover:bg-muted'
                }`}
                onClick={() => {
                  selectOutline(outline.id)
                  setRightView('tree')
                }}
              >
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="truncate">{outline.title}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {countNodes(outline.content)} 个节点
                </span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Right: outline tree or template browser */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedOutline ? (
          <>
            <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
              <span className="text-sm font-medium truncate">{selectedOutline.title}</span>
              <div className="flex items-center gap-1">
                <Button
                  variant={rightView === 'tree' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRightView('tree')}
                >
                  大纲
                </Button>
                <Button
                  variant={rightView === 'template' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setRightView('template')}
                >
                  <LayoutGrid className="h-3 w-3 mr-1" />
                  模板
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleAddRoot}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  添加节点
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => void deleteOutline(selectedOutline.id)}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  删除
                </Button>
              </div>
            </div>

            {rightView === 'template' ? (
              <BeatSheetTemplate
                onApply={handleApplyTemplate}
                selectedTemplate={template}
              />
            ) : (
              <ScrollArea className="flex-1 p-2">
                {selectedOutline.content.length === 0 ? (
                  <div className="text-center py-8 space-y-2">
                    <div className="text-xs text-muted-foreground">
                      大纲为空
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={handleAddRoot}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        手动添加
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setRightView('template')}
                      >
                        <LayoutGrid className="h-3 w-3 mr-1" />
                        从模板创建
                      </Button>
                    </div>
                  </div>
                ) : (
                  selectedOutline.content.map((node) => (
                    <OutlineNodeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onAddChild={handleAddChild}
                      dragState={dragState}
                      onDragStart={handleDragStart}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onDragEnd={handleDragEnd}
                      editingId={editingId}
                      editForm={editForm}
                      setEditForm={setEditForm}
                      onSaveEdit={handleSaveEdit}
                      onCancelEdit={handleCancelEdit}
                    />
                  ))
                )}
              </ScrollArea>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            请选择或创建大纲
          </div>
        )}
      </div>
    </div>
  )
}
