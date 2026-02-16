'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // 👈 記得引入這個，才能做按鈕跳轉

// 建立 Supabase 連線
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const router = useRouter()
  // 定義資料狀態
  const [invoices, setInvoices] = useState<any[]>([])
  const [buyerName, setBuyerName] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  // 1. 檢查登入狀態與載入發票
  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth') // 沒登入就踢去登入頁
      } else {
        setUser(session.user)
        fetchInvoices()
      }
    }
    checkUser()
  }, [router])

  // 2. 抓取發票列表
  async function fetchInvoices() {
    const { data } = await supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false }) //依照時間新到舊排序
    setInvoices(data || [])
  }

  // 3. 開立發票功能
  async function createInvoice() {
    if (!buyerName || !amount) return
    setIsLoading(true)
    
    if (!user) {
        alert('請先登入！');
        setIsLoading(false);
        return;
    }

    try {
      // 呼叫後端 API (雖然綠界還沒正式通，但我們先寫好邏輯)
      // 如果你還沒寫 API，這段 fetch 會失敗，但沒關係，重點是 UI
      /* const response = await fetch('/api/invoice/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerName, amount: Number(amount) }),
      })
      */

      // 👇 為了讓你現在能看到效果，我們先用「直接存資料庫」的方式 (模擬開票成功)
      // 等 3/2 拿到綠界正式 Key，再換回上面的 API 呼叫
      const fakeInvoiceNumber = 'AB-' + Math.floor(Math.random() * 100000000); // 假號碼

      const { data, error: dbError } = await supabase
        .from('invoices')
        .insert([{ 
            amount_total: Number(amount), 
            buyer_name: buyerName, 
            invoice_number: fakeInvoiceNumber,
            user_id: user.id 
        }])
        .select()
        .single()

      if (dbError) throw dbError

      // 更新畫面
      setInvoices([data, ...invoices])
      setBuyerName('')
      setAmount('')
      alert(`✨ (模擬)開票成功！號碼是：${fakeInvoiceNumber}`)

    } catch (error: any) {
      console.error(error)
      alert('發生錯誤：' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // 4. 登出
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">驗票中...🎫</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 font-sans min-h-screen">
      
      {/* 🟢 頂部使用者資訊列 */}
      <div className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm">
        <div className="text-gray-300 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          Hi, <span className="text-blue-400 font-bold">{user.email}</span> 👋
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-500/10 text-red-400 px-4 py-2 rounded-lg text-sm hover:bg-red-500/20 transition border border-red-500/20"
        >
          登出
        </button>
      </div>

      {/* ✨ 標題區塊：這裡加入了設定按鈕！ ✨ */}
      <div className="flex justify-between items-end mb-6">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-300">
          🍪 餅乾木魚發票機 v0.3
        </h1>
        
        {/* 👇 這就是通往設定頁的按鈕 */}
        <Link 
          href="/settings"
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all border border-gray-600 text-gray-300 text-sm font-medium shadow-sm hover:text-white"
        >
          <span>⚙️</span>
          <span>商店設定</span>
        </Link>
      </div>
      
      {/* 📝 開票表單 */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-700">
        <div className="mb-4">
          <label className="block text-gray-400 mb-2 text-sm">買家名稱</label>
          <input 
            type="text" 
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="例如：王小明"
            className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-600 focus:border-blue-500 outline-none transition"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-400 mb-2 text-sm">發票金額</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="輸入金額"
            className="w-full p-3 rounded-lg bg-gray-900 text-white border border-gray-600 focus:border-blue-500 outline-none transition"
          />
        </div>

        <button 
          onClick={createInvoice}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20 active:scale-95"
        >
          {isLoading ? '處理中...' : '✨ 立即開立發票'}
        </button>
      </div>

      {/* 📜 發票列表 */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold mb-4 text-gray-300 border-l-4 border-blue-500 pl-3">最近開立的發票</h2>
        
        {invoices.length === 0 && (
            <div className="text-gray-500 text-center py-4">目前還沒有發票紀錄喔</div>
        )}

        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg flex justify-between items-center hover:bg-gray-800 transition">
            <div>
              <div className="text-blue-400 font-mono text-sm">{invoice.invoice_number}</div>
              <div className="text-gray-300 font-medium">{invoice.buyer_name}</div>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              ${invoice.amount_total}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}