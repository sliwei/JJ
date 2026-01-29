import { useAtomValue } from 'jotai'
import { Bell, Menu, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { loginModalState } from '@/store/global'

import DynamicCard from './components/DynamicCard'
import SettingsPage from './components/SettingsPage'
import Sidebar from './components/Sidebar'
import { dataService } from './lib/polling'
import { getSettings, getStoredDynamics, getUPs, getUPsAsync, markAsRead, saveStoredDynamics } from './lib/storage'
import type { Comment, DynamicContent, Settings, UP } from './types'

export function Component() {
  const [ups, setUps] = useState<UP[]>(getUPs())
  const [settings, setSettings] = useState<Settings>(getSettings())
  const [activeMid, setActiveMid] = useState<string | null>(null)
  const [dynamicsMap, setDynamicsMap] = useState<Record<string, DynamicContent[]>>(getStoredDynamics())
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // 使用全局登录弹窗状态，判断是否已登录
  const showLoginModal = useAtomValue(loginModalState)
  const isLoggedIn = !!localStorage.getItem('token') && !showLoginModal

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark'
  })
  const [onlyShowUP, setOnlyShowUP] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // 页面加载时从后端获取用户列表（仅在登录后）
  useEffect(() => {
    if (!isLoggedIn) return

    getUPsAsync()
      .then((upsFromBackend) => {
        if (upsFromBackend.length > 0) {
          setUps(upsFromBackend)
        }
      })
      .catch((err) => {
        // AUTH_REQUIRED 错误会由 api-backend 自动触发登录弹窗
        console.error('获取 UP 列表失败:', err?.message)
      })
  }, [isLoggedIn])

  // Subscribe to DataService（仅在登录后）
  useEffect(() => {
    if (!isLoggedIn) return

    // 启动自动刷新（30秒从后端获取最新数据）
    dataService.setRefreshInterval(30)

    const unsubscribe = dataService.subscribe((dynamics) => {
      setDynamicsMap(dynamics)
    })

    return () => {
      unsubscribe()
      dataService.stopAutoRefresh()
    }
  }, [isLoggedIn])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const handleManualRefresh = () => {
    dataService.refresh()
  }

  const handleMarkRead = (id: string, isDynamic: boolean = true) => {
    markAsRead(id, isDynamic ? 'dynamic' : 'comment')

    // Optimistic update of local state
    setDynamicsMap((prev) => {
      const next = { ...prev }
      for (const mid in next) {
        next[mid] = next[mid].map((d) => {
          if (d.id === id) {
            return { ...d, isRead: true }
          }
          if (d.comments) {
            const updateComments = (comments: Comment[]): Comment[] => {
              return comments.map((c) => {
                if (c.id === id) return { ...c, isRead: true }
                if (c.replies) return { ...c, replies: updateComments(c.replies) }
                return c
              })
            }
            return { ...d, comments: updateComments(d.comments) }
          }
          return d
        })
      }
      // Persist to storage to ensure polling service picks up the change if it reads existing data
      saveStoredDynamics(next)
      return next
    })
  }

  /** 一键已读某动态下所有评论后的本地状态更新（API 由 DynamicCard 内调用） */
  const handleCommentsMarkedRead = (dynamicId: string) => {
    const markAllCommentsRead = (comments: Comment[]): Comment[] =>
      comments.map((c) => ({
        ...c,
        isRead: true,
        ...(c.replies?.length ? { replies: markAllCommentsRead(c.replies) } : {})
      }))

    setDynamicsMap((prev) => {
      const next = { ...prev }
      for (const mid in next) {
        next[mid] = next[mid].map((d) =>
          d.id === dynamicId && d.comments?.length ? { ...d, comments: markAllCommentsRead(d.comments) } : d
        )
      }
      saveStoredDynamics(next)
      return next
    })
  }

  const activeUP = ups.find((u) => u.mid === activeMid)

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    ups.forEach((up) => {
      let count = 0
      const dynamics = dynamicsMap[up.mid] || []
      dynamics.forEach((d) => {
        if (!d.isRead) count++

        const countComments = (comments: Comment[]) => {
          comments.forEach((c) => {
            if (c.userName === up.name && !c.isRead) count++
            if (c.replies) countComments(c.replies)
          })
        }
        if (d.comments) countComments(d.comments)
      })
      counts[up.mid] = count
    })
    return counts
  }, [dynamicsMap, ups])

  // 更新浏览器标签页标题显示未读消息数
  useEffect(() => {
    const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0)
    document.title = totalUnread > 0 ? `(${totalUnread}) Bili Monitor` : 'Bili Monitor'
  }, [unreadCounts])

  return (
    <div className={`bi-page ${theme} flex h-screen w-screen bg-bg text-text-primary overflow-hidden`}>
      <Sidebar
        ups={ups}
        activeMid={activeMid}
        unreadCounts={unreadCounts}
        onSelectUP={(mid) => {
          setActiveMid(mid)
          setIsSidebarOpen(false)
        }}
        onOpenSettings={() => {
          setIsSettingsOpen(true)
          setIsSidebarOpen(false)
        }}
        onAddUP={() => {
          setIsSettingsOpen(true)
          setIsSidebarOpen(false)
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <main className="flex-1 flex flex-col bg-main w-full md:w-auto">
        <header className="h-14 px-3 md:px-5 flex justify-between items-center bg-glass backdrop-blur-md border-b border-border z-10">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 mr-2 rounded-lg hover:bg-hover active:scale-95 transition md:hidden"
              title="打开菜单"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-[0.95rem] md:text-[1.1rem] font-bold truncate max-w-[140px] md:max-w-none">
              {activeUP ? `${activeUP.name} 的动态` : '请选择 UP 主'}
            </h2>
            <button
              onClick={handleManualRefresh}
              className="ml-2 md:ml-3 p-1.5 rounded-full hover:bg-hover active:scale-95 transition"
              title="手动刷新动态"
            >
              <RefreshCw size={16} />
            </button>
            <label className="ml-2 md:ml-4 flex items-center gap-1 md:gap-1.5 text-xs md:text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyShowUP}
                onChange={(e) => setOnlyShowUP(e.target.checked)}
                className="w-3.5 h-3.5 accent-primary cursor-pointer"
              />
              <span className="text-text-secondary">只看UP</span>
            </label>
          </div>
          <div className="flex gap-3">{settings.enableNotifications && <Bell size={18} className="text-primary" />}</div>
        </header>

        <section className="flex-1 overflow-y-auto p-3 md:p-4 relative">
          {!activeMid && <div className="text-center mt-20 text-text-secondary text-sm">请在左侧选择一个 UP 主，或点击设置添加</div>}

          {ups.map((up) => {
            const upDynamics = dynamicsMap[up.mid] || []
            const isActive = activeMid === up.mid

            return (
              <div key={up.mid} style={{ display: isActive ? 'block' : 'none' }} className="w-full">
                {upDynamics.length > 0 ? (
                  upDynamics.map((dyn) => (
                    <DynamicCard
                      key={dyn.id}
                      dynamic={dyn}
                      upName={up.name}
                      onMarkRead={handleMarkRead}
                      onCommentsMarkedRead={handleCommentsMarkedRead}
                      onlyShowUP={onlyShowUP}
                    />
                  ))
                ) : (
                  <div className="text-center mt-20 text-text-secondary text-sm">暂无动态，请检查设置并确保轮询已开启</div>
                )}
              </div>
            )
          })}
        </section>
      </main>

      {isSettingsOpen && (
        <SettingsPage
          onClose={() => {
            setIsSettingsOpen(false)
            setUps(getUPs())
            setSettings(getSettings())
            // 刷新数据以显示最新内容
            dataService.refresh()
          }}
        />
      )}
    </div>
  )
}

export default Component
