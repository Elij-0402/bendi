import { useState } from 'react'
import { LayoutGrid, Check } from 'lucide-react'
import { Button } from '../../components/ui/button'
import { ScrollArea } from '../../components/ui/scroll-area'
import type { OutlineNode, BeatSheetTemplateType } from '../../../../shared/types'

interface TemplateDefinition {
  type: BeatSheetTemplateType
  label: string
  description: string
  nodes: OutlineNode[]
}

let _idCounter = 0
function uid(): string {
  _idCounter += 1
  return `tpl-${Date.now()}-${_idCounter}`
}

const TEMPLATES: TemplateDefinition[] = [
  {
    type: 'three_act',
    label: '三幕结构',
    description: '经典好莱坞三幕剧作结构：建置、对抗、解决',
    nodes: [
      {
        id: uid(),
        title: '第一幕 - 建置',
        description: '介绍主角、世界观和核心冲突',
        children: [
          { id: uid(), title: '开场画面', description: '引入故事世界的第一印象' },
          { id: uid(), title: '主题陈述', description: '暗示或直接表达故事主题' },
          { id: uid(), title: '铺垫', description: '展现主角的日常生活和核心问题' },
          { id: uid(), title: '催化事件', description: '打破主角日常的关键事件' },
          { id: uid(), title: '辩论/抉择', description: '主角犹豫是否接受挑战' },
          { id: uid(), title: '第一幕转折', description: '主角做出决定，进入新世界' }
        ]
      },
      {
        id: uid(),
        title: '第二幕 - 对抗',
        description: '主角面对障碍、成长和挫折',
        children: [
          { id: uid(), title: 'B故事线', description: '引入副线（通常是爱情或友情）' },
          { id: uid(), title: '乐趣与游戏', description: '展现故事的核心魅力和前提' },
          { id: uid(), title: '中点', description: '虚假胜利或虚假失败，提高赌注' },
          { id: uid(), title: '反派逼近', description: '困难加剧，盟友出问题' },
          { id: uid(), title: '一无所有', description: '主角跌入谷底，似乎全盘皆输' },
          { id: uid(), title: '灵魂暗夜', description: '主角内心最黑暗的时刻' },
          { id: uid(), title: '第二幕转折', description: '主角找到新的力量或线索' }
        ]
      },
      {
        id: uid(),
        title: '第三幕 - 解决',
        description: '高潮对决与故事收束',
        children: [
          { id: uid(), title: '集结', description: '主角制定最终计划' },
          { id: uid(), title: '终极决战', description: '面对最终挑战' },
          { id: uid(), title: '高潮', description: '主角运用成长战胜困难' },
          { id: uid(), title: '终场画面', description: '展现改变后的世界' }
        ]
      }
    ]
  },
  {
    type: 'heros_journey',
    label: '英雄之旅',
    description: '坎贝尔的英雄旅程模型：离开、启程、归来',
    nodes: [
      {
        id: uid(),
        title: '出发',
        description: '英雄离开日常世界',
        children: [
          { id: uid(), title: '平凡世界', description: '英雄的日常生活' },
          { id: uid(), title: '冒险召唤', description: '收到冒险的邀请或挑战' },
          { id: uid(), title: '拒绝召唤', description: '英雄起初的犹豫和恐惧' },
          { id: uid(), title: '遇见导师', description: '获得指引和力量' },
          { id: uid(), title: '跨越第一道门槛', description: '正式踏入冒险世界' }
        ]
      },
      {
        id: uid(),
        title: '启程',
        description: '英雄在特殊世界中经历考验',
        children: [
          { id: uid(), title: '考验、盟友与敌人', description: '结识伙伴，面对挑战' },
          { id: uid(), title: '接近最深的洞穴', description: '为最大考验做准备' },
          { id: uid(), title: '严峻考验', description: '面对最大恐惧，濒临死亡' },
          { id: uid(), title: '奖赏', description: '获得宝藏或关键知识' }
        ]
      },
      {
        id: uid(),
        title: '归来',
        description: '英雄带着变化回到日常世界',
        children: [
          { id: uid(), title: '返回之路', description: '踏上归途，面对追击' },
          { id: uid(), title: '复活', description: '最终考验，英雄蜕变' },
          { id: uid(), title: '携万能药回归', description: '英雄带着智慧回到原来的世界' }
        ]
      }
    ]
  },
  {
    type: 'qi_cheng_zhuan_he',
    label: '起承转合',
    description: '中国传统四段式结构：起因、发展、转折、结局',
    nodes: [
      {
        id: uid(),
        title: '起 - 开端',
        description: '引入背景、人物和初始情境',
        children: [
          { id: uid(), title: '时代背景', description: '交代故事发生的时间和环境' },
          { id: uid(), title: '人物登场', description: '主要角色出场，展现性格' },
          { id: uid(), title: '引发事件', description: '触发故事主线的关键事件' }
        ]
      },
      {
        id: uid(),
        title: '承 - 发展',
        description: '承接开端，推进情节发展',
        children: [
          { id: uid(), title: '矛盾深化', description: '核心冲突逐步展开' },
          { id: uid(), title: '人物成长', description: '角色在事件中变化' },
          { id: uid(), title: '伏笔铺设', description: '为后续转折埋下种子' },
          { id: uid(), title: '高潮渐近', description: '紧张感逐步上升' }
        ]
      },
      {
        id: uid(),
        title: '转 - 转折',
        description: '出现重大转折，情节急转',
        children: [
          { id: uid(), title: '意外揭示', description: '揭开隐藏的真相' },
          { id: uid(), title: '命运逆转', description: '主角命运发生戏剧性变化' },
          { id: uid(), title: '最大危机', description: '面临最严峻的考验' },
          { id: uid(), title: '觉醒时刻', description: '主角获得新的认知或力量' }
        ]
      },
      {
        id: uid(),
        title: '合 - 收束',
        description: '故事收尾，各线归结',
        children: [
          { id: uid(), title: '最终对决', description: '解决核心冲突' },
          { id: uid(), title: '因果回收', description: '伏笔揭示，前后呼应' },
          { id: uid(), title: '余韵', description: '留下回味和思考空间' }
        ]
      }
    ]
  },
  {
    type: 'save_the_cat',
    label: 'Save the Cat',
    description: 'Blake Snyder 的 15 节拍结构',
    nodes: [
      {
        id: uid(),
        title: 'Act 1 - Setup',
        description: '',
        children: [
          { id: uid(), title: 'Opening Image', description: '故事起始画面，定调' },
          { id: uid(), title: 'Theme Stated', description: '主题在对话中被提出' },
          { id: uid(), title: 'Set-Up', description: '展示主角的生活和缺陷' },
          { id: uid(), title: 'Catalyst', description: '改变一切的事件' },
          { id: uid(), title: 'Debate', description: '主角犹豫不决' }
        ]
      },
      {
        id: uid(),
        title: 'Act 2A - Fun & Games',
        description: '',
        children: [
          { id: uid(), title: 'Break into Two', description: '进入第二幕的选择' },
          { id: uid(), title: 'B Story', description: '副线展开' },
          { id: uid(), title: 'Fun and Games', description: '前提的承诺兑现' },
          { id: uid(), title: 'Midpoint', description: '虚假胜利/失败' }
        ]
      },
      {
        id: uid(),
        title: 'Act 2B - Bad Guys Close In',
        description: '',
        children: [
          { id: uid(), title: 'Bad Guys Close In', description: '压力升级' },
          { id: uid(), title: 'All Is Lost', description: '最低点' },
          { id: uid(), title: 'Dark Night of the Soul', description: '内心至暗时刻' }
        ]
      },
      {
        id: uid(),
        title: 'Act 3 - Finale',
        description: '',
        children: [
          { id: uid(), title: 'Break into Three', description: 'A和B线交汇，获得启示' },
          { id: uid(), title: 'Finale', description: '运用所学解决问题' },
          { id: uid(), title: 'Final Image', description: '与开场对应的终场画面' }
        ]
      }
    ]
  }
]

interface BeatSheetTemplateProps {
  onApply: (nodes: OutlineNode[], templateType: BeatSheetTemplateType) => void
  selectedTemplate?: BeatSheetTemplateType
}

export function BeatSheetTemplate({
  onApply,
  selectedTemplate
}: BeatSheetTemplateProps): React.ReactElement {
  const [previewType, setPreviewType] = useState<BeatSheetTemplateType | null>(null)
  const previewTemplate = TEMPLATES.find((t) => t.type === previewType)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-2 border-b shrink-0">
        <span className="text-sm font-medium">
          <LayoutGrid className="h-3.5 w-3.5 inline mr-1" />
          Beat Sheet 模板
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Template list */}
        <div className="w-40 border-r shrink-0">
          <ScrollArea className="h-full p-2">
            <div className="space-y-1">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.type}
                  className={`w-full text-left rounded-md px-2 py-2 text-sm transition-colors ${
                    previewType === tpl.type ? 'bg-secondary' : 'hover:bg-muted'
                  }`}
                  onClick={() => setPreviewType(tpl.type)}
                >
                  <div className="flex items-center gap-1">
                    <span className="font-medium text-xs">{tpl.label}</span>
                    {selectedTemplate === tpl.type && (
                      <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Preview */}
        <div className="flex-1 flex flex-col min-w-0">
          {previewTemplate ? (
            <>
              <ScrollArea className="flex-1 p-3">
                <h3 className="text-sm font-medium mb-1">{previewTemplate.label}</h3>
                <p className="text-xs text-muted-foreground mb-3">{previewTemplate.description}</p>

                <div className="space-y-2">
                  {previewTemplate.nodes.map((act) => (
                    <div key={act.id} className="rounded-lg border p-2">
                      <h4 className="text-xs font-medium">{act.title}</h4>
                      {act.description && (
                        <p className="text-[10px] text-muted-foreground">{act.description}</p>
                      )}
                      {act.children && act.children.length > 0 && (
                        <div className="mt-1.5 pl-3 border-l-2 border-muted space-y-1">
                          {act.children.map((beat) => (
                            <div key={beat.id}>
                              <span className="text-[11px] font-medium">{beat.title}</span>
                              {beat.description && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  - {beat.description}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="px-3 py-2 border-t shrink-0">
                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  onClick={() => {
                    // Generate fresh IDs so each application is unique
                    const freshNodes = regenerateIds(previewTemplate.nodes)
                    onApply(freshNodes, previewTemplate.type)
                  }}
                >
                  应用「{previewTemplate.label}」模板
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              请选择一个模板查看预览
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/** Deep clone nodes with fresh unique IDs */
function regenerateIds(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.map((node) => ({
    ...node,
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    children: node.children ? regenerateIds(node.children) : undefined
  }))
}

/** Get template nodes by type for programmatic usage */
export function getTemplateNodes(type: BeatSheetTemplateType): OutlineNode[] | null {
  const tpl = TEMPLATES.find((t) => t.type === type)
  if (!tpl) return null
  return regenerateIds(tpl.nodes)
}
