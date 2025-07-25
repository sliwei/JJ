import { message } from 'antd'
import type { AxiosInstance } from 'axios'
import axios from 'axios'

import { router } from '@/router'

import { clearLoginInfo, headerInfo } from './tool'

export interface Res<T = unknown> {
  code: 0 | 1 | 200 | 577 | 578
  data: T
  msg: string
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
      headers['deviceId'] = headerInfo.deviceId
      headers['deviceType'] = headerInfo.deviceType
      headers['appVersion'] = headerInfo.appVersion
      headers['deviceBrowser'] = headerInfo.deviceBrowser
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
      message.error(error?.response?.data?.msg || '登录超时，请重新登录！')
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
      console.log(error?.response?.data?.msg || error.message)
    }
    return Promise.reject(error?.response?.data?.msg || error.message)
  }
)

export default service
