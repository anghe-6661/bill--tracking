import { useState, useRef } from 'react';
import { X, Camera, Sparkles, Upload, Check } from 'lucide-react';
import { addItem, updateItem, getSettings } from '../store';

const PRESET_ICONS = [
  { emoji: '📱', color: '#D4DDE8', label: '数码' },
  { emoji: '💻', color: '#2A1F3D', label: '电脑' },
  { emoji: '⌚', color: '#C5D4E8', label: '手表' },
  { emoji: '🎧', color: '#E8E5DE', label: '耳机' },
  { emoji: '🚗', color: '#E8E8EC', label: '出行' },
  { emoji: '📷', color: '#F3E8FF', label: '相机' },
  { emoji: '👟', color: '#FFE8D6', label: '鞋履' },
  { emoji: '☕', color: '#EDE0D4', label: '生活' },
];

export default function ItemEditModal({ item, onClose, onRefresh }) {
  const isEdit = Boolean(item);
  const settings = getSettings();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(item?.name || '');
  const [price, setPrice] = useState(item?.price !== undefined ? item.price : '');
  const [purchaseDate, setPurchaseDate] = useState(
    item?.purchaseDate || new Date().toISOString().split('T')[0]
  );
  const [category, setCategory] = useState(item?.category || '数码');
  const [isPriceless, setIsPriceless] = useState(Boolean(item?.isPriceless));
  const [image, setImage] = useState(item?.image || null);
  const [imageColor, setImageColor] = useState(item?.imageColor || '#F0F0F4');

  // Handle local image file upload & convert to Base64
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImage(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('请输入物品名称');
      return;
    }
    const numPrice = isPriceless ? 0 : parseFloat(price) || 0;

    const payload = {
      name: name.trim(),
      price: numPrice,
      purchaseDate,
      category,
      isPriceless,
      image,
      imageColor,
      status: item?.status || 'active',
      retiredDate: item?.retiredDate || null,
      soldDate: item?.soldDate || null,
      soldPrice: item?.soldPrice || 0,
    };

    if (isEdit) {
      updateItem(item.id, payload);
    } else {
      addItem(payload);
    }

    onRefresh();
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#1A1A2E]">
            {isEdit ? '编辑物品' : '添加新物品'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-gray-100 text-[#8E8E9A]"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Photo Preview / Upload */}
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#F8F9FA] border border-gray-100">
            <div
              className="polaroid-frame w-16 h-16 flex-shrink-0 flex items-center justify-center cursor-pointer relative overflow-hidden"
              onClick={() => fileInputRef.current?.click()}
            >
              {image ? (
                <img src={image} alt="preview" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex flex-col items-center justify-center text-[#8E8E9A]"
                  style={{ background: imageColor }}
                >
                  <Camera size={22} className="opacity-70" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-[#1A1A2E] shadow-2xs hover:bg-gray-50 active:scale-[0.98] transition"
              >
                <Upload size={13} />
                <span>从相册上传图片</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-[11px] text-[#8E8E9A] mt-1">支持拍摄或上传带拍立得质感照片</p>
            </div>
          </div>

          {/* Quick preset color / icons */}
          <div>
            <label className="text-[11px] font-bold text-[#8E8E9A] block mb-1.5">或选择预设风格</label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {PRESET_ICONS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setImage(null);
                    setImageColor(p.color);
                    setCategory(p.label);
                  }}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0 border transition-transform active:scale-90"
                  style={{
                    background: p.color,
                    borderColor: imageColor === p.color && !image ? '#1A1A2E' : 'transparent',
                    borderWidth: imageColor === p.color && !image ? 2 : 1,
                  }}
                >
                  {p.emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="text-xs font-bold text-[#4A4A52] block mb-1">物品名称</label>
            <input
              type="text"
              required
              placeholder="例如：iPhone 16 Pro 256GB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Price & Priceless Toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-[#4A4A52]">购买价格 (¥)</label>
              <label className="inline-flex items-center gap-1.5 text-xs text-[#8E8E9A] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPriceless}
                  onChange={(e) => setIsPriceless(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#FFB800] rounded"
                />
                <span className={isPriceless ? 'text-[#FFB800] font-bold' : ''}>✨ 无价之宝</span>
              </label>
            </div>
            <input
              type="number"
              step="0.01"
              disabled={isPriceless}
              placeholder={isPriceless ? '无价之宝 (¥0.00/天)' : '0.00'}
              value={isPriceless ? '' : price}
              onChange={(e) => setPrice(e.target.value)}
              className={`input-field font-semibold ${
                isPriceless ? 'bg-amber-50/50 text-amber-700 placeholder-amber-500 border-amber-200' : ''
              }`}
            />
          </div>

          {/* Purchase Date & Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-[#4A4A52] block mb-1">购买日期</label>
              <input
                type="date"
                required
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="input-field text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-[#4A4A52] block mb-1">所属分类</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-field text-xs"
              >
                <option value="数码">数码电子</option>
                <option value="出行">交通座驾</option>
                <option value="服装">服饰鞋包</option>
                <option value="家居">品质家居</option>
                <option value="运动">户外运动</option>
                <option value="其他">其他物品</option>
              </select>
            </div>
          </div>

          {/* Save Button */}
          <button
            type="submit"
            className="w-full py-3.5 rounded-2xl bg-[#1A1A2E] text-white font-bold text-sm shadow-md active:scale-[0.98] transition mt-2"
          >
            {isEdit ? '保存修改' : '立即添加物品'}
          </button>
        </form>
      </div>
    </div>
  );
}
