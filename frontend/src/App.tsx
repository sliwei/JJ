import './App.css'

import { useAtom } from 'jotai'
import { useEffect } from 'react'
import { Toaster } from 'sonner'

import { AnimatedRoutes } from '@/router'
import { hideLoginModal, loginModalState } from '@/store/global'

import GlobalLoginModal from './pages/bi/components/LoginModal'

function App() {
  const [showLogin, setShowLogin] = useAtom(loginModalState)

  useEffect(() => {
    console.info(`%c Version %c ${import.meta.env.VITE_APP_TIME} `, 'color: #fff; background: #5f5f5f', 'color: #fff; background: #4bc729')
    if (import.meta.env.VITE_APP_ENV !== 'live') {
      // eruda.init()
    }
  }, [])

  // 页面加载时检查是否需要登录（当前路径是 /bi 时）
  useEffect(() => {
    if (window.location.pathname === '/bi' && !localStorage.getItem('token')) {
      setShowLogin(true)
    }
  }, [setShowLogin])

  return (
    <>
      <AnimatedRoutes />
      <Toaster position="top-center" />

      {/* 全局登录弹窗 */}
      {showLogin && (
        <GlobalLoginModal
          onLoginSuccess={() => {
            hideLoginModal()
            // 刷新当前页面以重新加载数据
            window.location.reload()
          }}
        />
      )}
    </>
  )
}

export default App
