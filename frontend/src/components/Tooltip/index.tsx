import { useRef, useState } from 'react'

// 定义 Tooltip 组件的 props 类型
interface TooltipProps {
  children: React.ReactNode
  content?: string | React.ReactNode
  showIcon?: boolean
}

// 定义位置类型
interface Position {
  x: number
  y: number
}

// 定义事件类型，支持鼠标和触摸事件
interface PositionEvent {
  clientX: number
  clientY: number
}

// Tooltip 组件
export default function Tooltip({ children, content, showIcon = false }: TooltipProps) {
  const [isVisible, setIsVisible] = useState<boolean>(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement | null>(null)

  if (!content) return children

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsVisible(true)
    updatePosition(e)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isVisible) {
      updatePosition(e)
    }
  }

  const handleMouseLeave = () => {
    setIsVisible(false)
  }

  // 移动端支持
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    setIsVisible(true)
    updatePosition({
      clientX: touch.clientX,
      clientY: touch.clientY
    })
  }

  const handleTouchEnd = () => {
    setTimeout(() => setIsVisible(false), 2000) // 2秒后自动隐藏
  }

  const updatePosition = (e: PositionEvent) => {
    const offset = 10 // 距离鼠标的偏移量
    let x = e.clientX + offset
    let y = e.clientY + offset

    // 使用requestAnimationFrame确保DOM更新后再计算位置
    requestAnimationFrame(() => {
      const tooltipElement = tooltipRef.current
      if (tooltipElement) {
        const rect = tooltipElement.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // 如果右侧超出，则显示在鼠标左侧
        if (x + rect.width > viewportWidth) {
          x = e.clientX - rect.width - offset
        }

        // 如果下方超出，则显示在鼠标上方
        if (y + rect.height > viewportHeight) {
          y = e.clientY - rect.height - offset
        }

        // 确保不会超出左边界和上边界
        x = Math.max(offset, x)
        y = Math.max(offset, y)

        setPosition({ x, y })
      } else {
        setPosition({ x, y })
      }
    })
  }

  return (
    <>
      <div
        className="tooltip-container"
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center">
          {children}
          {showIcon && (
            <svg className="w-3 h-3 ml-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
        </div>
      </div>
      {isVisible && (
        <div
          ref={tooltipRef}
          className="tooltip-content"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            opacity: 1,
            visibility: 'visible'
          }}
        >
          {content}
        </div>
      )}
    </>
  )
}

// Tooltip 内容定义
export const TOOLTIPS = {
  // 参数设置相关
  fundCode: "输入基金代码或名称进行搜索，支持模糊匹配。如输入'000001'或'华夏成长'都可以找到相关基金",
  startDate: '查询开始日期，格式为YYYYMMDD，如20230101',
  endDate: '查询结束日期，格式为YYYYMMDD，如20231231',
  totalCapital: '投资总资金额度，这是您可用于投资的全部资金',
  buyAmountPerPoint: '每个份额对应的买入金额，当跌幅达到最小买入跌幅的整数倍时，会按此金额买入',
  minBuyDropPercent: '触发买入操作的最小跌幅百分比，当日跌幅达到此值时开始买入',
  sellThreshold: '触发卖出操作的盈利阈值，当持仓盈利达到此百分比时会卖出部分仓位',
  sellRatio: '每次卖出操作的仓位比例，达到卖出条件时按此比例卖出持仓',
  useRounding: '份额计算方式：四舍五入会按跌幅除以最小跌幅后四舍五入计算份额；向下取整则直接取整数部分',

  // 结果展示相关
  returnPercent: '模拟收益率，基于历史最大持仓金额计算，反映资金利用效率',
  totalReturn: '总盈亏金额，当前总资产减去初始投资金额的差值',
  maxHoldingValue: '历史最大持仓金额，整个投资期间持有基金的最大市值',
  tradingDays: '交易日数，模拟期间的有效交易天数',
  totalPriceChange: '区间涨跌幅，基金在整个模拟期间的净值变化百分比',
  buyCount: '买入次数，模拟期间触发买入操作的总次数',
  sellCount: '卖出次数，模拟期间触发卖出操作的总次数',

  // 表格列头相关
  dailyChange: '当日涨跌，该交易日基金净值的涨跌幅百分比',
  cumulativeChange: '累计涨跌，从模拟开始至当日的累计涨跌幅',
  holdingGain: '持仓涨幅，当前持仓相对于平均买入成本的盈亏百分比',
  holdingValue: '持仓额，当前持有基金的市值金额',
  totalAssets: '总资产，剩余现金加上持仓市值的总和',
  tradeInfo: '交易信息，当日的买入或卖出操作详情'
}
