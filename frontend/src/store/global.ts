import { atom, createStore } from 'jotai'

export const myStore = createStore()

export const loginModalState = atom(false)
