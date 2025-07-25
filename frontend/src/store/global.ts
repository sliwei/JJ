import { atom, createStore } from 'jotai'

export const myStore = createStore()

export const loginModalState = atom(false)
// 定义颜色模式类型
export type ColorMode = 'standard' | 'reversed'
export const colorModeState = atom<ColorMode>('reversed')
