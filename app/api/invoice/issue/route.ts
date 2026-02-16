import { NextResponse } from 'next/server';
import crypto from 'crypto';

// ==========================================
// 👇 綠界電子發票核心引擎 (Hash 保留空值版)
// ==========================================
class ECPayInvoice {
  private merchantID: string;
  private hashKey: string;
  private hashIV: string;

  constructor(merchantID: string, hashKey: string, hashIV: string) {
    this.merchantID = merchantID;
    this.hashKey = hashKey;
    this.hashIV = hashIV;
  }

  // 1. 產生 CheckMacValue
  public genCheckMacValue(params: Record<string, any>): string {
    const filteredParams: Record<string, string> = {};
    const ignoreKeys = ['CheckMacValue'];

    // ⚠️ 成功邏輯：Hash 內容必須與 Payload 一致
    // 我們在 Payload 會送出完整的 CarrierNum，所以 Hash 也要算進去。
    // 至於其他空字串 (如 Identifier)，我們保留著以防萬一 (根據之前的經驗)。
    Object.keys(params).forEach(key => {
      const val = params[key];
      // 只要不是 undefined 或 null，空字串也要保留！
      if (!ignoreKeys.includes(key) && val !== undefined && val !== null) {
        filteredParams[key] = String(val);
      }
    });

    // 排序 (A-Z)
    const sortedKeys = Object.keys(filteredParams).sort((a, b) => 
      a.toLowerCase().localeCompare(b.toLowerCase())
    );

    // 串接
    let raw = `HashKey=${this.hashKey}`;
    sortedKeys.forEach(key => {
      raw += `&${key}=${filteredParams[key]}`;
    });
    raw += `&HashIV=${this.hashIV}`;

    console.log('🔐 [Final Valid Plan] 加密前原始字串:', raw);

    // Encode
    let encoded = encodeURIComponent(raw)
      .replace(/%20/g, '+')
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');

    encoded = encoded.toLowerCase();

    console.log('🔏 [Final Valid Plan] 加密後 (MD5前):', encoded);

    return crypto.createHash('md5').update(encoded).digest('hex').toUpperCase();
  }

  // 2. 處理商品項目
  public static processItems(items: any[]) {
    const processed = {
      ItemName: '',
      ItemCount: '',
      ItemWord: '',
      ItemPrice: '',
      ItemAmount: ''
    };

    items.forEach((item, index) => {
      const separator = index === 0 ? '' : '|';
      processed.ItemName += `${separator}${item.name}`;
      processed.ItemCount += `${separator}${item.count}`;
      processed.ItemWord += `${separator}${item.word}`;
      processed.ItemPrice += `${separator}${item.price}`;
      processed.ItemAmount += `${separator}${item.amount}`;
    });

    return processed;
  }
}

// ==========================================
// 👇 API Route 主程式
// ==========================================

const ECPAY_CONFIG = {
  // ✅ 官方測試帳號 (B2C)
  MerchantID: '2000132',
  HashKey: 'ejCk326UnaZWKisg',
  HashIV: 'q9jcZX8Ib9LM8wYk',
  ApiUrl: 'https://einvoice-stage.ecpay.com.tw/Invoice/Issue'
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount } = body;
    const RelateNumber = `OD${Date.now()}`;

    // 初始化引擎
    const ecpay = new ECPayInvoice(
      ECPAY_CONFIG.MerchantID,
      ECPAY_CONFIG.HashKey,
      ECPAY_CONFIG.HashIV
    );

    // 1. 準備商品
    const items = [
      {
        name: 'SaaS',
        count: 1,
        word: 'Unit',
        price: amount,
        amount: amount
      }
    ];
    const itemParams = ECPayInvoice.processItems(items);

    // 2. 準備參數
    const baseParams: Record<string, string> = {
      MerchantID: ECPAY_CONFIG.MerchantID,
      RelateNumber: RelateNumber,
      
      CustomerName: 'TestUser',
      CustomerAddr: 'Taipei',
      CustomerPhone: '0912345678',
      CustomerEmail: 'test@gmail.com',
      
      // ✅ 修正：自然人憑證長度改為 16 碼 (2英文 + 14數字)
      CarrierType: '2',
      CarrierNum: 'TP00000000000000', 
      
      // ✅ Hash 必須保留空字串
      CustomerID: '',
      CustomerIdentifier: '',
      ClearanceMark: '',
      LoveCode: '',
      
      // ✅ 載具模式：不列印 (Print=0)
      Print: '0',        
      Donation: '0',
      TaxType: '1',
      SalesAmount: String(amount),
      InvoiceRemark: 'Test',
      InvType: '07',
      
      ...itemParams,
      
      TimeStamp: String(Math.floor(Date.now() / 1000))
    };

    // 3. 計算 CheckMacValue (包含 16碼 Carrier)
    const CheckMacValue = ecpay.genCheckMacValue(baseParams);

    // 4. 準備 Payload
    const formData = new URLSearchParams();
    formData.append('CheckMacValue', CheckMacValue);

    Object.entries(baseParams).forEach(([key, value]) => {
      // ✅ 發送所有非空值欄位 (Carrier 會被送出！)
      // 以及那些被證明必須送出的空字串 (如果有的話，不過這裡 Carrier 有值)
      if (value !== '' && value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });

    console.log('🚀 [Final Valid Plan - 16 Chars] 發送 Payload...');

    const ecpayRes = await fetch(ECPAY_CONFIG.ApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const text = await ecpayRes.text();
    console.log('🟢 綠界回傳:', text);

    return NextResponse.json({ success: true, raw: text, relateNumber: RelateNumber });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}