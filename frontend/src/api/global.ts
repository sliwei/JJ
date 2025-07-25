import request, { Res } from '@/utils/request'

// {
//     "cache_time": "2025-07-25 15:24:07",
//     "data": [
//         {
//             "code": "100016",
//             "daily_growth": 0.5,
//             "name": "富国天源沪港深平衡混合A",
//             "net_value": 0,
//             "total_value": 0
//         },

//     ],
//     "returned_count": 10,
//     "success": true,
//     "total_count": 19542
// }

export interface FundItem {
  code: string
  name: string
  net_value: number
  daily_growth: number
  total_value: number
}

export interface FundListRes {
  cache_time: string
  funds: FundItem[]
  returned_count: number
  total_count: number
}

export const getFundList = (query: string) => {
  return request.get<Res<FundListRes>, Res<FundListRes>>(
    `${import.meta.env.VITE_APP_API1}/api/fund_list?query=${encodeURIComponent(query)}&limit=10`
  )
}

export interface FundDataItem {
  date: string
  daily_growth: number
  net_value: number
}

export interface FundDataRes {
  count: number
  end_date: string
  fund_code: string
  list: FundDataItem[]
  start_date: string
}

export const getFundData = ({ fundCode, startDate, endDate }: { fundCode: string; startDate?: string; endDate?: string }) => {
  return request.get<Res<FundDataRes>, Res<FundDataRes>>(
    `${import.meta.env.VITE_APP_API1}/api/fund_data?code=${fundCode}&start_date=${startDate || ''}&end_date=${endDate || ''}`
  )
}
