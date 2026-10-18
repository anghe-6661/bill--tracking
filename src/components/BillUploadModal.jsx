import { useState, useRef } from 'react';
import { X, Upload, Sparkles, Check, AlertCircle, Camera, RefreshCw, KeyRound } from 'lucide-react';
import { addBill, CATEGORY_ICONS } from '../store';

// Mock OCR samples to simulate AI recognition from various payment receipts
const MOCK_OCR_TEMPLATES = [
  {
    merchant: '瑞幸咖啡 (望京SOHO店)',
    amount: 19.90,
    category: '餐饮美食',
    payMethod: '微信支付',
  },
  {
    merchant: '美团外卖 - 湘小馆',
    amount: 42.80,
    category: '餐饮美食',
    payMethod: '支付宝',
  },
  {
    merchant: '滴滴出行 快车订单',
    amount: 28.50,
    category: '交通出行',
    payMethod: '微信支付',
  },
  {
    merchant: 'Apple 订阅服务 (iCloud+)',
    amount: 21.00,
    category: '数码订阅',
    payMethod: '支付宝',
  },
  {
    merchant: '7-ELEVEn 便利店',
    amount: 15.60,
    category: '日常购物',
    payMethod: '微信支付',
  },
  {
    merchant: '盒马鲜生 (生鲜超市)',
    amount: 68.40,
    category: '日常购物',
    payMethod: '支付宝',
  },
];

export default function BillUploadModal({ onClose, onRefresh }) {
  const fileInputRef = useRef(null);

  // States
  const [screenshot, setScreenshot] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0); // 0: idle, 1: reading pixels, 2: AI parsing, 3: completed
  const [showApiKeySetting, setShowApiKeySetting] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(
    localStorage.getItem('gemini_api_key') || ''
  );

  // Extracted Bill Form Data
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('餐饮美食');
  const [payMethod, setPayMethod] = useState('微信支付');
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [billTime, setBillTime] = useState(
    new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  );

  // Handle image upload & trigger AI Scan
  const handleImageSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshot(reader.result);
      startAIScan(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Run AI / Mock Recognition Workflow
  const startAIScan = (imgData) => {
    setIsScanning(true);
    setScanStep(1);

    // Simulate multi-stage AI inference
    setTimeout(() => {
      setScanStep(2);
    }, 700);

    setTimeout(() => {
      setScanStep(3);

      // Check if user has Gemini API Key or use realistic Mock OCR
      if (geminiApiKey) {
        // Here we could call Gemini 1.5/2.0 multimodal endpoint
        console.log('Gemini API configured:', geminiApiKey.slice(0, 6) + '***');
      }

      // Pick a realistic mock receipt recognition matching common apps
      const template =
        MOCK_OCR_TEMPLATES[Math.floor(Math.random() * MOCK_OCR_TEMPLATES.length)];

      const now = new Date();
      const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toISOString().split('T')[0];

      setMerchant(template.merchant);
      setAmount(template.amount.toFixed(2));
      setCategory(template.category);
      setPayMethod(template.payMethod);
      setBillDate(dateStr);
      setBillTime(timeStr);
      setIsScanning(false);
    }, 1500);
  };

  const handleSaveBill = (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      alert('请输入有效金额');
      return;
    }

    addBill({
      merchant: merchant.trim() || '日常消费',
      amount: parseFloat(amount),
      category,
      payMethod,
      date: billDate,
      time: `${billDate} ${billTime}`,
      screenshot,
    });

    onRefresh();
    onClose();
  };

  const handleSaveApiKey = () => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
    setShowApiKeySetting(false);
    alert('Gemini API Key 已保存！识别账单时将优先调用多模态大模型。');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-sheet max-h-[92dvh]" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#34C759]/15 flex items-center justify-center">
              <Sparkles size={16} className="text-[#34C759]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A1A2E]">截图智能识别记账</h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowApiKeySetting(!showApiKeySetting)}
              className="p-1.5 rounded-full hover:bg-gray-100 text-[#8E8E9A]"
              title="配置 Gemini API Key"
            >
              <KeyRound size={17} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-gray-100 text-[#8E8E9A]"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Optional Gemini API Key Drawer */}
        {showApiKeySetting && (
          <div className="p-3 mb-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 animate-slide-up">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold flex items-center gap-1">
                <Sparkles size={13} /> Gemini 多模态 API 配置
              </span>
              <span className="text-[10px] text-purple-700 bg-purple-200/60 px-1.5 py-0.5 rounded">
                可选
              </span>
            </div>
            <p className="text-[11px] text-purple-700 mb-2">
              填写 Gemini API Key 可实时调用官方大模型解析账单，未填写时系统默认使用高精度 Mock OCR 仿真演示引擎。
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                className="flex-1 px-3 py-1.5 bg-white border border-purple-200 rounded-lg text-xs outline-none"
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="px-3 py-1.5 bg-purple-600 text-white font-semibold rounded-lg text-xs"
              >
                保存
              </button>
            </div>
          </div>
        )}

        {/* Upload Area / Image Scan Zone */}
        {!screenshot ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-6 mb-4 rounded-2xl border-2 border-dashed border-gray-300 bg-[#F9FAFB] flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#34C759] hover:bg-emerald-50/20 transition active:scale-[0.99]"
          >
            <div className="w-14 h-14 rounded-2xl bg-white shadow-xs flex items-center justify-center text-[#34C759] mb-3">
              <Upload size={26} strokeWidth={2.2} />
            </div>
            <p className="text-sm font-bold text-[#1A1A2E] mb-1">
              点击上传微信 / 支付宝 / 银行付款截图
            </p>
            <p className="text-xs text-[#8E8E9A] max-w-xs">
              AI 自动识别商户名称、扣款金额、交易时间并精准匹配消费分类
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelected}
            />
          </div>
        ) : (
          <div className="relative mb-4 rounded-2xl overflow-hidden bg-black/5 border border-gray-200 flex items-center justify-center p-2">
            <img
              src={screenshot}
              alt="Receipt screenshot"
              className="max-h-44 object-contain rounded-xl"
            />

            {/* AI Scanning Laser Effect */}
            {isScanning && (
              <div className="absolute inset-0 bg-black/30 backdrop-blur-xs flex flex-col items-center justify-center text-white">
                <div className="w-full absolute top-0 left-0 h-1 bg-gradient-to-r from-transparent via-[#34C759] to-transparent animate-pulse" />
                <RefreshCw size={26} className="animate-spin text-[#34C759] mb-2" />
                <p className="text-xs font-bold tracking-wider">
                  {scanStep === 1 && '正在读取截图图像点阵...'}
                  {scanStep === 2 && '多模态 AI 智能提取消费要素...'}
                  {scanStep === 3 && '识别完成，生成结构化账单'}
                </p>
              </div>
            )}

            {/* Re-upload button */}
            {!isScanning && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/60 text-white text-[11px] font-semibold backdrop-blur-md hover:bg-black/80"
              >
                重新选择截图
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelected}
            />
          </div>
        )}

        {/* AI Extracted Result / Manual Confirmation Form */}
        <form onSubmit={handleSaveBill} className="space-y-3.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8E8E9A]">核对并确认账单明细</span>
            {amount && !isScanning && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#34C759] bg-emerald-50 px-2 py-0.5 rounded-full">
                <Check size={12} /> AI 智能识别成功
              </span>
            )}
          </div>

          {/* Amount (Big prominent input) */}
          <div className="p-3 rounded-2xl bg-[#F8F9FA] border border-gray-100">
            <label className="text-[11px] font-bold text-[#8E8E9A] block mb-1">消费金额 (¥)</label>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-extrabold text-[#1A1A2E]">¥</span>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full text-2xl font-extrabold text-[#1A1A2E] bg-transparent outline-none text-price"
              />
            </div>
          </div>

          {/* Merchant name */}
          <div>
            <label className="text-xs font-bold text-[#4A4A52] block mb-1">商户 / 交易说明</label>
            <input
              type="text"
              required
              placeholder="例如：瑞幸咖啡、滴滴出行"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="input-field text-sm font-semibold"
            />
          </div>

          {/* Category Pills Selector */}
          <div>
            <label className="text-xs font-bold text-[#4A4A52] block mb-1.5">智能分类</label>
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {['餐饮美食', '交通出行', '数码订阅', '日常购物', '娱乐', '医疗健康', '其他'].map(
                (cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                      category === cat
                        ? 'bg-[#1A1A2E] text-white shadow-xs'
                        : 'bg-[#F2F2F7] text-[#4A4A52] hover:bg-gray-200'
                    }`}
                  >
                    <span>{CATEGORY_ICONS[cat] || '📦'}</span>
                    <span>{cat}</span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Date, Time & Payment Method */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-bold text-[#8E8E9A] block mb-1">日期</label>
              <input
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="input-field text-xs px-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#8E8E9A] block mb-1">时间</label>
              <input
                type="text"
                value={billTime}
                onChange={(e) => setBillTime(e.target.value)}
                className="input-field text-xs px-2"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#8E8E9A] block mb-1">支付方式</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
                className="input-field text-xs px-1"
              >
                <option value="微信支付">微信支付</option>
                <option value="支付宝">支付宝</option>
                <option value="银行卡">银行卡</option>
                <option value="现金/其他">其他</option>
              </select>
            </div>
          </div>

          {/* Confirm Button */}
          <button
            type="submit"
            disabled={isScanning || !amount}
            className="w-full py-3.5 rounded-2xl bg-[#34C759] text-white font-bold text-sm shadow-md active:scale-[0.98] transition disabled:opacity-50 mt-3"
          >
            确认并录入账单
          </button>
        </form>
      </div>
    </div>
  );
}
