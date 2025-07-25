import { useEffect, useRef, useState } from 'react'

export default function Index(t?: number) {
  const [state, setState] = useState<boolean>(false)
  const [animationState, setAnimationState] = useState<boolean>(false)
  const timer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const local = !!animationState
    if (local) {
      setState(local)
    } else {
      timer.current && clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setState(local)
      }, t || 350)
    }
    return () => {
      timer.current && clearTimeout(timer.current)
    }
  }, [animationState])

  return [state, animationState, setAnimationState] as const
}
