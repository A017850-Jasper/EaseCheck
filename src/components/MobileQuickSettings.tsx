import { Volume2 } from 'lucide-react';
import { SubDivision, ClinicProgress } from '../types';

interface MobileQuickSettingsProps {
  selectedSubDiv: SubDivision | null;
  targetClinicCode: string;
  setTargetClinicCode: (code: string) => void;
  progress: ClinicProgress[];
  userNumber: string;
  setUserNumber: (val: string) => void;
  notifyBefore: number;
  setNotifyBefore: (n: number) => void;
  requestNotificationPermission: () => void;
}

export function MobileQuickSettings({
  selectedSubDiv,
  targetClinicCode,
  setTargetClinicCode,
  progress,
  userNumber,
  setUserNumber,
  notifyBefore,
  setNotifyBefore,
  requestNotificationPermission
}: MobileQuickSettingsProps) {
  if (!selectedSubDiv) return null;

  return (
    <div className="sm:hidden bg-emerald-50/50 border-b border-emerald-100 px-4 py-2 sticky top-[61px] z-40">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
        <div className="flex items-center gap-2 shrink-0 bg-white border border-emerald-100 px-2 py-1 rounded-lg shadow-sm">
          <span className="text-[9px] font-black text-emerald-600 uppercase">診別</span>
          <select 
            value={targetClinicCode}
            onChange={(e) => setTargetClinicCode(e.target.value)}
            className="bg-transparent text-[11px] font-bold outline-none max-w-[80px] truncate"
          >
            <option value="all">全部</option>
            {progress.map((p, idx) => (
              <option key={`${p.ClinicCode}-${p.ShiftCode}-${idx}`} value={p.ClinicCode}>{p.ClinicName}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-white border border-emerald-100 px-2 py-1 rounded-lg shadow-sm">
          <span className="text-[9px] font-black text-emerald-600 uppercase">我的號碼</span>
          <input 
            type="number"
            value={userNumber}
            onChange={(e) => setUserNumber(e.target.value)}
            className="w-10 bg-transparent text-[11px] font-bold outline-none"
            placeholder="號碼"
          />
        </div>
        <div className="flex items-center gap-2 shrink-0 bg-white border border-emerald-100 px-2 py-1 rounded-lg shadow-sm">
          <span className="text-[9px] font-black text-emerald-600 uppercase">前 N 號</span>
          <select 
            value={notifyBefore}
            onChange={(e) => setNotifyBefore(Number(e.target.value))}
            className="bg-transparent text-[11px] font-bold outline-none"
          >
            {[1, 3, 5, 10, 15].map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (Notification.permission === 'granted') {
              new Notification('測試通知', {
                body: '這是一則測試通知，表示您的裝置可以正常接收提醒。',
                icon: 'https://www.skh.org.tw/skh/images/logo.png'
              });
            } else {
              requestNotificationPermission();
            }
          }}
          className="flex items-center gap-1 shrink-0 bg-emerald-600 text-white px-3 py-1 rounded-lg shadow-sm text-[10px] font-bold"
        >
          <Volume2 size={12} />
          <span>測試</span>
        </button>
      </div>
    </div>
  );
}
