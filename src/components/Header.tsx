import { Activity, Bell, BellOff, RefreshCw, Settings2 } from 'lucide-react';
import { SubDivision, ClinicProgress } from '../types';

interface HeaderProps {
  selectedSubDiv: SubDivision | null;
  isNotifyEnabled: boolean;
  permissionStatus: NotificationPermission;
  requestNotificationPermission: () => void;
  progress: ClinicProgress[];
  targetClinicCode: string;
  setTargetClinicCode: (code: string) => void;
  userNumber: string;
  setUserNumber: (val: string) => void;
  notifyBefore: number;
  setNotifyBefore: (n: number) => void;
  isAutoRefresh: boolean;
  setIsAutoRefresh: (val: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (n: number) => void;
  countdown: number;
  loading: boolean;
  testNotification: () => void;
}

export function Header({
  selectedSubDiv,
  isNotifyEnabled,
  permissionStatus,
  requestNotificationPermission,
  progress,
  targetClinicCode,
  setTargetClinicCode,
  userNumber,
  setUserNumber,
  notifyBefore,
  setNotifyBefore,
  isAutoRefresh,
  setIsAutoRefresh,
  refreshInterval,
  setRefreshInterval,
  countdown,
  loading,
  testNotification
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5 px-4 sm:px-6 py-3 sm:py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
              <Activity size={20} className="sm:hidden" />
              <Activity size={24} className="hidden sm:block" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">診準</h1>
              <p className="text-[10px] text-black/20 font-bold uppercase tracking-wider hidden xs:block">Smart Clinic Monitor</p>
            </div>
          </div>
          
          {selectedSubDiv && (
            <div className="sm:hidden flex items-center gap-2">
              <button 
                onClick={requestNotificationPermission}
                className={`p-2 rounded-lg transition-all relative ${
                  isNotifyEnabled ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'bg-black/5 text-black/40'
                }`}
              >
                {isNotifyEnabled ? <Bell size={18} /> : <BellOff size={18} />}
                {permissionStatus === 'denied' && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-end">
          {selectedSubDiv && (
            <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">診別</span>
                <select 
                  value={targetClinicCode}
                  onChange={(e) => setTargetClinicCode(e.target.value)}
                  className="max-w-[100px] bg-white border border-emerald-200 rounded-md px-1 py-0.5 text-xs font-bold outline-none cursor-pointer truncate"
                >
                  <option value="all">全部診別</option>
                  {progress.map((p, idx) => (
                    <option key={`${p.ClinicCode}-${p.ShiftCode}-${idx}`} value={p.ClinicCode}>{p.ClinicName} ({p.ShiftName})</option>
                  ))}
                </select>
              </div>
              <div className="h-4 w-[1px] bg-emerald-200 mx-1" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">我的號碼</span>
                <input 
                  type="number"
                  placeholder="號碼"
                  value={userNumber}
                  onChange={(e) => setUserNumber(e.target.value)}
                  className="w-16 bg-white border border-emerald-200 rounded-md px-2 py-0.5 text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div className="h-4 w-[1px] bg-emerald-200 mx-1" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">前 N 號通知</span>
                <select 
                  value={notifyBefore}
                  onChange={(e) => setNotifyBefore(Number(e.target.value))}
                  className="bg-white border border-emerald-200 rounded-md px-1 py-0.5 text-xs font-bold outline-none cursor-pointer"
                >
                  {[1, 3, 5, 10, 15].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={requestNotificationPermission}
                className={`ml-2 p-1.5 rounded-lg transition-all relative ${
                  isNotifyEnabled 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' 
                    : 'bg-white text-emerald-600 border border-emerald-200'
                }`}
                title={
                  permissionStatus === 'denied' 
                    ? '權限已被拒絕，請手動開啟' 
                    : isNotifyEnabled ? '關閉通知' : '開啟通知'
                }
              >
                {isNotifyEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                {permissionStatus === 'denied' && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white" />
                )}
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {selectedSubDiv && (
              <div className="flex items-center gap-2 bg-black/5 px-3 py-1.5 rounded-full shrink-0">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-black/60">
                  <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                  <span className="tabular-nums">{countdown}s</span>
                </div>
                <div className="h-3 w-[1px] bg-black/10" />
                <button 
                  onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                  className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isAutoRefresh ? 'text-emerald-600' : 'text-black/40'}`}
                >
                  {isAutoRefresh ? 'ON' : 'OFF'}
                </button>
              </div>
            )}
            
            <div className="flex items-center gap-1 bg-black/5 p-1 rounded-lg shrink-0">
              <Settings2 size={14} className="ml-1 text-black/40" />
              <select 
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-[10px] font-bold px-1 py-0.5 outline-none cursor-pointer"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
