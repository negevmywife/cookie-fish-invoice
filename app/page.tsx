'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const router = useRouter()
  const [invoices, setInvoices] = useState<any[]>([])
  const [buyerName, setBuyerName] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth') // 沒登入？踢去警衛室
      } else {
        setUser(session.user) // 有登入？記下來
        fetchInvoices()
      }
    }
    checkUser()
  }, [router])

  async function fetchInvoices() {
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    setInvoices(data || [])
  }

  async function createInvoice() {
    if (!buyerName || !amount) return
    setIsLoading(true)
    const { error } = await supabase
      .from('invoices')
      .insert([{ 
          amount_total: Number(amount), 
          buyer_name: buyerName, 
          invoice_number: 'AB-' + Math.floor(Math.random() * 10000000)
      }])
    if (error) { console.log(error) } 
    else {
      setBuyerName('')
      setAmount('')
      fetchInvoices()
    }
    setIsLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  if (!user) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">驗票中...🎫</div>
  }

  return (
    <div className="max-w-2xl mx-auto p-10 font-sans min-h-screen">
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

      <h1 className="text-3xl font-bold mb-6 text-center text-white">🍪 餅乾木魚發票機 v0.3</h1>
      
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
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-blue-900/20"
        >
          {isLoading ? '處理中...' : '✨ 立即開立發票'}
        </button>
      </div>

      <div className="space-y-3">
        <h2 className="text-xl font-bold mb-4 text-gray-300 border-l-4 border-blue-500 pl-3">最近開立的發票</h2>
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg flex justify-between items-center hover:bg-gray-800 transition">
            <div>
              <div className="text-blue-400 font-mono text-sm">{invoice.invoice_number}</div>
              <div className="text-gray-300 font-medium">{invoice.buyer_name}</div>
            </div>
            <div className="text-2xl font-bold text-emerald-400">
              ${invoice.amount_total}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}