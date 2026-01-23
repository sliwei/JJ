/**
 * Bili Monitor 后端API调用模块
 * 替代localStorage存储，从MySQL数据库获取数据
 */

import type { DynamicContent, Settings, UP } from '../types'

const API_BASE = '/api/bi'

// ============== Settings API ==============

export async function fetchSettingsFromBackend(): Promise<Settings> {
  const resp = await fetch(`${API_BASE}/settings`)
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

export async function saveSettingsToBackend(settings: Settings): Promise<void> {
  const resp = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
}

// ============== UPs API ==============

export async function fetchUPsFromBackend(): Promise<UP[]> {
  const resp = await fetch(`${API_BASE}/ups`)
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

export async function addUPToBackend(up: UP): Promise<void> {
  const resp = await fetch(`${API_BASE}/ups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(up)
  })
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
}

export async function removeUPFromBackend(mid: string): Promise<void> {
  const resp = await fetch(`${API_BASE}/ups/${mid}`, {
    method: 'DELETE'
  })
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
}

export async function searchUPFromBackend(keyword: string): Promise<UP[]> {
  const resp = await fetch(`${API_BASE}/ups/search?keyword=${encodeURIComponent(keyword)}`)
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ============== Dynamics API ==============

export async function fetchDynamicsFromBackend(mid?: string): Promise<DynamicContent[]> {
  const url = mid ? `${API_BASE}/dynamics?mid=${mid}` : `${API_BASE}/dynamics`
  const resp = await fetch(url)
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

export async function fetchDynamicsGrouped(): Promise<Record<string, DynamicContent[]>> {
  const resp = await fetch(`${API_BASE}/dynamics/grouped`)
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ============== Read Status API ==============

export async function markAsReadOnBackend(id: string, type: 'dynamic' | 'comment' = 'dynamic'): Promise<void> {
  const resp = await fetch(`${API_BASE}/read`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, type })
  })
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
}

export async function checkReadStatusOnBackend(id: string): Promise<boolean> {
  const resp = await fetch(`${API_BASE}/read/${id}`)
  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.isRead
}

// ============== Health Check ==============

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/health`)
    const data = await resp.json()
    return data.success && data.status === 'healthy'
  } catch {
    return false
  }
}
