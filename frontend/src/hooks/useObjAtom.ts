import { PrimitiveAtom, useAtom, useAtomValue } from 'jotai'
import { useCallback, useRef } from 'react'

type Options = Parameters<typeof useAtomValue>[1]

function useObjAtom<S>(atom: PrimitiveAtom<S>, options?: Options) {
  const [state, setState] = useAtom(atom, options)
  const stateRef = useRef(state)
  stateRef.current = state

  const getState = useCallback(() => stateRef.current, [])

  const set = (value: S | ((prev: S) => S)) => {
    setState((prev: S) => {
      const next = typeof value === 'function' ? (value as (prev: S) => S)(prev) : value
      stateRef.current = next as Awaited<S>
      return next
    })
  }

  return { value: state, val: state, set, get: getState }
}

export default useObjAtom
