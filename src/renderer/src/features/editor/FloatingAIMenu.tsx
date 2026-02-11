import { useState, useCallback } from 'react'
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Eye,
  Users,
  MessageSquare
} from 'lucide-react'
import { Button } from '../../components/ui/button'
import type { AIAction } from '../../../../shared/types'

const MENU_ITEMS: Array<{ action: AIAction; label: string; icon: typeof Eye }> = [
  { action: 'expand', label: '扩写', icon: Maximize2 },
  { action: 'shrink', label: '缩写', icon: Minimize2 },
  { action: 'rewrite', label: '改写', icon: RotateCcw },
  { action: 'describe', label: '描写', icon: Eye },
  { action: 'pov_change', label: '视角', icon: Users },
  { action: 'dialogue', label: '对话', icon: MessageSquare }
]

interface FloatingAIMenuProps {
  position: { top: number; left: number }
  selectedText: string
  onAction: (action: AIAction, text: string) => void
  onClose: () => void
}

export function FloatingAIMenu({
  position,
  selectedText,
  onAction,
  onClose
}: FloatingAIMenuProps): React.ReactElement {
  const handleAction = useCallback(
    (action: AIAction) => {
      onAction(action, selectedText)
      onClose()
    },
    [selectedText, onAction, onClose]
  )

  return (
    <div
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border bg-popover p-1 shadow-md"
      style={{ top: position.top, left: position.left }}
    >
      {MENU_ITEMS.map(({ action, label, icon: Icon }) => (
        <Button
          key={action}
          variant="ghost"
          size="sm"
          className="h-7 text-xs px-2"
          onClick={() => handleAction(action)}
          title={label}
        >
          <Icon className="h-3 w-3 mr-0.5" />
          {label}
        </Button>
      ))}
    </div>
  )
}
