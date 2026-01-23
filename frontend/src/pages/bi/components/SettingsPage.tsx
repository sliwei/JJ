import { Loader2, Save, Search, Trash2, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { searchUPFromBackend } from '../lib/api-backend'
import { addUP, getSettingsAsync, getUPsAsync, removeUP, saveSettings } from '../lib/storage'
import type { Settings, UP } from '../types'

interface SettingsPageProps {
  onClose: () => void
}

const SettingsPage: React.FC<SettingsPageProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [ups, setUps] = useState<UP[]>([])
  const [keyword, setKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<UP[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // 初始化加载数据
  useEffect(() => {
    const loadData = async () => {
      const [settingsData, upsData] = await Promise.all([getSettingsAsync(), getUPsAsync()])
      setSettings(settingsData)
      setUps(upsData)
    }
    loadData()
  }, [])

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)
    try {
      await saveSettings(settings)
      toast.success('设置已保存')
      onClose()
    } catch (e) {
      toast.error('保存失败: ' + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleSearch = async () => {
    if (!keyword) return
    setLoading(true)
    try {
      const results = await searchUPFromBackend(keyword)
      setSearchResults(results)
    } catch (e) {
      toast.error('搜索失败: ' + (e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUP = async (up: UP) => {
    if (ups.find((u) => u.mid === up.mid)) {
      toast.error('已在列表中')
      return
    }
    try {
      await addUP(up)
      setUps([...ups, up])
      toast.success('已添加')
    } catch (e) {
      toast.error('添加失败')
    }
  }

  const handleRemoveUP = async (mid: string) => {
    try {
      await removeUP(mid)
      setUps(ups.filter((u) => u.mid !== mid))
    } catch (e) {
      toast.error('删除失败')
    }
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-100 flex items-center justify-center">
        <Loader2 className="animate-spin text-white" size={32} />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-100 flex items-center justify-center p-0 md:p-4">
      <div className="bg-sidebar w-full md:w-11/12 max-w-220 h-full md:h-[85vh] flex flex-col md:rounded-2xl overflow-hidden relative shadow-2xl">
        <button
          className="absolute right-3 md:right-5 top-3 md:top-5 z-10 p-2 hover:bg-hover rounded-full transition-colors text-text-secondary"
          onClick={onClose}
          title="Close"
        >
          <X size={24} />
        </button>

        <div className="px-4 md:px-8 py-4 md:py-6 overflow-y-auto flex-1 custom-scrollbar">
          <h2 className="text-lg md:text-xl font-bold mb-4 md:mb-6 text-center text-text-primary">设置</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-4 md:mb-5">
            <section className="bg-card p-4 md:p-5 rounded-xl border border-border">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 text-primary">基础配置</h3>
              <div className="mb-4">
                <label className="block mb-1.5 text-[0.8rem] md:text-[0.85rem] font-medium text-text-primary">Bilibili Cookie</label>
                <textarea
                  className="w-full p-2 md:p-2.5 bg-black/10 border border-border rounded-lg text-text-primary text-sm outline-none focus:border-primary transition-colors resize-none"
                  value={settings.cookie}
                  onChange={(e) => setSettings({ ...settings, cookie: e.target.value })}
                  rows={3}
                  placeholder="SESSDATA=..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notify-toggle"
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({ ...settings, enableNotifications: e.target.checked })}
                  className="mr-2 md:mr-2.5 w-4 h-4 accent-primary"
                />
                <label htmlFor="notify-toggle" className="text-[0.8rem] md:text-[0.85rem] cursor-pointer text-text-primary">
                  开启浏览器消息通知
                </label>
              </div>
            </section>

            <section className="bg-card p-4 md:p-5 rounded-xl border border-border">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 text-primary">轮训任务配置</h3>

              <div className="mb-4 pb-4 border-b border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[0.8rem] md:text-[0.85rem] font-medium text-text-primary">动态轮训</label>
                  <input
                    type="checkbox"
                    className="toggle accent-primary w-4 h-4"
                    checked={settings.enableDynamicPolling}
                    onChange={(e) => setSettings({ ...settings, enableDynamicPolling: e.target.checked })}
                  />
                </div>
                {settings.enableDynamicPolling && (
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-xs text-text-secondary">间隔 (分钟)</span>
                    <input
                      type="number"
                      min="1"
                      className="w-16 md:w-20 p-1.5 bg-black/10 border border-border rounded text-center text-sm"
                      value={settings.dynamicPollingInterval}
                      onChange={(e) => setSettings({ ...settings, dynamicPollingInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                    />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[0.8rem] md:text-[0.85rem] font-medium text-text-primary">评论轮训</label>
                  <input
                    type="checkbox"
                    className="toggle accent-primary w-4 h-4"
                    checked={settings.enableCommentPolling}
                    onChange={(e) => setSettings({ ...settings, enableCommentPolling: e.target.checked })}
                  />
                </div>
                {settings.enableCommentPolling && (
                  <div className="space-y-2 md:space-y-3">
                    <div className="flex items-center gap-2 md:gap-3">
                      <span className="text-xs text-text-secondary w-20 md:w-24">间隔 (分钟)</span>
                      <input
                        type="number"
                        min="1"
                        className="w-16 md:w-20 p-1.5 bg-black/10 border border-border rounded text-center text-sm"
                        value={settings.commentPollingInterval}
                        onChange={(e) => setSettings({ ...settings, commentPollingInterval: Math.max(1, parseInt(e.target.value) || 1) })}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="text-xs text-text-secondary w-20 md:w-24">时间范围 (小时)</span>
                      <input
                        type="number"
                        min="1"
                        className="w-16 md:w-20 p-1.5 bg-black/10 border border-border rounded text-center text-sm"
                        value={settings.commentTimeRange}
                        onChange={(e) => setSettings({ ...settings, commentTimeRange: Math.max(1, parseInt(e.target.value) || 1) })}
                      />
                      <span className="text-[0.65rem] md:text-[0.7rem] text-text-secondary">只获取此时间内的动态评论</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="bg-card p-4 md:p-5 rounded-xl border border-border md:col-span-2">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 text-primary">钉钉 Webhook 通知</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div>
                  <label className="block mb-1.5 text-[0.8rem] md:text-[0.85rem] font-medium text-text-primary">Access Token</label>
                  <input
                    type="text"
                    className="w-full p-2 md:p-2.5 bg-black/10 border border-border rounded-lg text-text-primary text-sm outline-none focus:border-primary transition-colors"
                    value={settings.dingtalkAccessToken}
                    onChange={(e) => setSettings({ ...settings, dingtalkAccessToken: e.target.value })}
                    placeholder="留空则不发送钉钉通知"
                  />
                  <p className="text-[0.65rem] md:text-[0.7rem] text-text-secondary mt-1">从钉钉机器人 Webhook URL 中获取</p>
                </div>
                <div>
                  <label className="block mb-1.5 text-[0.8rem] md:text-[0.85rem] font-medium text-text-primary">安全关键词</label>
                  <input
                    type="text"
                    className="w-full p-2 md:p-2.5 bg-black/10 border border-border rounded-lg text-text-primary text-sm outline-none focus:border-primary transition-colors"
                    value={settings.dingtalkKeyword}
                    onChange={(e) => setSettings({ ...settings, dingtalkKeyword: e.target.value })}
                    placeholder="动态"
                  />
                  <p className="text-[0.65rem] md:text-[0.7rem] text-text-secondary mt-1">钉钉机器人安全设置中配置的关键词</p>
                </div>
              </div>
            </section>
          </div>

          <button
            className="w-full py-2.5 text-white! rounded-lg font-semibold text-sm transition-all hover:opacity-90 active:scale-95 bg-primary! flex items-center justify-center gap-1.5 mb-6 md:mb-8 shadow-lg shadow-primary/20 disabled:opacity-50"
            onClick={handleSaveSettings}
            disabled={saving}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? '保存中...' : '保存所有配置'}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <section className="bg-card p-4 md:p-5 rounded-xl mb-4 md:mb-5 border border-border flex flex-col h-64 md:h-80">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 text-primary">搜索并添加 UP</h3>
              <div className="mb-3 md:mb-4 flex gap-2">
                <input
                  type="text"
                  className="flex-1 p-2 md:p-2.5 bg-black/10 border border-border rounded-lg text-text-primary text-sm outline-none focus:border-primary transition-colors"
                  placeholder="输入昵称关键词"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={loading}
                />
                <button
                  className="p-2 md:p-2.5 bg-hover text-text-primary rounded-lg transition-all hover:opacity-90 active:scale-95"
                  onClick={handleSearch}
                  disabled={loading || !keyword}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {searchResults.map((up) => (
                  <div
                    key={up.mid}
                    className="flex items-center p-2 md:p-2.5 mb-1.5 rounded-lg bg-black/5 border border-transparent hover:border-border/50 transition-colors"
                  >
                    <img src={up.face} className="w-8 h-8 rounded-full mr-2 md:mr-2.5 object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[0.8rem] md:text-[0.85rem] truncate text-text-primary">{up.name}</div>
                      <div className="text-[0.65rem] md:text-[0.7rem] text-text-secondary">MID: {up.mid}</div>
                    </div>
                    <button
                      className="px-2 md:px-2.5 py-1 bg-primary text-white rounded-md text-[0.7rem] md:text-[0.75rem] ml-1.5 hover:opacity-90 transition-opacity"
                      onClick={() => handleAddUP(up)}
                    >
                      添加
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-card p-4 md:p-5 rounded-xl mb-4 md:mb-5 border border-border flex flex-col h-64 md:h-80">
              <h3 className="text-sm md:text-base font-semibold mb-3 md:mb-4 text-primary">已添加列表</h3>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {ups.length === 0 && <div className="text-text-secondary text-center py-10 text-sm">暂无 UP</div>}
                {ups.map((up) => (
                  <div key={up.mid} className="flex items-center p-2 md:p-2.5 mb-1.5 rounded-lg transition-colors hover:bg-hover">
                    <img src={up.face} className="w-8 h-8 rounded-full mr-2 md:mr-2.5 object-cover" referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[0.8rem] md:text-[0.85rem] truncate text-text-primary">{up.name}</div>
                      <div className="text-[0.65rem] md:text-[0.7rem] text-text-secondary">MID: {up.mid}</div>
                    </div>
                    <button
                      onClick={() => handleRemoveUP(up.mid)}
                      className="text-red-500 hover:text-red-600 transition-colors shrink-0 ml-1.5 hover:bg-red-500/10 p-1.5 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SettingsPage
