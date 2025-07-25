// 定义接口
export interface Position {
  price: number
  amount: number
  shares: number
}

export interface TradingLogEntry {
  type: 'BUY' | 'SELL_PARTIAL'
  price: number
  amount: number
  shares: number
  buyShares?: number
  dropPercent?: number
  remainingCapital?: number
  profit?: number
  sellRatio?: number
  avgBuyPrice?: number
  sellPrice?: number
}

export interface DailyResult {
  date: string
  changePercent: number
  cumulativeChange: number
  currentGainPercent: number
  holdingValue: number
  holdingValueDetail: string
  totalAssets: number
  tradeInfo: string
  currentPrice: number
  remainingCapital: number
}

export interface FundData {
  daily_growth: number
  date: string
  net_value: number
}

export interface FinalResult {
  totalPriceChange: number
  totalReturn: number
  returnPercent: number
  totalTradeProfit: number
  buyCount: number
  sellCount: number
  dailyResults: DailyResult[]
  maxHoldingValue: number
}

// JJ Simulator类
export default class StockTradingSimulator {
  private originalCapital: number
  private remainingCapital: number
  private buyAmountPerPoint: number
  private minBuyDropPercent: number
  private useRounding: boolean
  private sellThreshold: number
  private sellRatio: number
  private positions: Position[]
  private currentPrice: number
  private totalInvested: number
  private tradingLog: TradingLogEntry[]
  private dailyTradeInfo: string
  private dailyResults: DailyResult[]
  private maxHoldingValue: number

  constructor(
    totalCapital: number,
    buyAmountPerPoint: number,
    minBuyDropPercent: number,
    useRounding: boolean,
    sellThreshold: number,
    sellRatio: number
  ) {
    this.originalCapital = totalCapital
    this.remainingCapital = totalCapital
    this.buyAmountPerPoint = buyAmountPerPoint
    this.minBuyDropPercent = minBuyDropPercent
    this.useRounding = useRounding
    this.sellThreshold = sellThreshold
    this.sellRatio = sellRatio

    this.positions = []
    this.currentPrice = 1
    this.totalInvested = 0
    this.tradingLog = []
    this.dailyTradeInfo = ''
    this.dailyResults = []
    this.maxHoldingValue = 0 // 记录历史最大持仓金额
  }

  processDailyChange(changePercent: number, date: string, _netValue: number): void {
    this.dailyTradeInfo = ''
    // 基于涨跌幅累积计算价格，而不是直接使用净值
    this.currentPrice = this.currentPrice * (1 + changePercent / 100)

    if (changePercent < 0 && this.remainingCapital > 0) {
      this.buyStock(Math.abs(changePercent))
    }

    if (changePercent > 0) {
      this.checkSellCondition()
    }

    this.logDailyStatus(changePercent, date)
  }

  buyStock(dropPercent: number): void {
    // 计算买入份额
    let buyShares = 0

    if (this.useRounding) {
      // 四舍五入模式：按最小跌幅四舍五入计算份额
      buyShares = Math.round(dropPercent / this.minBuyDropPercent)
    } else {
      // 非四舍五入模式：按大于等于计算份额
      buyShares = Math.floor(dropPercent / this.minBuyDropPercent)
    }

    // 计算实际买入额
    const buyAmount = buyShares * this.buyAmountPerPoint
    const actualBuyAmount = Math.min(buyAmount, this.remainingCapital)

    if (actualBuyAmount > 0 && buyShares > 0) {
      const shares = actualBuyAmount / this.currentPrice

      this.positions.push({
        price: this.currentPrice,
        amount: actualBuyAmount,
        shares: shares
      })

      this.remainingCapital -= actualBuyAmount
      this.totalInvested += actualBuyAmount
      this.dailyTradeInfo = `买入${buyShares}份额(${actualBuyAmount.toFixed(0)})`

      this.tradingLog.push({
        type: 'BUY',
        price: this.currentPrice,
        amount: actualBuyAmount,
        shares: shares,
        buyShares: buyShares,
        dropPercent: dropPercent,
        remainingCapital: this.remainingCapital
      })
    }
  }

  checkSellCondition(): void {
    if (this.positions.length === 0) return

    const totalShares = this.positions.reduce((sum: number, pos: Position) => sum + pos.shares, 0)
    const totalAmount = this.positions.reduce((sum: number, pos: Position) => sum + pos.amount, 0)
    const avgBuyPrice = totalAmount / totalShares
    const currentGainPercent = ((this.currentPrice - avgBuyPrice) / avgBuyPrice) * 100

    if (currentGainPercent > this.sellThreshold) {
      this.sellPositions(totalShares, avgBuyPrice)
    }
  }

  sellPositions(totalShares: number, avgBuyPrice: number): void {
    const sellShares = totalShares * (this.sellRatio / 100)
    const sellAmount = sellShares * this.currentPrice
    const soldInvestment = (sellShares / totalShares) * this.totalInvested
    const profit = sellAmount - soldInvestment

    const profitText = profit >= 0 ? `盈利${profit.toFixed(0)}` : `亏损${Math.abs(profit).toFixed(0)}`
    this.dailyTradeInfo = `卖出${this.sellRatio}%(${sellAmount.toFixed(0)},${profitText})`

    // 按比例减少持仓
    this.positions = this.positions
      .map((pos: Position) => ({
        ...pos,
        shares: pos.shares * (1 - this.sellRatio / 100),
        amount: pos.amount * (1 - this.sellRatio / 100)
      }))
      .filter((pos: Position) => pos.shares > 0.01)

    this.remainingCapital += sellAmount
    this.totalInvested -= soldInvestment

    this.tradingLog.push({
      type: 'SELL_PARTIAL',
      price: this.currentPrice,
      shares: sellShares,
      amount: sellAmount,
      profit: profit,
      sellRatio: this.sellRatio,
      avgBuyPrice: avgBuyPrice,
      sellPrice: this.currentPrice
    })
  }

  logDailyStatus(changePercent: number, date: string): void {
    const totalShares = this.positions.reduce((sum: number, pos: Position) => sum + pos.shares, 0)
    const currentValue = totalShares * this.currentPrice
    const totalAssets = this.remainingCapital + currentValue

    // 更新历史最大持仓金额
    if (currentValue > this.maxHoldingValue) {
      this.maxHoldingValue = currentValue
    }

    let currentGainPercent = 0
    let holdingValueDetail = ''
    let todayBuyAmount = 0
    let todaySellAmount = 0

    // 获取今日买入额
    if (this.dailyTradeInfo.includes('买入')) {
      const match = this.dailyTradeInfo.match(/买入.*?\((\d+)\)/)
      if (match) {
        todayBuyAmount = parseFloat(match[1])
      }
    }

    // 获取今日卖出额（实际卖出的额，不是盈亏）
    if (this.dailyTradeInfo.includes('卖出')) {
      const match = this.dailyTradeInfo.match(/卖出.*?\((\d+)/)
      if (match) {
        todaySellAmount = parseFloat(match[1])
      }
    }

    // 计算昨日持仓额
    let yesterdayHoldingValue = 0
    if (this.dailyResults.length > 0) {
      const yesterdayResult = this.dailyResults[this.dailyResults.length - 1]
      if (yesterdayResult) {
        yesterdayHoldingValue = yesterdayResult.holdingValue
      }
    }

    // 计算当日盈亏（基于价格变化）
    let todayGainLoss = 0
    if (yesterdayHoldingValue > 0 && changePercent !== 0) {
      todayGainLoss = yesterdayHoldingValue * (changePercent / 100)
    }

    if (totalShares > 0) {
      const totalAmount = this.positions.reduce((sum: number, pos: Position) => sum + pos.amount, 0)
      const avgBuyPrice = totalAmount / totalShares
      currentGainPercent = ((this.currentPrice - avgBuyPrice) / avgBuyPrice) * 100
    }

    // 构建详细信息
    if (currentValue > 0 || todayBuyAmount > 0 || todaySellAmount > 0) {
      const detailParts = []

      // 昨日持仓（灰色）- 第一天显示为0
      const baseValue = this.dailyResults.length === 0 ? 0 : yesterdayHoldingValue
      detailParts.push(`<span class="text-gray-500">本${baseValue.toFixed(0)}</span>`)

      // 当日盈亏（根据设置颜色显示）
      if (todayGainLoss !== 0) {
        const gainLossSign = todayGainLoss >= 0 ? ' + ' : ' - '
        const gainLossClass = todayGainLoss >= 0 ? 'profit-color' : 'loss-color'
        const gainLossText = todayGainLoss >= 0 ? `赚${todayGainLoss.toFixed(0)}` : `亏${Math.abs(todayGainLoss).toFixed(0)}`
        detailParts.push(`${gainLossSign}<span class="${gainLossClass}">${gainLossText}</span>`)
      }

      // 今日买入（紫色）
      if (todayBuyAmount > 0) {
        detailParts.push(` + <span class="text-blue-600">买${todayBuyAmount.toFixed(0)}</span>`)
      }

      // 今日卖出（紫色）
      if (todaySellAmount > 0) {
        detailParts.push(` - <span class="text-blue-600">卖${todaySellAmount.toFixed(0)}</span>`)
      }

      if (detailParts.length > 0) {
        holdingValueDetail = `(${detailParts.join('')})`
      }
    }

    // 计算累计涨跌幅
    const cumulativeChange = ((this.currentPrice - 1) / 1) * 100

    this.dailyResults.push({
      date: date,
      changePercent: changePercent,
      cumulativeChange: cumulativeChange,
      currentGainPercent: currentGainPercent,
      holdingValue: currentValue,
      holdingValueDetail: holdingValueDetail,
      totalAssets: totalAssets,
      tradeInfo: this.dailyTradeInfo,
      currentPrice: this.currentPrice,
      remainingCapital: this.remainingCapital
    })
  }

  simulate(fundDataArray: FundData[]): FinalResult {
    // 重置所有状态变量，确保每次模拟都从初始状态开始
    this.remainingCapital = this.originalCapital
    this.positions = []
    this.currentPrice = 1
    this.totalInvested = 0
    this.tradingLog = []
    this.dailyTradeInfo = ''
    this.dailyResults = []
    this.maxHoldingValue = 0 // 重置历史最大持仓金额

    fundDataArray.forEach((fundData: FundData) => {
      this.processDailyChange(fundData.daily_growth, fundData.date, fundData.net_value)
    })
    return this.getFinalResult()
  }

  getFinalResult(): FinalResult {
    const totalShares = this.positions.reduce((sum: number, pos: Position) => sum + pos.shares, 0)
    const currentValue = totalShares * this.currentPrice
    const totalAssets = this.remainingCapital + currentValue
    const totalReturn = totalAssets - this.originalCapital

    // 修改收益率计算方式：基于历史最大持仓金额计算
    let returnPercent = 0
    if (this.maxHoldingValue > 0) {
      returnPercent = (totalReturn / this.maxHoldingValue) * 100
    } else {
      // 如果没有持仓记录，使用原来的计算方式
      returnPercent = (totalReturn / this.originalCapital) * 100
    }

    const totalPriceChange = ((this.currentPrice - 1) / 1) * 100

    const sellTrades = this.tradingLog.filter((log: TradingLogEntry) => log.type === 'SELL_PARTIAL')
    const totalTradeProfit = sellTrades.reduce((sum: number, trade: TradingLogEntry) => sum + (trade.profit || 0), 0)

    return {
      totalPriceChange,
      totalReturn,
      returnPercent,
      totalTradeProfit,
      buyCount: this.tradingLog.filter((log: TradingLogEntry) => log.type === 'BUY').length,
      sellCount: sellTrades.length,
      dailyResults: this.dailyResults,
      maxHoldingValue: this.maxHoldingValue // 返回最大持仓金额供显示
    }
  }
}
