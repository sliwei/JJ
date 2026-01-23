/**
 * Bili Monitor 数据服务
 * 轮询由Python后端定时任务自动执行
 * 前端只负责定时从数据库获取数据展示
 */

import type { DynamicContent } from '../types'
import { fetchDynamicsGrouped } from './api-backend'

type Listener = (dynamics: Record<string, DynamicContent[]>) => void

class DataService {
  private refreshTimer: ReturnType<typeof setInterval> | null = null
  private listeners: Set<Listener> = new Set()
  private currentDynamics: Record<string, DynamicContent[]> = {}
  private refreshInterval = 30000 // 默认30秒刷新一次界面数据

  constructor() {
    this.loadData()
  }

  /** 订阅数据更新 */
  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.currentDynamics)
    return () => this.listeners.delete(listener)
  }

  /** 通知所有监听器 */
  private notify() {
    this.listeners.forEach((l) => l(this.currentDynamics))
  }

  /** 设置刷新间隔并启动定时刷新 */
  setRefreshInterval(seconds: number) {
    this.refreshInterval = Math.max(10, seconds) * 1000
    this.startAutoRefresh()
  }

  /** 启动自动刷新 */
  startAutoRefresh() {
    this.stopAutoRefresh()
    this.refreshTimer = setInterval(() => {
      this.loadData()
    }, this.refreshInterval)
  }

  /** 停止自动刷新 */
  stopAutoRefresh() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
  }

  /** 从后端加载最新数据 */
  async loadData() {
    try {
      const newDynamics = await fetchDynamicsGrouped()
      const hasChanges = JSON.stringify(newDynamics) !== JSON.stringify(this.currentDynamics)
      if (hasChanges) {
        this.currentDynamics = newDynamics
        this.notify()
      }
    } catch (e) {
      console.error('获取数据失败:', e)
    }
  }

  /** 手动刷新数据 */
  async refresh() {
    await this.loadData()
  }

  /** 获取当前缓存的动态数据 */
  getDynamics() {
    return this.currentDynamics
  }
}

export const dataService = new DataService()
