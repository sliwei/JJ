/**
 * 股票买入卖出模拟脚本
 * 规则：
 * - 本金20万
 * - 每跌1个点买入5000元
 * - 涨时不操作
 * - 本金消耗完毕后，总涨幅超过5个点卖出
 */

class StockTradingSimulator {
    constructor() {
        this.originalCapital = 50000; // 最初本金20万
        this.currentStageCapital = 50000; // 当前阶段本金
        this.remainingCapital = 50000; // 剩余本金
        this.buyAmountPerPoint = 500; // 每跌1个点买入5000元
        this.sellThreshold = 5; // 卖出阈值：总涨幅超过5个点

        this.positions = []; // 持仓记录 [{price: 买入价格, amount: 买入金额, shares: 股数}]
        this.currentPrice = 1; // 假设初始股价为100元
        this.totalInvested = 0; // 总投入金额
        this.tradingLog = []; // 交易日志
        this.stage = 1; // 当前投资阶段
        this.stageResults = []; // 各阶段结果记录
        this.dayCounter = 0; // 交易日计数器
        this.dailyTradeInfo = ''; // 当日交易信息

        console.log(`初始化完成：第${this.stage}阶段，本金 ${this.currentStageCapital} 元，初始股价 ${this.currentPrice} 元`);
    }
    
    /**
     * 处理单日涨跌幅
     * @param {number} changePercent 当日涨跌幅度（百分比，如 -2.5 表示跌2.5%）
     */
    processDailyChange(changePercent) {
        // 增加交易日计数器
        this.dayCounter++;

        // 重置当日交易信息
        this.dailyTradeInfo = '';

        // 更新当前股价
        const previousPrice = this.currentPrice;
        this.currentPrice = previousPrice * (1 + changePercent / 100);

        // 如果下跌且还有本金，则买入
        if (changePercent < 0 && this.remainingCapital > 0) {
            this.buyStock(Math.abs(changePercent));
        }

        // 如果本金消耗完毕，检查是否满足卖出条件
        if (this.remainingCapital <= 0) {
            this.checkSellCondition();
        }

        // 记录当日状态
        this.logDailyStatus(changePercent);
    }
    
    /**
     * 买入股票
     * @param {number} dropPercent 下跌百分比
     */
    buyStock(dropPercent) {
        // 计算买入金额：每跌1个点买入5000元
        const buyAmount = Math.floor(dropPercent) * this.buyAmountPerPoint;

        // 检查剩余本金是否足够
        const actualBuyAmount = Math.min(buyAmount, this.remainingCapital);

        if (actualBuyAmount > 0) {
            // 计算买入股数
            const shares = actualBuyAmount / this.currentPrice;

            // 记录持仓
            this.positions.push({
                price: this.currentPrice,
                amount: actualBuyAmount,
                shares: shares
            });

            // 更新资金状态
            this.remainingCapital -= actualBuyAmount;
            this.totalInvested += actualBuyAmount;

            // 记录当日交易信息
            this.dailyTradeInfo = `买入${actualBuyAmount}元`;

            // 记录交易日志
            this.tradingLog.push({
                type: 'BUY',
                price: this.currentPrice,
                amount: actualBuyAmount,
                shares: shares,
                remainingCapital: this.remainingCapital
            });
        }
    }
    
    /**
     * 检查卖出条件
     */
    checkSellCondition() {
        if (this.positions.length === 0) return;

        // 计算平均买入价格
        const totalShares = this.positions.reduce((sum, pos) => sum + pos.shares, 0);
        const totalAmount = this.positions.reduce((sum, pos) => sum + pos.amount, 0);
        const avgBuyPrice = totalAmount / totalShares;

        // 计算当前涨幅
        const currentGainPercent = ((this.currentPrice - avgBuyPrice) / avgBuyPrice) * 100;

        // 如果涨幅超过5个点，卖出所有持仓
        if (currentGainPercent > this.sellThreshold) {
            this.sellAllPositions(totalShares, avgBuyPrice);
        }
    }
    
    /**
     * 卖出所有持仓
     * @param {number} totalShares 总股数
     * @param {number} avgBuyPrice 平均买入价格
     */
    sellAllPositions(totalShares, avgBuyPrice) {
        const sellAmount = totalShares * this.currentPrice;
        const profit = sellAmount - this.totalInvested;
        const profitPercent = (profit / this.totalInvested) * 100;
        const stageReturn = ((sellAmount - this.currentStageCapital) / this.currentStageCapital) * 100;

        // 记录当日交易信息
        this.dailyTradeInfo = `卖出${sellAmount.toFixed(0)}元(盈利${profit.toFixed(0)}元)`;

        // 记录本阶段结果
        this.stageResults.push({
            stage: this.stage,
            initialCapital: this.currentStageCapital,
            totalInvested: this.totalInvested,
            sellAmount: sellAmount,
            profit: profit,
            profitPercent: profitPercent,
            stageReturn: stageReturn,
            avgBuyPrice: avgBuyPrice,
            sellPrice: this.currentPrice
        });

        // 记录交易日志
        this.tradingLog.push({
            type: 'SELL_ALL',
            stage: this.stage,
            price: this.currentPrice,
            shares: totalShares,
            amount: sellAmount,
            profit: profit,
            profitPercent: profitPercent,
            stageReturn: stageReturn
        });

        // 开始新阶段
        this.startNewStage(sellAmount);
    }

    /**
     * 开始新的投资阶段
     * @param {number} newCapital 新阶段的本金
     */
    startNewStage(newCapital) {
        this.stage += 1;
        this.currentStageCapital = newCapital;
        this.remainingCapital = newCapital;
        this.positions = [];
        this.totalInvested = 0;
    }
    
    /**
     * 记录每日状态
     * @param {number} changePercent 当日涨跌幅
     */
    logDailyStatus(changePercent) {
        const totalShares = this.positions.reduce((sum, pos) => sum + pos.shares, 0);
        const currentValue = totalShares * this.currentPrice;
        const totalAssets = this.remainingCapital + currentValue;

        // 计算当前涨幅
        let currentGainPercent = 0;
        if (totalShares > 0) {
            const totalAmount = this.positions.reduce((sum, pos) => sum + pos.amount, 0);
            const avgBuyPrice = totalAmount / totalShares;
            currentGainPercent = ((this.currentPrice - avgBuyPrice) / avgBuyPrice) * 100;
        }

        // 构建输出信息
        let logMessage = `第${this.dayCounter}天 当日涨幅: ${changePercent.toFixed(2)}%, 当前涨幅: ${currentGainPercent.toFixed(2)}%, 持仓金额: ${currentValue.toFixed(0)}元, 总资产: ${totalAssets.toFixed(0)}元`;

        // 如果有交易信息，添加到日志中
        if (this.dailyTradeInfo) {
            logMessage += ` [${this.dailyTradeInfo}]`;
        }

        console.log(logMessage);
    }
    
    /**
     * 模拟交易
     * @param {number[]} dailyChanges 每日涨跌幅数组
     */
    simulate(dailyChanges) {
        console.log(`开始模拟交易，共 ${dailyChanges.length} 个交易日`);

        dailyChanges.forEach((change) => {
            this.processDailyChange(change);
        });

        // 输出最终结果
        this.printFinalResult();
    }
    
    /**
     * 输出最终结果
     */
    printFinalResult() {
        const totalShares = this.positions.reduce((sum, pos) => sum + pos.shares, 0);
        const currentValue = totalShares * this.currentPrice;
        const totalAssets = this.remainingCapital + currentValue;
        const totalReturn = totalAssets - this.originalCapital;
        const returnPercent = (totalReturn / this.originalCapital) * 100;

        // 计算总涨跌幅
        const totalPriceChange = ((this.currentPrice - 1) / 1) * 100; // 从初始价格1元开始

        // 输出交易统计
        const sellTrades = this.tradingLog.filter(log => log.type === 'SELL_ALL');
        const totalTradeProfit = sellTrades.reduce((sum, trade) => sum + trade.profit, 0);

        console.log(`\n=== 最终总结 ===`);
        console.log(`股价总涨跌幅: ${totalPriceChange.toFixed(2)}%`);
        console.log(`总盈亏金额: ${totalReturn.toFixed(2)}元 (${returnPercent.toFixed(2)}%)`);
        console.log(`交易盈利: ${totalTradeProfit.toFixed(2)}元`);
        console.log(`买入次数: ${this.tradingLog.filter(log => log.type === 'BUY').length}, 卖出次数: ${sellTrades.length}`);
    }
}

// 使用示例
function runSimulation() {
    // 从data.json文件读取测试数据
    const fs = require('fs');
    const path = require('path');

    try {
        const dataPath = path.join(__dirname, 'data3.json');
        const dailyChanges = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        console.log(`从data.json读取到 ${dailyChanges.length} 个交易日的数据`);

        const simulator = new StockTradingSimulator();
        simulator.simulate(dailyChanges);
    } catch (error) {
        console.error('读取data.json文件失败:', error.message);
        console.log('使用默认示例数据进行模拟...');

        // 备用示例数据
        const dailyChanges = [
            -2.5, -1.8, -3.2, 1.5, -1.2, -2.1, -1.5, 2.3, -1.8, -2.8,
            -1.1, 3.2, -2.5, -1.9, 4.1, -1.3, -2.7, 1.8, -1.6, 5.5,
            -1.4, -2.2, 2.1, -1.7, -3.1, 1.9, -2.3, -1.8, 4.8, 6.2
        ];

        const simulator = new StockTradingSimulator();
        simulator.simulate(dailyChanges);
    }
}

// 如果直接运行此文件，执行模拟
if (require.main === module) {
    runSimulation();
}

module.exports = StockTradingSimulator;
