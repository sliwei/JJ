import React, { useEffect, useState } from 'react'

import useObjAtom from '@/hooks/useObjAtom'
import { ColorMode, colorModeState } from '@/store/global'

export default function Settings() {
  const [showSettings, setShowSettings] = useState<boolean>(false) // 控制设置弹窗显示
  const colorMode = useObjAtom(colorModeState)

  // 设置CSS变量
  useEffect(() => {
    const root = document.documentElement
    if (colorMode.val === 'standard') {
      root.style.setProperty('--profit-color', '#16a34a') // green-600
      root.style.setProperty('--loss-color', '#dc2626') // red-600
      // 下拉列表主题色
      root.style.setProperty('--dropdown-bg', '#ffffff') // 白色背景
      root.style.setProperty('--dropdown-border', '#d1d1d1') // gray-400 - 更明显的边框
      root.style.setProperty('--dropdown-header-bg', '#f9fafb') // gray-50
      root.style.setProperty('--dropdown-header-text', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-text', '#111827') // gray-900
      root.style.setProperty('--dropdown-item-subtext', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-hover', '#f3f4f6') // gray-100
      root.style.setProperty('--dropdown-item-border', '#e5e7eb') // gray-200 - 更明显的分割线
    } else {
      root.style.setProperty('--profit-color', '#dc2626') // red-600
      root.style.setProperty('--loss-color', '#16a34a') // green-600
      // 下拉列表主题色（翻转模式保持一致的UI颜色）
      root.style.setProperty('--dropdown-bg', '#ffffff') // 白色背景
      root.style.setProperty('--dropdown-border', '#d1d1d1') // gray-400 - 更明显的边框
      root.style.setProperty('--dropdown-header-bg', '#f9fafb') // gray-50
      root.style.setProperty('--dropdown-header-text', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-text', '#111827') // gray-900
      root.style.setProperty('--dropdown-item-subtext', '#6b7280') // gray-500
      root.style.setProperty('--dropdown-item-hover', '#f3f4f6') // gray-100
      root.style.setProperty('--dropdown-item-border', '#e5e7eb') // gray-200 - 更明显的分割线
    }
  }, [colorMode.val])

  return (
    <>
      <button
        onClick={() => setShowSettings(true)}
        className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center space-x-2"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>设置</span>
      </button>
      {showSettings && (
        <div className="settings-modal" onClick={() => setShowSettings(false)}>
          <div className="settings-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700">页面设置</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">颜色模式:</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="colorMode"
                    value="standard"
                    checked={colorMode.val === 'standard'}
                    onChange={(e) => colorMode.set(e.target.value as ColorMode)}
                    className="mr-3"
                  />
                  <span className="text-sm mr-2">标准模式</span>
                  <span className="text-xs text-green-500 mr-2">+1</span>
                  <span className="text-xs text-red-500">-1</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="colorMode"
                    value="reversed"
                    checked={colorMode.val === 'reversed'}
                    onChange={(e) => colorMode.set(e.target.value as ColorMode)}
                    className="mr-3"
                  />
                  <span className="text-sm mr-2">翻转模式</span>
                  <span className="text-xs text-red-500 mr-2">+1</span>
                  <span className="text-xs text-green-500">-1</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
