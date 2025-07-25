import { toast } from 'sonner'

import Tooltip, { TOOLTIPS } from '@/components/Tooltip'
import { FinalResult, FundData } from '@/utils/stockTradingSimulator'

import { FormData } from '../..'

// 定义组件 props 类型
interface SimulationParamsProps {
  formData: FormData
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  isAutoCalculating: boolean
  runSimulationWithData: (customFormData: FormData | null, customFundData: FundData[] | null) => Promise<FinalResult>
  fundData: FundData[] | null
}

// 模拟参数组件
export default function SimulationParams({
  formData,
  loading,
  handleInputChange,
  isAutoCalculating,
  runSimulationWithData,
  fundData
}: SimulationParamsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Tooltip content={TOOLTIPS.totalCapital}>
            <label className="block text-xs font-medium text-gray-700 mb-1 cursor-help">总额</label>
          </Tooltip>
          <input
            type="number"
            name="totalCapital"
            value={formData.totalCapital}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runSimulationWithData(formData, fundData)
              }
            }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runSimulationWithData(formData, fundData)
              }
            }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runSimulationWithData(formData, fundData)
              }
            }}
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                runSimulationWithData(formData, fundData)
              }
            }}
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
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              runSimulationWithData(formData, fundData)
            }
          }}
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
              value={1}
              checked={formData.useRounding === 1}
              onChange={(e) => {
                handleInputChange({
                  target: { name: 'useRounding', value: e.target.value.toString() }
                } as React.ChangeEvent<HTMLInputElement>)
                setTimeout(() => runSimulationWithData(formData, fundData), 300)
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
              value={0}
              checked={formData.useRounding === 0}
              onChange={(e) => {
                handleInputChange({
                  target: { name: 'useRounding', value: e.target.value.toString() }
                } as React.ChangeEvent<HTMLInputElement>)
                setTimeout(() => runSimulationWithData(formData, fundData), 300)
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
              toast.warning('请先获取基金数据')
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
    </>
  )
}
