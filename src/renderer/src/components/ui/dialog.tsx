import {
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
  type MouseEvent
} from 'react'
import { createPortal } from 'react-dom'

// ---- Dialog Root ----
interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps): React.ReactElement | null {
  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      {children}
    </div>,
    document.body
  )
}

// ---- DialogContent ----
interface DialogContentProps {
  children: ReactNode
  className?: string
}

export function DialogContent({
  children,
  className = ''
}: DialogContentProps): React.ReactElement {
  const contentRef = useRef<HTMLDivElement>(null)

  const handleClick = useCallback((e: MouseEvent) => {
    e.stopPropagation()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        // Bubble up - the Dialog overlay click handler will manage closing
        // but we also want Escape to close. We dispatch a custom approach:
        // Actually, the parent Dialog manages open state, so we rely on onOpenChange.
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      ref={contentRef}
      onClick={handleClick}
      className={`relative z-50 w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg animate-in zoom-in-95 ${className}`}
    >
      {children}
    </div>
  )
}

// ---- DialogHeader ----
interface DialogHeaderProps {
  children: ReactNode
  className?: string
}

export function DialogHeader({
  children,
  className = ''
}: DialogHeaderProps): React.ReactElement {
  return (
    <div className={`flex flex-col space-y-1.5 text-center sm:text-left ${className}`}>
      {children}
    </div>
  )
}

// ---- DialogTitle ----
interface DialogTitleProps {
  children: ReactNode
  className?: string
}

export function DialogTitle({
  children,
  className = ''
}: DialogTitleProps): React.ReactElement {
  return (
    <h2 className={`text-lg font-semibold leading-none tracking-tight ${className}`}>
      {children}
    </h2>
  )
}

// ---- DialogDescription ----
interface DialogDescriptionProps {
  children: ReactNode
  className?: string
}

export function DialogDescription({
  children,
  className = ''
}: DialogDescriptionProps): React.ReactElement {
  return (
    <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
  )
}

// ---- DialogFooter ----
interface DialogFooterProps {
  children: ReactNode
  className?: string
}

export function DialogFooter({
  children,
  className = ''
}: DialogFooterProps): React.ReactElement {
  return (
    <div
      className={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${className}`}
    >
      {children}
    </div>
  )
}
