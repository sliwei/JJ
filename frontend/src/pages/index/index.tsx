import './index.css'

import { useCallback, useEffect, useRef, useState } from 'react'

import Tooltip, { TOOLTIPS } from '@/components/Tooltip'
import TrendChart from '@/components/TrendChart'
import StockTradingSimulator, { DailyResult, FinalResult, FundData } from '@/utils/stockTradingSimulator'

import SimulationParams from './components/SimulationParams/indx'

// 定义表单数据类型
interface FormData {
  totalCapital: number
  buyAmountPerPoint: number
  minBuyDropPercent: number
  useRounding: boolean
  sellThreshold: number
  sellRatio: number
  startDate: string
  endDate: string
}

// 定义颜色模式类型
type ColorMode = 'standard' | 'reversed'

// 定义视图模式类型
type ViewMode = 'table' | 'chart'

export function Component() {
  // 计算默认的1年日期范围
  const getDefaultDateRange = () => {
    const today = new Date()
    const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
    const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
    const startDate = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '')
    return { startDate, endDate }
  }

  const defaultDates = getDefaultDateRange()

  const [formData, setFormData] = useState<FormData>({
    totalCapital: 100000,
    buyAmountPerPoint: 1000,
    minBuyDropPercent: 1.0,
    useRounding: true,
    sellThreshold: 5,
    sellRatio: 50,
    startDate: defaultDates.startDate,
    endDate: defaultDates.endDate
  })

  const [results, setResults] = useState<FinalResult | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [fundData, setFundData] = useState<FundData[] | null>(null)
  const [colorMode, setColorMode] = useState<ColorMode>('reversed') // 'standard' 或 'reversed'
  const [showSettings, setShowSettings] = useState<boolean>(false) // 控制设置弹窗显示
  const [viewMode, setViewMode] = useState<ViewMode>('table') // 'table' 或 'chart'
  const [isAutoCalculating, setIsAutoCalculating] = useState<boolean>(false) // 自动计算状态

  // 防抖的自动计算函数 - 接受最新的formData参数
  const debouncedAutoCalculateRef = useRef<NodeJS.Timeout | null>(null)

  const runSimulationWithData = useCallback(
    (customFormData: FormData | null, customFundData: FundData[] | null): Promise<FinalResult> => {
      return new Promise((resolve, reject) => {
        setLoading(true)
        try {
          // 使用传入的fundData或当前的fundData
          const currentFundData = customFundData || fundData

          if (!currentFundData || currentFundData.length === 0) {
            alert('请先获取基金数据')
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
            currentFormData.useRounding,
            currentFormData.sellThreshold,
            currentFormData.sellRatio
          )

          const result = simulator.simulate(currentFundData)
          setResults(result)
          resolve(result)
        } catch (error) {
          console.error('模拟运行失败:', error)
          alert('模拟运行失败，请检查参数设置')
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
    setIsAutoCalculating(true)
    // 自动触发计算（防抖），传递最新的formData
    debouncedAutoCalculate(newFormData)
  }

  // 处理基金编号和日期字段的变化，不触发自动计算
  const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  // 获取盈亏颜色类名
  const getProfitColor = (value: number): string => {
    if (value === 0) return 'text-gray-600'

    if (colorMode === 'standard') {
      return value > 0 ? 'text-green-600' : 'text-red-600'
    } else {
      return value > 0 ? 'text-red-600' : 'text-green-600'
    }
  }

  // 获取涨跌颜色类名
  const getChangeColor = (value: number): string => {
    if (value === 0) return 'text-gray-600'

    if (colorMode === 'standard') {
      return value > 0 ? 'text-green-600' : 'text-red-600'
    } else {
      return value > 0 ? 'text-red-600' : 'text-green-600'
    }
  }

  // 设置CSS变量
  useEffect(() => {
    const root = document.documentElement
    if (colorMode === 'standard') {
      root.style.setProperty('--profit-color', '#16a34a') // green-600
      root.style.setProperty('--loss-color', '#dc2626') // red-600
      // 下拉列表主题色
      root.style.setProperty('--dropdown-bg', '#ffffff') // 白色背景
      root.style.setProperty('--dropdown-border', '#d1d1d1') // gray-400 - 更明显的边框
      root.style.setProperty('--dropdown-header-bg', '#f9fafb') // gray-50
      root.style.setProperty('--dropdown-header-text', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-text', '#111827') // gray-900
      root.style.setProperty('--dropdown-item-subtext', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-hover', '#f3f4f6') // gray-100
      root.style.setProperty('--dropdown-item-border', '#e5e7eb') // gray-200 - 更明显的分割线
    } else {
      root.style.setProperty('--profit-color', '#dc2626') // red-600
      root.style.setProperty('--loss-color', '#16a34a') // green-600
      // 下拉列表主题色（翻转模式保持一致的UI颜色）
      root.style.setProperty('--dropdown-bg', '#ffffff') // 白色背景
      root.style.setProperty('--dropdown-border', '#d1d1d1') // gray-400 - 更明显的边框
      root.style.setProperty('--dropdown-header-bg', '#f9fafb') // gray-50
      root.style.setProperty('--dropdown-header-text', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-text', '#111827') // gray-900
      root.style.setProperty('--dropdown-item-subtext', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-hover', '#f3f4f6') // gray-100
      root.style.setProperty('--dropdown-item-border', '#e5e7eb') // gray-200 - 更明显的分割线
    }
  }, [colorMode])

  return (
    <div className="fixed-height-container bg-gray-100 min-h-screen">
      <div className="container mx-auto p-6 max-w-full">
        {/* 标题栏和设置按钮 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            <span className="inline-block origin-center rotate-180">J</span>
            <span>J</span> Simulator
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>设置</span>
          </button>
        </div>

        <div className="content-area flex flex-col lg:flex-row gap-6">
          {/* 左侧：参数设置区域 */}
          <div className="lg:w-1/3 left-panel">
            <SimulationParams
              formData={formData}
              setFormData={setFormData}
              loading={loading}
              setLoading={setLoading}
              handleInputChange={handleInputChange}
              handleBasicInfoChange={handleBasicInfoChange}
              isAutoCalculating={isAutoCalculating}
              getChangeColor={getChangeColor}
              runSimulationWithData={runSimulationWithData}
              fundData={fundData}
              setFundData={setFundData}
            />
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
                      <div className={`text-2xl font-bold ${getChangeColor(results.totalPriceChange)}`}>
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
                                <td className={`px-2 py-1 whitespace-nowrap text-sm font-medium ${getChangeColor(day.changePercent)}`}>
                                  {day.changePercent > 0 ? '+' : ''}
                                  {day.changePercent.toFixed(2)}%
                                </td>
                                <td className={`px-2 py-1 whitespace-nowrap text-sm font-medium ${getChangeColor(day.cumulativeChange)}`}>
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

        {/* 设置弹窗 */}
        {showSettings && (
          <div className="settings-modal" onClick={() => setShowSettings(false)}>
            <div className="settings-content" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-700">页面设置</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">颜色模式:</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="colorMode"
                      value="standard"
                      checked={colorMode === 'standard'}
                      onChange={(e) => setColorMode(e.target.value as ColorMode)}
                      className="mr-3"
                    />
                    <span className="text-sm mr-2">标准模式</span>
                    <span className="text-xs text-green-500 mr-2">+1</span>
                    <span className="text-xs text-red-500">-1</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="colorMode"
                      value="reversed"
                      checked={colorMode === 'reversed'}
                      onChange={(e) => setColorMode(e.target.value as ColorMode)}
                      className="mr-3"
                    />
                    <span className="text-sm mr-2">翻转模式</span>
                    <span className="text-xs text-red-500 mr-2">+1</span>
                    <span className="text-xs text-green-500">-1</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 使用提示 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-2">使用说明</h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• 支持基金代码或名称搜索（如：输入"000001"或"华夏成长"）</li>
                <li>• 输入时会自动显示匹配的基金列表供选择</li>
                <li>• 点击⭐图标可收藏常用基金，输入框为空时显示收藏列表</li>
                <li>• 日期格式为YYYYMMDD（如：20230101）</li>
                <li>• 需要启动后端API服务获取真实数据</li>
                <li>
                  • 启动命令：<code className="bg-blue-100 px-1 rounded">python fund_api.py</code>
                </li>
                <li>
                  • API地址：<code className="bg-blue-100 px-1 rounded">http://localhost:8080</code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
