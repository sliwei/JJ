import { atom, createStore } from 'jotai'

export const myStore = createStore()

export const loginModalState = atom(false)

// 在非 React 环境中控制登录弹窗的辅助函数
export const showLoginModal = () => {
  myStore.set(loginModalState, true)
}

export const hideLoginModal = () => {
  myStore.set(loginModalState, false)
}

// 检查是否已登录
export const isLoggedIn = () => {
  return !!localStorage.getItem('token')
}

// 定义颜色模式类型
export type ColorMode = 'standard' | 'reversed'
export const colorModeState = atom<ColorMode>('reversed')
