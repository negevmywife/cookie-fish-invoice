'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthPage() {
  const router = useRouter()

  useEffect(() => {
    // 監聽：只要登入成功，就立刻踢回首頁 (/)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        router.push('/')
      }
    })
    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">🍪 餅乾木魚會員登入</h1>
        <div className="text-gray-400 text-sm text-center mb-6">
          請輸入 Email，密碼隨便設 (記得住就好)
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#2563eb',
                  brandAccent: '#1d4ed8',
                  inputText: 'white',
                  inputLabelText: '#9ca3af',
                  inputBorder: '#4b5563',
                  inputBackground: '#1f2937',
                },
              },
            },
          }}
          providers={[]} 
          localization={{
            variables: {
              sign_in: { email_label: '電子信箱', password_label: '密碼', button_label: '登入' },
              sign_up: { email_label: '電子信箱', password_label: '密碼', button_label: '註冊新帳號' },
            },
          }}
        />
      </div>
    </div>
  )
}