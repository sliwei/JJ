import type { AxiosInstance } from 'axios'
import axios from 'axios'
import { toast } from 'sonner'

import { router } from '@/router'

import { clearLoginInfo } from './tool'

export interface Res<T = unknown> {
  data: T
  success: boolean
  error?: string
}

const service: AxiosInstance = axios.create({
  baseURL: '',
  withCredentials: true,
  timeout: 60000
})

service.interceptors.request.use(
  (config) => {
    const { headers } = config
    if (headers) {
      if (localStorage.token) {
        headers['Authorization'] = localStorage.token.includes('Bearer') ? localStorage.token : `Bearer ${localStorage.token}`
      }
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

service.interceptors.response.use(
  (res) => {
    const contentType = res.headers['content-type'] || ''
    if (
      contentType.startsWith('application/octet-stream') ||
      contentType.startsWith('application/msexcel') ||
      contentType.startsWith('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    ) {
      return Promise.resolve(res)
    }
    return Promise.resolve(res.data)
  },
  (error) => {
    console.log(error?.response)
    if (error?.response?.status === 401 || error?.response?.status === 403) {
      toast.error('登录已过期，请重新登录')
      clearLoginInfo()
      if (router.state.location.pathname !== '/') {
        router.navigate(`/`, {
          state: { from: router.state.location },
          replace: true
        })
      }
      return Promise.reject(error.message)
    }
    if (error.message !== 'canceled') {
      console.log(error?.response?.data?.error || error.message)
    }
    return Promise.reject(error?.response?.data?.error || error.message)
  }
)

export default service
