import { useMemo } from 'react'
import { Navigate, useLocation } from 'react-router'

import { clearLoginInfo } from '@/utils/tool'

const filterPath = ['/xxx', '/xxx', '/xxx']

export const useAuthGuard = () => {
  const location = useLocation()
  return useMemo(() => {
    const isAuthenticated = Boolean(localStorage.token && localStorage.cid)
    const isProtectedPath = filterPath.includes(location.pathname)

    if (!isAuthenticated && isProtectedPath) {
      clearLoginInfo()
      return <Navigate to="/" state={{ from: location }} replace />
    }

    return null
  }, [location])
}
