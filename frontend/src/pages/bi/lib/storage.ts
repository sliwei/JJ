/**
 * Bili Monitor 存储模块 - 后端API版本
 * 使用后端API替代localStorage
 */

import type { DynamicContent, Settings, UP } from '../types'
import {
  addUPToBackend,
  checkReadStatusOnBackend,
  fetchDynamicsGrouped,
  fetchSettingsFromBackend,
  fetchUPsFromBackend,
  markAsReadOnBackend,
  removeUPFromBackend,
  saveSettingsToBackend
} from './api-backend'

// 本地缓存（用于同步API响应较慢时的UI体验）
let settingsCache: Settings | null = null
let upsCache: UP[] | null = null
let dynamicsCache: Record<string, DynamicContent[]> | null = null
let readIdsCache: Set<string> = new Set()

const DEFAULT_SETTINGS: Settings = {
  cookie: '',
  refreshInterval: 5,
  enableNotifications: true,
  enableDynamicPolling: false,
  dynamicPollingInterval: 5,
  enableCommentPolling: false,
  commentPollingInterval: 5,
  commentTimeRange: 48,
  dingtalkAccessToken: '',
  dingtalkKeyword: '动态'
}

// ============== Settings ==============

export const getSettings = (): Settings => {
  return settingsCache || DEFAULT_SETTINGS
}

export const getSettingsAsync = async (): Promise<Settings> => {
  try {
    settingsCache = await fetchSettingsFromBackend()
    return settingsCache
  } catch (e) {
    console.error('获取设置失败:', e)
    return DEFAULT_SETTINGS
  }
}

export const saveSettings = async (settings: Settings): Promise<void> => {
  try {
    await saveSettingsToBackend(settings)
    settingsCache = settings
  } catch (e) {
    console.error('保存设置失败:', e)
    throw e
  }
}

// ============== UPs ==============

export const getUPs = (): UP[] => {
  return upsCache || []
}

export const getUPsAsync = async (): Promise<UP[]> => {
  try {
    upsCache = await fetchUPsFromBackend()
    return upsCache
  } catch (e) {
    console.error('获取UP列表失败:', e)
    return []
  }
}

export const saveUPs = async (ups: UP[]): Promise<void> => {
  // 这个函数现在不直接使用，因为添加/删除都是单独的API
  upsCache = ups
}

export const addUP = async (up: UP): Promise<void> => {
  try {
    await addUPToBackend(up)
    if (upsCache) {
      const exists = upsCache.find((u) => u.mid === up.mid)
      if (!exists) {
        upsCache = [...upsCache, up]
      }
    }
  } catch (e) {
    console.error('添加UP失败:', e)
    throw e
  }
}

export const removeUP = async (mid: string): Promise<void> => {
  try {
    await removeUPFromBackend(mid)
    if (upsCache) {
      upsCache = upsCache.filter((u) => u.mid !== mid)
    }
  } catch (e) {
    console.error('删除UP失败:', e)
    throw e
  }
}

// ============== Dynamics ==============

export const getStoredDynamics = (): Record<string, DynamicContent[]> => {
  return dynamicsCache || {}
}

export const getStoredDynamicsAsync = async (): Promise<Record<string, DynamicContent[]>> => {
  try {
    dynamicsCache = await fetchDynamicsGrouped()
    return dynamicsCache
  } catch (e) {
    console.error('获取动态失败:', e)
    return {}
  }
}

export const saveStoredDynamics = (dynamics: Record<string, DynamicContent[]>): void => {
  // 后端会自动保存，这里只更新本地缓存
  dynamicsCache = dynamics
}

// ============== Read IDs ==============

export const getReadIds = (): string[] => {
  return Array.from(readIdsCache)
}

export const saveReadIds = (ids: string[]): void => {
  readIdsCache = new Set(ids)
}

export const markAsRead = async (id: string): Promise<void> => {
  try {
    await markAsReadOnBackend(id, 'dynamic')
    readIdsCache.add(id)
  } catch (e) {
    console.error('标记已读失败:', e)
  }
}

export const isMarkedRead = (id: string): boolean => {
  return readIdsCache.has(id)
}

export const isMarkedReadAsync = async (id: string): Promise<boolean> => {
  try {
    const result = await checkReadStatusOnBackend(id)
    if (result) readIdsCache.add(id)
    return result
  } catch {
    return readIdsCache.has(id)
  }
}

// ============== 初始化 ==============

export const initializeFromBackend = async (): Promise<void> => {
  try {
    await Promise.all([getSettingsAsync(), getUPsAsync(), getStoredDynamicsAsync()])
    console.log('✓ 从后端初始化数据完成')
  } catch (e) {
    console.error('从后端初始化数据失败:', e)
  }
}
