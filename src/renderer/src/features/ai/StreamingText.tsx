interface StreamingTextProps {
  content: string
}

export function StreamingText({ content }: StreamingTextProps): React.ReactElement {
  return (
    <div className="relative">
      <span className="whitespace-pre-wrap">{content}</span>
      <span className="inline-block w-0.5 h-4 bg-foreground ml-0.5 animate-pulse align-text-bottom" />
    </div>
  )
}
