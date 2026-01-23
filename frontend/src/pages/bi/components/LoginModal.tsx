import { Eye, EyeOff, Loader2, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { md5 } from 'js-md5';

interface LoginModalProps {
  onLoginSuccess: (user: { id: number; name: string; username: string }) => void
}

export default function LoginModal({ onLoginSuccess }: LoginModalProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username.trim() || !password.trim()) {
      toast.error('请输入用户名和密码')
      return
    }

    setLoading(true)

    try {
      const resp = await fetch('/api/bi/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password: md5(password.trim()) })
      })

      const data = await resp.json()

      if (!data.success) {
        toast.error(data.error || '登录失败')
        return
      }

      // 保存 token 到 localStorage
      localStorage.setItem('token', data.data.token)
      localStorage.setItem('user', JSON.stringify(data.data.user))

      toast.success('登录成功')
      onLoginSuccess(data.data.user)
    } catch (err) {
      console.error('登录错误:', err)
      toast.error('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4">
        {/* 装饰性背景 */}
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/50 via-purple-500/50 to-pink-500/50 rounded-2xl blur-lg opacity-75" />

        {/* 主卡片 */}
        <div className="relative bg-bg border border-border rounded-2xl p-8 shadow-2xl">
          {/* Logo/标题区域 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 mb-4">
              <span className="text-2xl font-bold text-white">B</span>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">Bili Monitor</h1>
            <p className="text-sm text-text-secondary mt-2">请登录以继续使用</p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 用户名输入 */}
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名"
                disabled={loading}
                className="w-full pl-11 pr-4 py-3 bg-main border border-border rounded-xl text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
              />
            </div>

            {/* 密码输入 */}
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密码"
                disabled={loading}
                className="w-full pl-11 pr-12 py-3 bg-main border border-border rounded-xl text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <span>登 录</span>
              )}
            </button>
          </form>

          {/* 底部装饰文字 */}
          <p className="text-center text-xs text-text-secondary/60 mt-6">B站动态监控 · 实时追踪你关注的UP主</p>
        </div>
      </div>
    </div>
  )
}

