'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

// 🛠️ 驗證工具：台灣統一編號 (統編) 邏輯檢查
function isValidTaxId(taxId: string): boolean {
  const regex = /^\d{8}$/;
  if (!regex.test(taxId)) return false;

  const weights = [1, 2, 1, 2, 1, 2, 4, 1];
  let sum = 0;

  for (let i = 0; i < 8; i++) {
    let n = parseInt(taxId[i]) * weights[i];
    sum += Math.floor(n / 10) + (n % 10);
  }

  if (sum % 10 === 0) return true;
  if (taxId[6] === '7' && (sum + 1) % 10 === 0) return true;

  return false;
}

export default function SettingsPage() {
  // 建立 Supabase 連線
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 表單資料狀態
  const [formData, setFormData] = useState({
    merchant_id: '',
    hash_key: '',
    hash_iv: '',
    company_name: '',
    company_tax_id: '',
  });

  // 1. 進來頁面時，先去抓抓看有沒有舊資料
  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth');
        return;
      }

      const { data } = await supabase
        .from('store_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data) {
        setFormData({
          merchant_id: data.merchant_id || '',
          hash_key: data.hash_key || '',
          hash_iv: data.hash_iv || '',
          company_name: data.company_name || '',
          company_tax_id: data.company_tax_id || '',
        });
      }
      setLoading(false);
    };

    fetchData();
  }, [supabase, router]);

  // 2. 處理儲存 (含驗證邏輯)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setErrorMsg('');

    // --- 🛡️ 防呆檢查區 ---
    if (!formData.company_name.trim()) {
      setErrorMsg('❌ 請輸入公司名稱');
      setSaving(false);
      return;
    }
    // ... 前面的檢查 (公司名稱、商店代號) ...

    if (!formData.merchant_id.trim()) {
      setErrorMsg('❌ 請輸入綠界商店代號 (MerchantID)');
      setSaving(false);
      return;
    }

    // 👇 新增這兩段：檢查 Key 和 IV 不能是空的
    if (!formData.hash_key.trim()) {
      setErrorMsg('❌ 請輸入 HashKey (金流金鑰)');
      setSaving(false);
      return;
    }
    if (!formData.hash_iv.trim()) {
      setErrorMsg('❌ 請輸入 HashIV (金流向量)');
      setSaving(false);
      return;
    }

    // ... 後面的統編檢查 ...
    if (formData.company_tax_id) {
        if (!isValidTaxId(formData.company_tax_id)) {
            setErrorMsg('❌ 統一編號格式錯誤！請檢查是否輸入正確');
            setSaving(false);
            return;
        }
    }
    
    // --- 儲存 ---
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('store_settings')
      .upsert({
        user_id: user.id,
        ...formData,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error(error);
      setErrorMsg('❌ 資料庫儲存失敗，請稍後再試');
    } else {
      setMessage('✅ 設定已成功儲存！');
    }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-white flex justify-center">載入中...</div>;

  return (
    <div className="max-w-2xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-8">商店與金流設定</h1>
      
      <form onSubmit={handleSave} className="space-y-6 bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700">
        
        {/* 公司基本資料 */}
        <div className="space-y-4 border-b border-gray-700 pb-6">
          <h2 className="text-xl font-semibold text-blue-400 flex items-center">
            🏢 基本資料
          </h2>
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              公司/商店名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
              className="w-full p-3 rounded bg-gray-900 border border-gray-600 focus:border-blue-500 outline-none"
              placeholder="例如：餅乾木魚工作室"
            />
          </div>
          <div>
            <label className="block text-sm mb-1 text-gray-300">統一編號 (統編)</label>
            <input
              type="text"
              maxLength={8}
              value={formData.company_tax_id}
              onChange={(e) => setFormData({ ...formData, company_tax_id: e.target.value })}
              className="w-full p-3 rounded bg-gray-900 border border-gray-600 focus:border-blue-500 outline-none font-mono"
              placeholder="8碼統編 (選填)"
            />
            <p className="text-xs text-gray-500 mt-1">系統會自動檢查統編邏輯是否正確</p>
          </div>
        </div>

        {/* 綠界金流設定 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-green-400 flex items-center">
            🔌 綠界電子發票串接
          </h2>
          <div className="bg-gray-700/50 p-3 rounded text-sm text-gray-300 border-l-4 border-green-500">
            請登入綠界後台取得以下資訊。測試階段可使用：<br/>
            MerchantID: 2000132
          </div>
          
          <div>
            <label className="block text-sm mb-1 text-gray-300">
              商店代號 (MerchantID) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.merchant_id}
              onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
              className="w-full p-3 rounded bg-gray-900 border border-gray-600 focus:border-green-500 outline-none font-mono"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1 text-gray-300">HashKey</label>
              <input
                type="password"
                value={formData.hash_key}
                onChange={(e) => setFormData({ ...formData, hash_key: e.target.value })}
                className="w-full p-3 rounded bg-gray-900 border border-gray-600 focus:border-green-500 outline-none font-mono"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-gray-300">HashIV</label>
              <input
                type="password"
                value={formData.hash_iv}
                onChange={(e) => setFormData({ ...formData, hash_iv: e.target.value })}
                className="w-full p-3 rounded bg-gray-900 border border-gray-600 focus:border-green-500 outline-none font-mono"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        {/* 訊息與按鈕 */}
        <div className="pt-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm font-bold min-h-[1.5rem]">
            {errorMsg && <span className="text-red-400 bg-red-900/30 px-3 py-1 rounded">{errorMsg}</span>}
            {message && <span className="text-green-400 bg-green-900/30 px-3 py-1 rounded">{message}</span>}
          </div>
          
          <button
            type="submit"
            disabled={saving}
            className={`w-full md:w-auto px-8 py-3 rounded-lg font-bold shadow-md transition-all ${
              saving 
                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            {saving ? '儲存中...' : '確認儲存'}
          </button>
        </div>

      </form>
    </div>
  );
}