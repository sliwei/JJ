import { AnimatePresence, motion } from 'motion/react'
import { memo, useMemo } from 'react'
import { createBrowserRouter, Navigate, Outlet, RouterProvider, useLocation, useOutlet } from 'react-router'

// import Footer from '@/components/Footer'
// import Header from '@/components/Header'
import { useAuthGuard } from '@/hooks/useAuthGuard'

// 定义动画变体
export const rootVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 20 }
}

// 定义动画变体
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 }
}

// 创建带动画的布局组件
const AnimatedRootLayout = memo(() => {
  const location = useLocation()
  const authGuard = useAuthGuard()

  // 如果 authGuard 返回重定向组件，则渲染它
  if (authGuard) {
    return authGuard
  }
  console.log('location.pathname', location.pathname)
  return (
    <>
      {/* <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={pageVariants.initial}
        animate={pageVariants.animate}
        exit={pageVariants.exit}
        transition={{ duration: 0.3 }}
      > */}
      <Outlet key={location.pathname + location.search} />
      {/* </motion.div>
    </AnimatePresence> */}
    </>
  )
})

// 创建带动画的布局组件
const AnimatedLayout = () => {
  const location = useLocation()

  return (
    <div className="flex flex-col min-h-screen">
      {/* <Header /> */}
      <main className="flex-grow">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={pageVariants.initial}
            animate={pageVariants.animate}
            exit={pageVariants.exit}
            transition={{ duration: 0.3 }}
          >
            <Outlet key={location.pathname} />
          </motion.div>
        </AnimatePresence>
      </main>
      {/* <Footer /> */}
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    Component: AnimatedRootLayout,
    children: [
      {
        path: '/',
        lazy: () => import('@/pages/index')
      }
    ]
  },
  {
    path: '/login',
    lazy: () => import('@/pages/login')
  }
])

export const AnimatedRoutes = memo(() => <RouterProvider router={router} />)
