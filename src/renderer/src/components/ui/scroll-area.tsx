import { forwardRef, type HTMLAttributes } from 'react'

interface ScrollAreaProps extends HTMLAttributes<HTMLDivElement> {}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`overflow-y-auto scrollbar-thin ${className}`}
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-muted-foreground) transparent'
        }}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ScrollArea.displayName = 'ScrollArea'
