import type { DynamicContent, Settings, UP } from '../types'

const STORAGE_KEYS = {
  SETTINGS: 'bili_monitor_settings',
  UPS: 'bili_monitor_ups',
  DYNAMICS: 'bili_monitor_dynamics',
  READ_IDS: 'bili_monitor_read_ids'
}

const DEFAULT_SETTINGS: Settings = {
  cookie: '',
  refreshInterval: 5,
  enableNotifications: true,
  useMock: true,
  enableDynamicPolling: false,
  dynamicPollingInterval: 5,
  enableCommentPolling: false,
  commentPollingInterval: 5, // 5 minutes
  commentTimeRange: 48, // 48 hours
  dingtalkAccessToken: '',
  dingtalkKeyword: '动态'
}

export const getSettings = (): Settings => {
  const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS)
  return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS
}

export const saveSettings = (settings: Settings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
}

export const getUPs = (): UP[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.UPS)
  return saved ? JSON.parse(saved) : []
}

export const saveUPs = (ups: UP[]) => {
  localStorage.setItem(STORAGE_KEYS.UPS, JSON.stringify(ups))
}

export const addUP = (up: UP) => {
  const ups = getUPs()
  if (!ups.find((u) => u.mid === up.mid)) {
    saveUPs([...ups, up])
  }
}

export const removeUP = (mid: string) => {
  const ups = getUPs()
  saveUPs(ups.filter((u) => u.mid !== mid))
}

export const getStoredDynamics = (): Record<string, DynamicContent[]> => {
  const saved = localStorage.getItem(STORAGE_KEYS.DYNAMICS)
  return saved ? JSON.parse(saved) : {}
}

export const saveStoredDynamics = (dynamics: Record<string, DynamicContent[]>) => {
  localStorage.setItem(STORAGE_KEYS.DYNAMICS, JSON.stringify(dynamics))
}

export const getReadIds = (): string[] => {
  const saved = localStorage.getItem(STORAGE_KEYS.READ_IDS)
  return saved ? JSON.parse(saved) : []
}

export const saveReadIds = (ids: string[]) => {
  localStorage.setItem(STORAGE_KEYS.READ_IDS, JSON.stringify(ids))
}

export const markAsRead = (id: string) => {
  const ids = getReadIds()
  if (!ids.includes(id)) {
    saveReadIds([...ids, id])
  }
}

export const isMarkedRead = (id: string): boolean => {
  const ids = getReadIds()
  return ids.includes(id)
}
