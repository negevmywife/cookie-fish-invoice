'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Turnstile } from '@marsidev/react-turnstile' // 引入驗證碼元件

// 建立 Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null) // 存驗證碼 Token
  const [message, setMessage] = useState('')

  // 檢查是否已登入，是就踢回首頁
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.push('/')
    }
    checkUser()
  }, [router])

  // 處理登入
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // 1. 檢查有沒有通過人類驗證
    if (!captchaToken) {
      setMessage('❌ 請先完成人類驗證！')
      setLoading(false)
      return
    }

    // 2. 向 Supabase 發送登入請求 (附帶驗證碼 Token)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken }, // <--- 關鍵！這把鑰匙交給後端檢查
    })

    if (error) {
      setMessage('登入失敗：' + error.message)
      // 失敗通常要重置驗證碼，這裡簡單起見先不管，使用者可以手動重整
    } else {
      router.push('/') // 成功就進去
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">🍪 餅乾木魚登入</h1>
        <p className="text-gray-400 text-center mb-6 text-sm">請輸入 Email 與密碼 (我們已啟用機器人防護)</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-1 text-sm">電子信箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded bg-gray-900 text-white border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-gray-400 mb-1 text-sm">密碼</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded bg-gray-900 text-white border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {/* Cloudflare Turnstile 驗證區塊 */}
          <div className="flex justify-center py-2">
            <Turnstile 
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!} 
              onSuccess={(token) => setCaptchaToken(token)} // 驗證成功，拿到 Token
            />
          </div>

          {message && (
            <div className="p-3 bg-red-500/20 border border-red-500/50 rounded text-red-200 text-sm text-center">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '驗證中...' : '登入'}
          </button>
        </form>
      </div>
    </div>
  )
}