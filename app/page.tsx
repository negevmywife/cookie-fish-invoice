'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const [invoices, setInvoices] = useState<any[]>([])
  
  // ✨ 新增：用來暫存使用者輸入的資料
  const [buyerName, setBuyerName] = useState('')
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetchInvoices()
  }, [])

  async function fetchInvoices() {
    const { data } = await supabase.from('invoices').select('*').order('created_at', { ascending: false })
    setInvoices(data || [])
  }

  async function createInvoice() {
    // 🛡️ 防呆：沒填資料不能送出
    if (!buyerName || !amount) {
      alert('拜託填一下資料啦！')
      return
    }

    setIsLoading(true)
    const { error } = await supabase
      .from('invoices')
      .insert([
        { 
          amount_total: Number(amount), // 記得轉成數字
          buyer_name: buyerName, 
          invoice_number: 'AB-' + Math.floor(Math.random() * 10000000) // 假裝隨機產生發票號
        },
      ])

    if (error) {
      console.log(error)
      alert('失敗了QQ')
    } else {
      // 🎉 成功後清空表單
      setBuyerName('')
      setAmount('')
      fetchInvoices()
    }
    setIsLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-10 font-sans">
      <h1 className="text-3xl font-bold mb-6 text-center">🍪 餅乾木魚發票機 v0.2</h1>
      
      {/* ✨ 這裡是輸入區 */}
      <div className="bg-gray-800 p-6 rounded-xl shadow-lg mb-8 border border-gray-700">
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">買家名稱</label>
          <input 
            type="text" 
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            placeholder="例如：王小明"
            className="w-full p-2 rounded bg-gray-900 text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-gray-300 mb-2">發票金額</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="輸入金額"
            className="w-full p-2 rounded bg-gray-900 text-white border border-gray-600 focus:border-blue-500 outline-none"
          />
        </div>

        <button 
          onClick={createInvoice}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-500 transition disabled:opacity-50"
        >
          {isLoading ? '開立中...' : '+ 立即開立發票'}
        </button>
      </div>

      {/* 這裡是列表區 */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">📜 最近開立的發票</h2>
        {invoices.map((invoice) => (
          <div key={invoice.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg flex justify-between items-center hover:border-gray-600 transition">
            <div>
              <div className="text-blue-400 font-mono text-sm">{invoice.invoice_number}</div>
              <div className="text-white font-medium">{invoice.buyer_name}</div>
            </div>
            <div className="text-2xl font-bold text-green-400">
              ${invoice.amount_total}
            </div>
          </div>
        ))}
        {invoices.length === 0 && <p className="text-center text-gray-500 mt-10">目前還沒有資料，快去開一張！</p>}
      </div>
    </div>
  )
}