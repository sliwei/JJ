import type { Dispatch, SetStateAction } from 'react'
import { useCallback, useRef, useState } from 'react'

type GetStateAction<S> = () => S

function useObjState<S>(initialState: S | (() => S)): {
  value: S
  val: S
  set: Dispatch<SetStateAction<S>>
  get: GetStateAction<S>
}
function useObjState<S = undefined>(): {
  value: S | undefined
  set: Dispatch<SetStateAction<S | undefined>>
  get: GetStateAction<S | undefined>
}
function useObjState<S>(initialState?: S) {
  const [state, setState] = useState(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const getState = useCallback(() => stateRef.current, [])

  const set = (value: SetStateAction<S | undefined>) => {
    setState((prev) => {
      const next = typeof value === 'function' ? (value as (prev: S | undefined) => S | undefined)(prev) : value
      stateRef.current = next
      return next
    })
  }

  return { value: state, val: state, set, get: getState }
}

export default useObjState
