import './index.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import Tooltip, { TOOLTIPS } from '@/components/Tooltip'
import useObjAtom from '@/hooks/useObjAtom'
import { colorModeState } from '@/store/global'
import StockTradingSimulator, { DailyResult, FinalResult, FundData } from '@/utils/stockTradingSimulator'

import Code from './components/Code/indx'
import Settings from './components/Settings'
import SimulationParams from './components/SimulationParams/indx'
import TrendChart from './components/TrendChart'

// 定义表单数据类型
export interface FormData {
  totalCapital: number
  buyAmountPerPoint: number
  minBuyDropPercent: number
  useRounding: number
  sellThreshold: number
  sellRatio: number
}

// 定义视图模式类型
type ViewMode = 'table' | 'chart'

export function Component() {
  const [formData, setFormData] = useState<FormData>({
    totalCapital: 100000,
    buyAmountPerPoint: 1000,
    minBuyDropPercent: 0.5,
    useRounding: 1,
    sellThreshold: 5,
    sellRatio: 50
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [results, setResults] = useState<FinalResult | null>(null)
  const [fundData, setFundData] = useState<FundData[] | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('table') // 'table' 或 'chart'
  const [isAutoCalculating, setIsAutoCalculating] = useState<boolean>(false) // 自动计算状态
  const colorMode = useObjAtom(colorModeState)

  // 防抖的自动计算函数 - 接受最新的formData参数
  const debouncedAutoCalculateRef = useRef<NodeJS.Timeout | null>(null)

  // 运行模拟的函数，接受自定义的formData和fundData
  const runSimulationWithData = useCallback(
    (customFormData: FormData | null, customFundData: FundData[] | null): Promise<FinalResult> => {
      return new Promise((resolve, reject) => {
        setLoading(true)
        try {
          // 使用传入的fundData或当前的fundData
          const currentFundData = customFundData || fundData

          if (!currentFundData || currentFundData.length === 0) {
            toast.warning('请先获取基金数据')
            setLoading(false)
            reject(new Error('无效数据'))
            return
          }
          // 使用传入的formData或当前的formData
          const currentFormData = customFormData || formData

          const simulator = new StockTradingSimulator(
            currentFormData.totalCapital,
            currentFormData.buyAmountPerPoint,
            currentFormData.minBuyDropPercent,
            !!currentFormData.useRounding,
            currentFormData.sellThreshold,
            currentFormData.sellRatio
          )

          const result = simulator.simulate(currentFundData)
          setResults(result)
          resolve(result)
        } catch (error) {
          console.error('模拟运行失败:', error)
          toast.warning('模拟运行失败，请检查参数设置')
          reject(error)
        } finally {
          setLoading(false)
        }
      })
    },
    [fundData, formData]
  )

  const debouncedAutoCalculate = useCallback(
    async (latestFormData: FormData) => {
      // 清除之前的定时器
      if (debouncedAutoCalculateRef.current) {
        clearTimeout(debouncedAutoCalculateRef.current)
      }

      // 设置新的定时器
      debouncedAutoCalculateRef.current = setTimeout(async () => {
        try {
          // 使用当前的fundData
          await runSimulationWithData(latestFormData, fundData)
        } finally {
          // 计算完成后重置状态
          setIsAutoCalculating(false)
        }
      }, 300)
    },
    [fundData, runSimulationWithData]
  ) // 300ms防抖延迟

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const newFormData = {
      ...formData,
      [name]: Number(value)
    }
    setFormData(newFormData)

    // 显示即将计算的状态
    // setIsAutoCalculating(true)
    // 自动触发计算（防抖），传递最新的formData
    // debouncedAutoCalculate(newFormData)
  }

  // 获取盈亏颜色类名
  const getProfitColor = (value: number): string => {
    if (value === 0) return 'text-gray-600'

    if (colorMode.val === 'standard') {
      return value > 0 ? 'text-green-600' : 'text-red-600'
    } else {
      return value > 0 ? 'text-red-600' : 'text-green-600'
    }
  }

  return (
    <div className="fixed-height-container bg-gray-100 min-h-screen">
      <div className="container mx-auto p-6 max-w-full">
        {/* 标题栏和设置按钮 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            <span className="inline-block origin-center rotate-180">J</span>
            <span>J</span> Simulator
          </h1>
          <Settings />
        </div>

        <div className="content-area flex flex-col lg:flex-row gap-6">
          {/* 左侧：参数设置区域 */}
          <div className="lg:w-1/3 left-panel">
            <div className="bg-white rounded-lg shadow-md p-6 h-full">
              <h2 className="text-xl font-semibold mb-4 text-gray-700">模拟参数</h2>
              <div className="space-y-3">
                <Code getProfitColor={getProfitColor} runSimulationWithData={runSimulationWithData} setFundData={setFundData} />
                <SimulationParams
                  formData={formData}
                  loading={loading}
                  setLoading={setLoading}
                  handleInputChange={handleInputChange}
                  isAutoCalculating={isAutoCalculating}
                  runSimulationWithData={runSimulationWithData}
                  fundData={fundData}
                />
              </div>
            </div>
          </div>

          {/* 右侧：结果展示区域 */}
          <div className="lg:w-2/3 right-panel">
            {results ? (
              <div className="results-area">
                {/* 总结信息 */}
                <div className="summary-section bg-white rounded-lg shadow-md p-6 mb-6">
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {results.maxHoldingValue ? results.maxHoldingValue.toFixed(0) : '0'}
                      </div>
                      <Tooltip content={TOOLTIPS.maxHoldingValue}>
                        <div className="text-sm text-gray-600 cursor-help">最大持仓额</div>
                      </Tooltip>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getProfitColor(results.returnPercent)}`}>
                        {results.returnPercent.toFixed(2)}%
                      </div>
                      <Tooltip content={TOOLTIPS.returnPercent}>
                        <div className="text-sm text-gray-600 cursor-help">模拟收益率</div>
                      </Tooltip>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getProfitColor(results.totalReturn)}`}>{results.totalReturn.toFixed(0)}</div>
                      <Tooltip content={TOOLTIPS.totalReturn}>
                        <div className="text-sm text-gray-600 cursor-help">总盈亏额</div>
                      </Tooltip>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{results.dailyResults.length}天</div>
                      <Tooltip content={TOOLTIPS.tradingDays}>
                        <div className="text-sm text-gray-600 cursor-help">交易日数</div>
                      </Tooltip>
                    </div>
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${getProfitColor(results.totalPriceChange)}`}>
                        {results.totalPriceChange.toFixed(2)}%
                      </div>
                      <Tooltip content={TOOLTIPS.totalPriceChange}>
                        <div className="text-sm text-gray-600 cursor-help">区间涨跌幅</div>
                      </Tooltip>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {results.buyCount}/{results.sellCount}
                      </div>
                      <Tooltip content={`${TOOLTIPS.buyCount} / ${TOOLTIPS.sellCount}`}>
                        <div className="text-sm text-gray-600 cursor-help">买入/卖出次数</div>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* 每日详情表格 */}
                <div className="table-section bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-700">详情</h2>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        表格
                      </button>
                      <button
                        onClick={() => setViewMode('chart')}
                        className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                          viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        图表
                      </button>
                    </div>
                  </div>
                  {viewMode === 'table' ? (
                    loading || isAutoCalculating ? (
                      <div className="flex items-center justify-center h-64">
                        <div className="text-center text-gray-500">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600 mx-auto mb-2"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <p className="text-sm">数据计算中...</p>
                        </div>
                      </div>
                    ) : (
                      <div className="sticky-table">
                        <table className="min-w-full table-auto compact-table">
                          <thead>
                            <tr className="bg-gray-50">
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help">
                                <Tooltip content={TOOLTIPS.dailyChange}>当日涨跌</Tooltip>
                              </th>

                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help">
                                <Tooltip content={TOOLTIPS.cumulativeChange}>累计涨跌</Tooltip>
                              </th>

                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help">
                                <Tooltip content={TOOLTIPS.holdingGain}>持仓涨幅</Tooltip>
                              </th>

                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help">
                                <Tooltip content={TOOLTIPS.holdingValue}>持仓额</Tooltip>
                              </th>

                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help">
                                <Tooltip content={TOOLTIPS.totalAssets}>总资产</Tooltip>
                              </th>

                              <th className="px-2 py-1 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-help">
                                <Tooltip content={TOOLTIPS.tradeInfo}>交易信息</Tooltip>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {results.dailyResults.map((day: DailyResult, index: number) => (
                              <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">{day.date}</td>
                                <td className={`px-2 py-1 whitespace-nowrap text-sm font-medium ${getProfitColor(day.changePercent)}`}>
                                  {day.changePercent > 0 ? '+' : ''}
                                  {day.changePercent.toFixed(2)}%
                                </td>
                                <td className={`px-2 py-1 whitespace-nowrap text-sm font-medium ${getProfitColor(day.cumulativeChange)}`}>
                                  {day.cumulativeChange > 0 ? '+' : ''}
                                  {day.cumulativeChange.toFixed(2)}%
                                </td>
                                <td className={`px-2 py-1 whitespace-nowrap text-sm font-medium ${getProfitColor(day.currentGainPercent)}`}>
                                  {day.currentGainPercent > 0 ? '+' : ''}
                                  {day.currentGainPercent.toFixed(2)}%
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">
                                  {day.holdingValue.toFixed(0)}
                                  <span className="text-xs" dangerouslySetInnerHTML={{ __html: day.holdingValueDetail }} />
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-900">{day.totalAssets.toFixed(0)}</td>
                                <td className="px-2 py-1 whitespace-nowrap text-sm text-blue-600">{day.tradeInfo || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  ) : (
                    <div className="chart-container">
                      {loading || isAutoCalculating ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center text-gray-500">
                            <svg
                              className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-600 mx-auto mb-2"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                            <p className="text-sm">图表生成中...</p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-2 flex items-center justify-center space-x-6 text-xs text-gray-600">
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span>买入操作</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <span>卖出操作</span>
                            </div>
                          </div>
                          <TrendChart data={results} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6 h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <p className="text-lg mb-2">请先获取基金数据</p>
                  <p className="text-sm">输入基金编号并点击"获取基金数据"开始</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
