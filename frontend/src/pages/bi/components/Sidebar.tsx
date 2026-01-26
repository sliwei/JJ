import { Moon, Plus, Settings as SettingsIcon, Sun, X } from 'lucide-react'
import React from 'react'

import type { UP } from '../types'

interface SidebarProps {
  ups: UP[]
  activeMid: string | null
  unreadCounts: Record<string, number>
  onSelectUP: (mid: string) => void
  onOpenSettings: () => void
  onAddUP: () => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  isOpen?: boolean
  onClose?: () => void
}

const Sidebar: React.FC<SidebarProps> = ({
  ups,
  activeMid,
  unreadCounts,
  onSelectUP,
  onOpenSettings,
  onAddUP,
  theme,
  onToggleTheme,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* 移动端遮罩层 */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-50 md:z-auto
          w-64 md:w-60 h-full
          bg-sidebar border-r border-border
          flex flex-col
          transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
        `}
      >
        <div className="px-3 h-14 border-b border-border flex justify-between items-center">
          <span className="text-lg font-bold text-primary">Bili Monitor</span>
          <div className="flex gap-1">
            <button
              onClick={onToggleTheme}
              title="Toggle Theme"
              className="p-1.5 hover:bg-hover rounded-md transition-colors text-text-secondary"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button
              onClick={onOpenSettings}
              title="Settings"
              className="p-1.5 hover:bg-hover rounded-md transition-colors text-text-secondary"
            >
              <SettingsIcon size={18} />
            </button>
            {/* 移动端关闭按钮 */}
            <button
              onClick={onClose}
              title="关闭"
              className="p-1.5 hover:bg-hover rounded-md transition-colors text-text-secondary md:hidden"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {ups.map((up) => (
            <div
              key={up.mid}
              className={`flex items-center justify-between p-2.5 md:p-2 mb-1.5 rounded-lg cursor-pointer transition-colors duration-200 hover:bg-hover ${activeMid === up.mid ? 'bg-primary/10 border border-primary/40' : 'border border-transparent'}`}
              onClick={() => onSelectUP(up.mid)}
            >
              <div className="flex items-center overflow-hidden">
                <img
                  src={up.face}
                  alt={up.name}
                  className="w-9 md:w-8 h-9 md:h-8 rounded-full mr-2.5 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                />
                <span className="font-medium text-[0.9rem] truncate">{up.name}</span>
              </div>
              {unreadCounts[up.mid] > 0 && (
                <span className="bg-red-500 text-white text-[0.65rem] font-bold px-1.5 py-0.5 rounded-full min-w-4.5 text-center ml-2">
                  {unreadCounts[up.mid] > 99 ? '99+' : unreadCounts[up.mid]}
                </span>
              )}
            </div>
          ))}
          <button
            className="flex items-center justify-center w-full p-2.5 md:p-2 mt-1.5 rounded-lg cursor-pointer transition-colors duration-200 border border-dashed border-border hover:bg-hover text-sm text-text-secondary"
            onClick={onAddUP}
          >
            <Plus size={16} className="mr-1.5" />
            <span>添加用户</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
