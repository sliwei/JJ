import './App.css'

import { useEffect } from 'react'

import { AnimatedRoutes } from '@/router'

function App() {
  useEffect(() => {
    console.info(`%c Version %c ${import.meta.env.VITE_APP_TIME} `, 'color: #fff; background: #5f5f5f', 'color: #fff; background: #4bc729')
    if (import.meta.env.VITE_APP_ENV !== 'live') {
      // eruda.init()
    }
  }, [])
  return (
    <>
      <AnimatedRoutes />
    </>
  )
}

export default App
