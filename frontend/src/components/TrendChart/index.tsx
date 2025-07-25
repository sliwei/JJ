import Chart, { Chart as ChartJS } from 'chart.js/auto'
import { memo, useEffect, useRef } from 'react'

import { DailyResult, FinalResult } from '@/utils/stockTradingSimulator'

// 定义图表样式类型
interface PointStyle {
  backgroundColor: string
  borderColor: string
  radius: number
  hoverRadius: number
}

// 定义图表组件的 props 类型
interface TrendChartProps {
  data: FinalResult
}

const TrendChart = memo<TrendChartProps>(({ data }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstance = useRef<ChartJS | null>(null)

  useEffect(() => {
    if (!data || !data.dailyResults || data.dailyResults.length === 0) {
      // 如果没有数据，销毁现有图表但不创建新的
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
      return
    }

    const ctx = chartRef.current?.getContext('2d')
    if (!ctx) return

    // 销毁之前的图表实例
    if (chartInstance.current) {
      chartInstance.current.destroy()
    }

    const labels = data.dailyResults.map((day: DailyResult) => {
      // 格式化日期显示为"几月几号"
      if (day.date && day.date.includes('-')) {
        const parts = day.date.split('-')
        if (parts.length === 3) {
          const month = parseInt(parts[1])
          const dayNum = parseInt(parts[2])
          return `${month}月${dayNum}日`
        }
      }
      return day.date
    })

    // 处理买入卖出标记点
    const cumulativeChangeData = data.dailyResults.map((day: DailyResult) => day.cumulativeChange)
    const pointStyles = data.dailyResults.map((day: DailyResult): PointStyle => {
      if (day.tradeInfo) {
        if (day.tradeInfo.includes('买入')) {
          return {
            backgroundColor: 'rgb(34, 197, 94)', // 绿色
            borderColor: 'rgb(34, 197, 94)',
            radius: 8,
            hoverRadius: 10
          }
        } else if (day.tradeInfo.includes('卖出')) {
          return {
            backgroundColor: 'rgb(239, 68, 68)', // 红色
            borderColor: 'rgb(239, 68, 68)',
            radius: 8,
            hoverRadius: 10
          }
        }
      }
      return {
        backgroundColor: 'rgb(59, 130, 246)',
        borderColor: 'rgb(59, 130, 246)',
        radius: 3,
        hoverRadius: 6
      }
    })

    chartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: '累计涨跌(%)',
            data: cumulativeChangeData,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            yAxisID: 'y',
            pointRadius: pointStyles.map((style: PointStyle) => style.radius),
            pointHoverRadius: pointStyles.map((style: PointStyle) => style.hoverRadius),
            pointBackgroundColor: pointStyles.map((style: PointStyle) => style.backgroundColor),
            pointBorderColor: pointStyles.map((style: PointStyle) => style.borderColor)
          },
          {
            label: '持仓涨幅(%)',
            data: data.dailyResults.map((day: DailyResult) => day.currentGainPercent),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            yAxisID: 'y'
          },
          {
            label: '持仓额',
            data: data.dailyResults.map((day: DailyResult) => day.holdingValue),
            borderColor: 'rgb(245, 101, 101)',
            backgroundColor: 'rgba(245, 101, 101, 0.1)',
            yAxisID: 'y1'
          },
          {
            label: '总资产',
            data: data.dailyResults.map((day: DailyResult) => day.totalAssets),
            borderColor: 'rgb(168, 85, 247)',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'top'
          },
          tooltip: {
            callbacks: {
              afterLabel: function (context: any) {
                if (context.datasetIndex === 0) {
                  // 只在累计涨跌线上显示交易信息
                  const dayData = data.dailyResults[context.dataIndex]
                  if (dayData.tradeInfo) {
                    return `交易: ${dayData.tradeInfo}`
                  }
                }
                return ''
              }
            }
          }
        },
        scales: {
          x: {
            display: true,
            title: {
              display: true,
              text: '日期'
            }
          },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: {
              display: true,
              text: '百分比(%)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            title: {
              display: true,
              text: '额'
            },
            grid: {
              drawOnChartArea: false
            }
          }
        }
      }
    })

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
    }
  }, [data])

  return <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
})

TrendChart.displayName = 'TrendChart'

export default TrendChart
