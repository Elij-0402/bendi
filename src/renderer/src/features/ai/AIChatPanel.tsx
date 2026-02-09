import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Square, Pen, Sparkles, RotateCcw } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { Textarea } from '../../components/ui/textarea'
import { ScrollArea } from '../../components/ui/scroll-area'
import { StreamingText } from './StreamingText'
import { useAIStore } from '../../stores/ai-store'
import { useProjectStore } from '../../stores/project-store'
import type { AIAction } from '../../../../shared/types'

export function AIChatPanel(): React.ReactElement {
  const [inputText, setInputText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const messages = useAIStore((s) => s.messages)
  const isStreaming = useAIStore((s) => s.isStreaming)
  const streamContent = useAIStore((s) => s.streamContent)
  const currentProvider = useAIStore((s) => s.currentProvider)
  const sendMessage = useAIStore((s) => s.sendMessage)
  const cancelStream = useAIStore((s) => s.cancelStream)
  const clearMessages = useAIStore((s) => s.clearMessages)

  const currentChapter = useProjectStore((s) => s.currentChapter)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamContent])

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || isStreaming) return
    setInputText('')

    const context = currentChapter?.content
      ? { chapterContent: currentChapter.content }
      : undefined

    await sendMessage('chat', text, context)
  }, [inputText, isStreaming, currentChapter, sendMessage])

  const handleQuickAction = useCallback(
    async (action: AIAction) => {
      if (isStreaming || !currentChapter?.content) return

      const actionLabels: Record<AIAction, string> = {
        continue: '请续写以下内容',
        polish: '请润色以下内容',
        rewrite: '请改写以下内容',
        chat: ''
      }

      const text = actionLabels[action]
      const context = { chapterContent: currentChapter.content }

      await sendMessage(action, text, context)
    },
    [isStreaming, currentChapter, sendMessage]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0">
        <div className="text-sm">
          {currentProvider ? (
            <span className="font-medium">
              {currentProvider.name}
              <span className="text-muted-foreground ml-1 font-normal">
                ({currentProvider.model})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground">未选择 AI 服务商</span>
          )}
        </div>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={clearMessages}
          >
            清空
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 px-4 py-3">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-muted-foreground">
            <p>与 AI 对话辅助写作</p>
            <p className="mt-1">输入问题或使用快捷操作</p>
          </div>
        )}

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`mb-3 ${msg.role === 'user' ? 'flex justify-end' : ''}`}
          >
            <div
              className={`inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground'
              }`}
            >
              <span className="whitespace-pre-wrap">{msg.content}</span>
            </div>
          </div>
        ))}

        {/* Streaming content */}
        {isStreaming && streamContent && (
          <div className="mb-3">
            <div className="inline-block max-w-[90%] rounded-lg px-3 py-2 text-sm bg-muted text-foreground">
              <StreamingText content={streamContent} />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Quick actions */}
      <div className="flex items-center gap-1 px-4 py-1.5 border-t shrink-0">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleQuickAction('continue')}
          disabled={isStreaming || !currentChapter?.content}
          title="续写当前章节内容"
        >
          <Pen className="h-3 w-3 mr-1" />
          续写
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleQuickAction('polish')}
          disabled={isStreaming || !currentChapter?.content}
          title="润色当前章节内容"
        >
          <Sparkles className="h-3 w-3 mr-1" />
          润色
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={() => handleQuickAction('rewrite')}
          disabled={isStreaming || !currentChapter?.content}
          title="改写当前章节内容"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          改写
        </Button>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-4 py-3 border-t shrink-0">
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentProvider ? '输入消息...' : '请先在设置中配置 AI 服务商'}
          disabled={!currentProvider || isStreaming}
          className="min-h-[40px] max-h-[120px] resize-none text-sm"
          rows={1}
        />
        {isStreaming ? (
          <Button
            variant="destructive"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={cancelStream}
            title="停止生成"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="default"
            size="icon"
            className="h-10 w-10 shrink-0"
            onClick={handleSend}
            disabled={!inputText.trim() || !currentProvider}
            title="发送"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
