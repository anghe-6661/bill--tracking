import { calcDaysUsed, calcCostPerDay } from '../store';

const ITEM_EMOJIS = {
  '数码': '📱',
  '出行': '🚗',
  '服装': '👔',
  '家居': '🏠',
  '运动': '⚽',
};

export default function ItemCard({ item, onClick }) {
  const days = calcDaysUsed(item);
  const cpd = calcCostPerDay(item);
  const isActive = item.status === 'active';
  const isSold = item.status === 'sold';
  const isPriceless = item.isPriceless;

  const statusLabel = {
    active: '服役中',
    retired: '已退役',
    sold: '已卖出',
  }[item.status];

  const emoji = ITEM_EMOJIS[item.category] || '📦';

  // Specific framing style matching reference screenshot:
  // - FreeBuds, Fold: polaroid frame tilted left (-rotate-3)
  // - Watch: polaroid frame tilted right (rotate-3)
  // - PC: rounded-2xl photo without polaroid frame
  // - Car, iPhone: clean product cutouts
  const isPolaroid = item.name.includes('FreeBuds') || item.name.includes('fold') || item.name.includes('watch') || item.name.includes('iwatch');
  const isTiltedRight = item.name.includes('watch') || item.name.includes('iwatch');
  const isCutout = item.name.includes('领克') || item.name.includes('iPhone') || item.name.includes('07GT');

  // Truncate to 2 decimal places to match Image 2 exactly (e.g. 93.14)
  const formattedCpd = (Math.floor(cpd * 100) / 100).toFixed(2);
  const isZeroCost = isPriceless || formattedCpd === '0.00';

  return (
    <div
      className="card p-4 rounded-[24px] cursor-pointer active:scale-[0.98] transition-all duration-200 select-none bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)] flex flex-col justify-between"
      style={{ padding: '18px 16px' }}
      onClick={() => onClick?.(item)}
    >
      <div>
        {/* ── 第一行（图片 + 状态胶囊）: flex justify-between items-start ── */}
        <div className="flex justify-between items-start">
          {item.image ? (
            isPolaroid ? (
              <div
                className={`w-[68px] h-[68px] flex-shrink-0 bg-white p-1.5 pb-2.5 rounded-md shadow-md border border-gray-100 ${
                  isTiltedRight ? 'rotate-3' : '-rotate-3'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-xs"
                />
              </div>
            ) : isCutout ? (
              <div className="w-[68px] h-[68px] flex-shrink-0 flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-contain"
                />
              </div>
            ) : (
              <img
                src={item.image}
                alt={item.name}
                className="w-[68px] h-[68px] flex-shrink-0 rounded-2xl object-cover shadow-xs"
              />
            )
          ) : (
            <div
              className="w-[68px] h-[68px] flex-shrink-0 rounded-2xl flex items-center justify-center text-xl bg-[#F4F5F7]"
            >
              {emoji}
            </div>
          )}

          {/* 右上角「● 服役中」胶囊: bg-[#F4F5F7] px-2.5 py-1 rounded-full text-[11px] text-gray-600 flex items-center gap-1.5, 绿点 w-1.5 h-1.5 rounded-full bg-[#7ED321] */}
          <div
            className="bg-[#F4F5F7] px-2.5 py-1 rounded-full text-[11px] text-gray-600 flex items-center gap-1.5 flex-shrink-0"
            style={{ padding: '4px 10px' }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive
                  ? 'bg-[#7ED321]'
                  : isSold
                  ? 'bg-[#007AFF]'
                  : 'bg-gray-400'
              }`}
            />
            <span>{statusLabel}</span>
          </div>
        </div>

        {/* ── 第二行（物品名称）: mt-3.5 text-[15px] font-medium text-gray-900 truncate ── */}
        <h3 className="text-[15px] font-medium text-gray-900 truncate mt-3.5 tracking-tight">
          {item.name}
        </h3>

        {/* ── 第三行（价格与天数）: mt-1 text-[12px] text-gray-400, mx-1.5 text-gray-200 ── */}
        <div className="text-[12px] text-gray-400 mt-1 flex items-center text-price">
          {isPriceless ? (
            <>
              <span>无价之宝</span>
              <span className="text-gray-200 mx-1.5">|</span>
              <span>{days}天</span>
            </>
          ) : (
            <>
              <span>¥{item.price.toFixed(2)}</span>
              <span className="text-gray-200 mx-1.5">|</span>
              <span>{days}天</span>
            </>
          )}
        </div>
      </div>

      {/* ── 第四行（底部日均成本）: mt-5, 金额 text-[17px] font-bold, 若是 ¥0.00/天 整行文字包括 /天 全部 text-[#F5A623] ── */}
      <div className="mt-5 pt-1">
        <div
          className={`tracking-tight text-price ${
            isZeroCost ? 'text-[#F5A623]' : 'text-gray-900'
          }`}
        >
          <span className="text-[14px] font-bold">¥</span>
          <span className="text-[17px] font-bold ml-0.5">{formattedCpd}</span>
          <span
            className={`text-xs ml-0.5 ${
              isZeroCost ? 'text-[#F5A623] font-medium' : 'text-gray-600 font-normal'
            }`}
          >
            /天
          </span>
        </div>
      </div>
    </div>
  );
}
