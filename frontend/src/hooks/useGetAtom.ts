import { Atom, useAtom, useAtomValue } from 'jotai'
import { useCallback, useRef } from 'react'

export type SetterOrUpdater<T> = (valOrUpdater: ((currVal: T) => T) | T) => void

export function useGetAtom<S>(atomState: Atom<S>): [Awaited<S>, SetterOrUpdater<S>, () => Awaited<S>] {
  const [state, setState] = useAtom(atomState)
  const stateRef = useRef(state)
  stateRef.current = state

  const getState = useCallback(() => stateRef.current, [])

  return [state, setState, getState]
}

export function useGetAtomValue<S>(atomState: Atom<S>): [Awaited<S>, () => Awaited<S>] {
  const state = useAtomValue(atomState)
  const stateRef = useRef(state)
  stateRef.current = state

  const getState = useCallback(() => stateRef.current, [])

  return [state, getState]
}

export function useGetSetAtom<S>(atomState: Atom<S>): [SetterOrUpdater<S>, () => Awaited<S>] {
  const [state, setState] = useAtom(atomState)
  const stateRef = useRef(state)
  stateRef.current = state

  const getState = useCallback(() => stateRef.current, [])

  return [setState, getState]
}
