import { useCallback, useEffect, useRef, useState } from 'react'

import Tooltip, { TOOLTIPS } from '@/components/Tooltip'
import { FinalResult, FundData } from '@/utils/stockTradingSimulator'

// 定义基金信息类型
interface FundInfo {
  code: string
  name: string
  net_value: number
  daily_growth: number
}

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
  fundCode?: string
}

// 定义组件 props 类型
interface SimulationParamsProps {
  formData: FormData
  setFormData: React.Dispatch<React.SetStateAction<FormData>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  handleBasicInfoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isAutoCalculating: boolean
  getChangeColor: (value: number) => string
  runSimulationWithData: (customFormData: FormData | null, customFundData: FundData[] | null) => Promise<FinalResult>
  fundData: FundData[] | null
  setFundData: React.Dispatch<React.SetStateAction<FundData[] | null>>
}

// 模拟参数组件
export default function SimulationParams({
  formData,
  setFormData,
  loading,
  setLoading,
  handleInputChange,
  handleBasicInfoChange,
  isAutoCalculating,
  getChangeColor,
  runSimulationWithData,
  fundData,
  setFundData
}: SimulationParamsProps) {
  // 基金搜索相关状态
  const [fundSearchResults, setFundSearchResults] = useState<FundInfo[]>([])
  const [showFundDropdown, setShowFundDropdown] = useState<boolean>(false)
  const [fundSearchLoading, setFundSearchLoading] = useState<boolean>(false)
  const [selectedFund, setSelectedFund] = useState<FundInfo | null>(null)
  const fundSearchRef = useRef<HTMLInputElement | null>(null)
  const fundDropdownRef = useRef<HTMLDivElement | null>(null) // 搜索结果下拉列表的引用
  const favoriteDropdownRef = useRef<HTMLDivElement | null>(null) // 收藏列表下拉框的引用

  // 基金收藏相关状态
  const [favoriteFunds, setFavoriteFunds] = useState<FundInfo[]>([])
  const [showFavorites, setShowFavorites] = useState<boolean>(false)

  // 基金搜索防抖函数
  const debouncedFundSearchRef = useRef<NodeJS.Timeout | null>(null)
  const lastSearchQueryRef = useRef<string>('')

  const searchFunds = async (query: string): Promise<void> => {
    if (!query || query.length < 1) {
      setFundSearchResults([])
      setShowFundDropdown(false)
      return
    }

    // 记录当前搜索的查询词
    lastSearchQueryRef.current = query

    setFundSearchLoading(true)
    try {
      const response = await fetch(`/api/fund_list?query=${encodeURIComponent(query)}&limit=10`)
      const result = await response.json()

      if (result.success) {
        setFundSearchResults(result.data)
        setShowFundDropdown(result.data.length > 0)
      } else {
        console.error('基金搜索失败:', result.error)
        setFundSearchResults([])
        setShowFundDropdown(false)
      }
    } catch (error) {
      console.error('基金搜索请求失败:', error)
      setFundSearchResults([])
      setShowFundDropdown(false)
    } finally {
      setFundSearchLoading(false)
    }
  }

  const debouncedFundSearch = useCallback((query: string): void => {
    // 清除之前的定时器
    if (debouncedFundSearchRef.current) {
      clearTimeout(debouncedFundSearchRef.current)
    }

    // 设置新的定时器
    debouncedFundSearchRef.current = setTimeout(() => {
      searchFunds(query)
    }, 300)
  }, [])

  // 处理基金代码输入变化
  const handleFundCodeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value
    setFormData({
      ...formData,
      fundCode: value
    })

    // 清除之前选择的基金
    setSelectedFund(null)

    if (value.trim() === '') {
      // 输入为空时显示收藏列表
      setFundSearchResults([])
      setShowFundDropdown(false)
      if (favoriteFunds.length > 0) {
        setShowFavorites(true)
      }
    } else {
      // 有输入时隐藏收藏列表，显示搜索结果
      setShowFavorites(false)
      debouncedFundSearch(value)
    }
  }

  // 处理输入框获得焦点
  const handleFundCodeFocus = () => {
    const currentValue = formData.fundCode?.trim() || ''
    if (currentValue === '') {
      // 输入框为空时显示收藏列表
      if (favoriteFunds.length > 0) {
        setTimeout(() => {
          setShowFavorites(true)
          setShowFundDropdown(false)
          setFundSearchResults([])
        }, 0)
      }
    } else {
      // 输入框有内容时恢复之前的搜索结果
      if (fundSearchResults.length > 0 && lastSearchQueryRef.current === currentValue) {
        // 如果搜索结果缓存存在且查询词匹配，直接显示缓存结果
        setShowFundDropdown(true)
        setShowFavorites(false)
      } else {
        // 如果没有缓存的搜索结果或查询词不匹配，重新搜索
        debouncedFundSearch(currentValue)
      }
    }
  }

  // 处理输入框点击事件
  const handleFundCodeClick = () => {
    const currentValue = formData.fundCode?.trim() || ''
    if (currentValue === '') {
      // 输入框为空时显示收藏列表
      if (favoriteFunds.length > 0) {
        setShowFavorites(true)
        setShowFundDropdown(false)
        setFundSearchResults([])
      }
    } else {
      // 输入框有内容时恢复之前的搜索结果
      if (fundSearchResults.length > 0 && lastSearchQueryRef.current === currentValue) {
        // 如果搜索结果缓存存在且查询词匹配，直接显示缓存结果
        setShowFundDropdown(true)
        setShowFavorites(false)
      } else {
        // 如果没有缓存的搜索结果或查询词不匹配，重新搜索
        debouncedFundSearch(currentValue)
      }
    }
  }

  // 处理输入框失去焦点事件
  const handleFundCodeBlur = () => {
    // 失去焦点时不清除搜索结果，只是隐藏下拉框
    // 下拉框的隐藏由点击外部事件处理
  }

  // 选择基金
  const handleFundSelect = (fund: FundInfo): void => {
    setFormData({
      ...formData,
      fundCode: fund.code
    })
    setSelectedFund(fund)
    setShowFundDropdown(false)
    setShowFavorites(false)
    // 不清除搜索结果缓存，以便用户重新聚焦时可以看到之前的搜索结果
  }

  // 初始化收藏列表
  useEffect(() => {
    const savedFavorites = localStorage.getItem('jj_favorite_funds')
    if (savedFavorites) {
      try {
        const favorites = JSON.parse(savedFavorites)
        setFavoriteFunds(favorites)
        console.log('已加载收藏基金:', favorites.length, '个')
      } catch (error) {
        console.error('加载收藏基金失败:', error)
      }
    }
  }, [])

  // 监听搜索结果变化，自动滚动到顶部
  useEffect(() => {
    if (showFundDropdown && fundDropdownRef.current && fundSearchResults.length > 0) {
      // 使用setTimeout确保DOM更新完成后再滚动
      setTimeout(() => {
        if (fundDropdownRef.current) {
          fundDropdownRef.current.scrollTop = 0
        }
      }, 0)
    }
  }, [fundSearchResults, showFundDropdown])

  // 监听收藏列表显示，自动滚动到顶部
  useEffect(() => {
    if (showFavorites && favoriteDropdownRef.current && favoriteFunds.length > 0) {
      // 使用setTimeout确保DOM更新完成后再滚动
      setTimeout(() => {
        if (favoriteDropdownRef.current) {
          favoriteDropdownRef.current.scrollTop = 0
        }
      }, 0)
    }
  }, [showFavorites, favoriteFunds])

  // 保存收藏列表到本地存储
  const saveFavoritesToStorage = (favorites: FundInfo[]): void => {
    try {
      localStorage.setItem('jj_favorite_funds', JSON.stringify(favorites))
    } catch (error) {
      console.error('保存收藏基金失败:', error)
    }
  }

  // 添加收藏
  const addToFavorites = (fund: FundInfo): void => {
    const isAlreadyFavorite = favoriteFunds.some((f: FundInfo) => f.code === fund.code)
    if (!isAlreadyFavorite) {
      const newFavorites = [...favoriteFunds, fund]
      setFavoriteFunds(newFavorites)
      saveFavoritesToStorage(newFavorites)
    }
  }

  // 取消收藏
  const removeFromFavorites = (fundCode: string): void => {
    const newFavorites = favoriteFunds.filter((f: FundInfo) => f.code !== fundCode)
    setFavoriteFunds(newFavorites)
    saveFavoritesToStorage(newFavorites)
  }

  // 检查是否已收藏
  const isFavorite = (fundCode: string): boolean => {
    return favoriteFunds.some((f: FundInfo) => f.code === fundCode)
  }

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (fundSearchRef.current && !fundSearchRef.current.contains(event.target as Node)) {
        // 只隐藏下拉框，不清除搜索结果缓存
        setShowFundDropdown(false)
        setShowFavorites(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // 清空基金输入框
  const handleClearFundCode = (): void => {
    setFormData({
      ...formData,
      fundCode: ''
    })
    setFundSearchResults([])
    setShowFundDropdown(false)
    setShowFavorites(false)
    setSelectedFund(null)
    // 重新聚焦输入框
    setTimeout(() => {
      if (fundSearchRef.current) {
        fundSearchRef.current.focus()
      }
    }, 0)
  }

  // 处理回车键查询数据
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      fetchFundData()
    }
  }

  // 获取基金数据的函数
  const fetchFundData = async (): Promise<void> => {
    if (!formData.fundCode) {
      alert('请输入基金编号')
      return
    }

    setLoading(true)
    try {
      // 构造API请求URL
      const apiUrl = `/api/fund_data?code=${formData.fundCode}&start_date=${formData.startDate || ''}&end_date=${formData.endDate || ''}`

      console.log('正在请求API:', apiUrl)

      const response = await fetch(apiUrl)
      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '获取数据失败')
      }

      const fundDataFromAPI = result.data

      if (!fundDataFromAPI || fundDataFromAPI.length === 0) {
        throw new Error('没有获取到有效数据')
      }

      setFundData(fundDataFromAPI)

      console.log(`获取到 ${fundDataFromAPI.length} 条基金数据，第一条日期: ${fundDataFromAPI[0]?.date}`)

      // 自动运行模拟
      await runSimulationWithData(formData, fundDataFromAPI)
    } catch (error) {
      console.error('获取基金数据失败:', error)
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      alert(`错误信息: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 h-full">
      <h2 className="text-xl font-semibold mb-4 text-gray-700">模拟参数</h2>
      <div className="space-y-3">
        <div className="relative" ref={fundSearchRef}>
          <Tooltip content={TOOLTIPS.fundCode}>
            <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">
              基金编号 <span className="text-xs text-gray-500">（代码或名称）</span>
            </label>
          </Tooltip>
          <div className="relative">
            <input
              ref={fundSearchRef}
              type="text"
              name="fundCode"
              value={formData.fundCode || ''}
              onChange={handleFundCodeChange}
              onFocus={handleFundCodeFocus}
              onBlur={handleFundCodeBlur}
              onClick={handleFundCodeClick}
              onKeyDown={handleKeyDown}
              placeholder="输入基金代码或名称搜索"
              className={`w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                (formData.fundCode && formData.fundCode.trim()) || fundSearchLoading ? 'pr-16' : 'pr-8'
              }`}
              autoComplete="off"
            />

            {/* 加载动画 */}
            {fundSearchLoading && (
              <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
            )}

            {/* 清空按钮 */}
            {formData.fundCode && formData.fundCode.trim() && (
              <button
                onClick={handleClearFundCode}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                title="清空输入"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* 收藏列表下拉框 */}
          {showFavorites && favoriteFunds.length > 0 && (
            <div
              ref={favoriteDropdownRef}
              className="fund-dropdown absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-[600px] overflow-y-auto"
            >
              <div className="dropdown-header px-3 py-2 border-b text-xs font-medium flex items-center">
                <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                我的收藏 ({favoriteFunds.length})
              </div>
              {favoriteFunds.map((fund, index) => (
                <div
                  key={fund.code}
                  className={`dropdown-item px-3 py-2 cursor-pointer border-b last:border-b-0 ${
                    index === favoriteFunds.length - 1 ? 'rounded-b-md' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0" onClick={() => handleFundSelect(fund)}>
                      <div className="text-sm font-medium truncate">
                        {fund.code} - {fund.name}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="dropdown-item-subtext text-xs">净值: {fund.net_value.toFixed(4)}</span>
                        <span className={`text-xs font-medium ${getChangeColor(fund.daily_growth)}`}>
                          {fund.daily_growth >= 0 ? '+' : ''}
                          {fund.daily_growth.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromFavorites(fund.code)
                      }}
                      className="ml-2 p-1 text-gray-400 hover:text-red-500 transition-colors"
                      title="取消收藏"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 搜索结果下拉框 */}
          {showFundDropdown && fundSearchResults.length > 0 && (
            <div
              ref={fundDropdownRef}
              className="fund-dropdown absolute z-50 w-full mt-1 rounded-md shadow-lg max-h-[600px] overflow-y-auto"
            >
              {fundSearchResults.map((fund, index) => (
                <div
                  key={fund.code}
                  className={`dropdown-item px-3 py-2 cursor-pointer border-b last:border-b-0 ${
                    index === 0 ? 'rounded-t-md' : ''
                  } ${index === fundSearchResults.length - 1 ? 'rounded-b-md' : ''}`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0" onClick={() => handleFundSelect(fund)}>
                      <div className="text-sm font-medium truncate">
                        {fund.code} - {fund.name}
                      </div>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="dropdown-item-subtext text-xs">净值: {fund.net_value.toFixed(4)}</span>
                        <span className={`text-xs font-medium ${getChangeColor(fund.daily_growth)}`}>
                          {fund.daily_growth >= 0 ? '+' : ''}
                          {fund.daily_growth.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        if (isFavorite(fund.code)) {
                          removeFromFavorites(fund.code)
                        } else {
                          addToFavorites(fund)
                        }
                      }}
                      className={`ml-2 p-1 transition-colors ${
                        isFavorite(fund.code) ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-yellow-500'
                      }`}
                      title={isFavorite(fund.code) ? '取消收藏' : '添加收藏'}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 显示选中的基金信息 */}
          {selectedFund && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-xs text-blue-800">
                <span className="font-medium">{selectedFund.name}</span>
                <span className="ml-2 text-blue-600">净值: {selectedFund.net_value.toFixed(4)}</span>
                <span className={`ml-2 font-medium ${selectedFund.daily_growth >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {selectedFund.daily_growth >= 0 ? '+' : ''}
                  {selectedFund.daily_growth.toFixed(2)}%
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Tooltip content={TOOLTIPS.startDate}>
              <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">开始日期</label>
            </Tooltip>
            <input
              type="text"
              name="startDate"
              value={formData.startDate || ''}
              onChange={handleBasicInfoChange}
              onKeyDown={handleKeyDown}
              placeholder="20230101"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Tooltip content={TOOLTIPS.endDate}>
              <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">结束日期</label>
            </Tooltip>
            <input
              type="text"
              name="endDate"
              value={formData.endDate || ''}
              onChange={handleBasicInfoChange}
              onKeyDown={handleKeyDown}
              placeholder="20231231"
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate())
                const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
                const startDate = oneMonthAgo.toISOString().slice(0, 10).replace(/-/g, '')
                setFormData({
                  ...formData,
                  startDate,
                  endDate
                })
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              1个月
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const threeMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
                const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
                const startDate = threeMonthsAgo.toISOString().slice(0, 10).replace(/-/g, '')
                setFormData({
                  ...formData,
                  startDate,
                  endDate
                })
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              3个月
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const oneYearAgo = new Date(today.getFullYear() - 1, today.getMonth(), today.getDate())
                const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
                const startDate = oneYearAgo.toISOString().slice(0, 10).replace(/-/g, '')
                setFormData({
                  ...formData,
                  startDate,
                  endDate
                })
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              1年
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const fiveYearsAgo = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate())
                const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
                const startDate = fiveYearsAgo.toISOString().slice(0, 10).replace(/-/g, '')
                setFormData({
                  ...formData,
                  startDate,
                  endDate
                })
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              5年
            </button>
            <button
              type="button"
              onClick={() => {
                const today = new Date()
                const endDate = today.toISOString().slice(0, 10).replace(/-/g, '')
                setFormData({
                  ...formData,
                  startDate: '',
                  endDate
                })
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors col-span-2"
            >
              成立以来
            </button>
          </div>
        </div>

        <div>
          <button
            onClick={fetchFundData}
            disabled={loading || !formData.fundCode}
            className="w-full bg-green-600 text-white py-1.5 px-3 text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
          >
            {loading ? '获取数据中...' : '获取基金数据'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Tooltip content={TOOLTIPS.totalCapital}>
              <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">总额</label>
            </Tooltip>
            <input
              type="number"
              name="totalCapital"
              value={formData.totalCapital}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Tooltip content={TOOLTIPS.buyAmountPerPoint}>
              <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">每份额买入额</label>
            </Tooltip>
            <input
              type="number"
              name="buyAmountPerPoint"
              value={formData.buyAmountPerPoint}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Tooltip content={TOOLTIPS.minBuyDropPercent} showIcon={true}>
              <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">最小买入跌幅 (%)</label>
            </Tooltip>
            <input
              type="number"
              step="0.1"
              name="minBuyDropPercent"
              value={formData.minBuyDropPercent}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <Tooltip content={TOOLTIPS.sellThreshold} showIcon={true}>
              <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">卖出阈值 (%)</label>
            </Tooltip>
            <input
              type="number"
              name="sellThreshold"
              value={formData.sellThreshold}
              onChange={handleInputChange}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <Tooltip content={TOOLTIPS.sellRatio}>
            <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">卖出比例 (%)</label>
          </Tooltip>
          <input
            type="number"
            name="sellRatio"
            value={formData.sellRatio}
            onChange={handleInputChange}
            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <Tooltip content={TOOLTIPS.useRounding} showIcon={true}>
            <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">份额计算方式</label>
          </Tooltip>
          <div className="space-y-1">
            <label className="flex items-center">
              <input
                type="radio"
                name="useRounding"
                value="true"
                checked={formData.useRounding === true}
                onChange={(e) => {
                  const newFormData = { ...formData, useRounding: e.target.value === 'true' }
                  setFormData(newFormData)
                  handleInputChange({
                    target: { name: 'useRounding', value: (e.target.value === 'true').toString() }
                  } as React.ChangeEvent<HTMLInputElement>)
                }}
                className="mr-2"
              />
              <span className="text-xs mr-2">四舍五入</span>
              <span className="text-xs text-gray-500">跌幅按最小跌幅四舍五入计算份额</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="useRounding"
                value="false"
                checked={formData.useRounding === false}
                onChange={(e) => {
                  const newFormData = { ...formData, useRounding: e.target.value === 'true' }
                  setFormData(newFormData)
                  handleInputChange({
                    target: { name: 'useRounding', value: (e.target.value === 'true').toString() }
                  } as React.ChangeEvent<HTMLInputElement>)
                }}
                className="mr-2"
              />
              <span className="text-xs mr-2">向下取整</span>
              <span className="text-xs text-gray-500">跌幅按大于等于最小跌幅计算份额</span>
            </label>
          </div>
        </div>

        <div>
          <button
            onClick={() => {
              if (!fundData || fundData.length === 0) {
                alert('请先获取基金数据')
                return
              }
              runSimulationWithData(formData, fundData)
            }}
            disabled={loading || isAutoCalculating || !fundData || fundData.length === 0}
            className="w-full bg-blue-600 text-white py-1.5 px-3 text-sm rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              '运行中...'
            ) : isAutoCalculating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                自动计算中...
              </>
            ) : (
              '执行'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
