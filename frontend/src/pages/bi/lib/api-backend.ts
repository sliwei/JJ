/**
 * Bili Monitor 后端API调用模块
 * 替代localStorage存储，从MySQL数据库获取数据
 */

import { showLoginModal } from '@/store/global'

import type { DynamicContent, Settings, UP } from '../types'

const API_BASE = '/api/bi'

/**
 * 检查认证状态，如果未登录则弹出登录窗口并抛出错误
 * @param skipAuth 是否跳过认证检查（用于登录接口等）
 */
function checkAuth(skipAuth = false): void {
  if (skipAuth) return

  const token = localStorage.getItem('token')
  if (!token) {
    showLoginModal()
    throw new Error('AUTH_REQUIRED')
  }
}

/**
 * 获取请求头（包含认证信息）
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  const token = localStorage.getItem('token')
  if (token) {
    headers['Authorization'] = token.includes('Bearer') ? token : `Bearer ${token}`
  }

  return headers
}

/**
 * 处理响应，检查认证错误
 */
async function handleResponse<T>(resp: Response): Promise<T> {
  if (resp.status === 401 || resp.status === 403) {
    // 清除登录信息
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // 弹出登录窗口
    showLoginModal()
    // 抛出认证错误
    throw new Error('AUTH_REQUIRED')
  }

  const data = await resp.json()
  if (!data.success) throw new Error(data.error)
  return data.data
}

// ============== Settings API ==============

export async function fetchSettingsFromBackend(): Promise<Settings> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/settings`, {
    headers: getAuthHeaders()
  })
  return handleResponse(resp)
}

export async function saveSettingsToBackend(settings: Settings): Promise<void> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(settings)
  })
  await handleResponse(resp)
}

// ============== UPs API ==============

export async function fetchUPsFromBackend(): Promise<UP[]> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/ups`, {
    headers: getAuthHeaders()
  })
  return handleResponse(resp)
}

export async function addUPToBackend(up: UP): Promise<void> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/ups`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(up)
  })
  await handleResponse(resp)
}

export async function removeUPFromBackend(mid: string): Promise<void> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/ups/${mid}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })
  await handleResponse(resp)
}

export async function searchUPFromBackend(keyword: string): Promise<UP[]> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/ups/search?keyword=${encodeURIComponent(keyword)}`, {
    headers: getAuthHeaders()
  })
  return handleResponse(resp)
}

// ============== Dynamics API ==============

export async function fetchDynamicsFromBackend(mid?: string): Promise<DynamicContent[]> {
  checkAuth()
  const url = mid ? `${API_BASE}/dynamics?mid=${mid}` : `${API_BASE}/dynamics`
  const resp = await fetch(url, {
    headers: getAuthHeaders()
  })
  return handleResponse(resp)
}

export async function fetchDynamicsGrouped(): Promise<Record<string, DynamicContent[]>> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/dynamics/grouped`, {
    headers: getAuthHeaders()
  })
  return handleResponse(resp)
}

// ============== Read Status API ==============

export async function markAsReadOnBackend(id: string, type: 'dynamic' | 'comment' = 'dynamic'): Promise<void> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/read`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ id, type })
  })
  await handleResponse(resp)
}

export async function checkReadStatusOnBackend(id: string): Promise<boolean> {
  checkAuth()
  const resp = await fetch(`${API_BASE}/read/${id}`, {
    headers: getAuthHeaders()
  })
  return handleResponse(resp)
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
