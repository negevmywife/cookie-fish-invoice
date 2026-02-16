// 檔案路徑: lib/ecpay_invoice.ts
import crypto from 'crypto';

/**
 * 綠界電子發票核心引擎 (移植自官方 Node.js SDK)
 */
export class ECPayInvoice {
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

    // 過濾空值 (官方邏輯：值為 undefined, null, '' 都移除)
    Object.keys(params).forEach(key => {
      const val = params[key];
      if (!ignoreKeys.includes(key) && val !== undefined && val !== null && val !== '') {
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

    console.log('🔐 [Official Port] 加密前原始字串:', raw);

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

    console.log('🔏 [Official Port] 加密後 (MD5前):', encoded);

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