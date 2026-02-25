/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Stethoscope, 
  ChevronRight, 
  Settings2,
  AlertCircle,
  Activity,
  Hospital,
  Bell,
  BellOff,
  Volume2
} from 'lucide-react';
import { Division, SubDivision, ClinicProgress } from './types';

const API_BASE = '/api';

export default function App() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedSubDiv, setSelectedSubDiv] = useState<SubDivision | null>(null);
  const [progress, setProgress] = useState<ClinicProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [userNumber, setUserNumber] = useState<string>('');
  const [notifyBefore, setNotifyBefore] = useState<number>(5);
  const [isNotifyEnabled, setIsNotifyEnabled] = useState(false);
  const [targetClinicCode, setTargetClinicCode] = useState<string>('all');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const notifiedRef = useRef<Set<string>>(new Set());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/RegistrationDivision`);
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || '無法取得科別清單');
        }
        const data = await res.json();
        if (Array.isArray(data)) {
          setDivisions(data);
        } else {
          throw new Error('資料格式錯誤');
        }
      } catch (err) {
        setError('取得科別清單失敗，請稍後再試。');
        setDivisions([]); // Ensure it stays an array
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDivisions();
  }, []);

  // Re-sort progress when target clinic changes
  useEffect(() => {
    if (progress.length > 0 && targetClinicCode !== 'all') {
      setProgress(prev => {
        const sorted = [...prev].sort((a, b) => {
          if (a.ClinicCode === targetClinicCode) return -1;
          if (b.ClinicCode === targetClinicCode) return 1;
          return 0;
        });
        return sorted;
      });
    }
  }, [targetClinicCode]);

  const fetchProgress = useCallback(async (code: string) => {
    try {
      const res = await fetch(`${API_BASE}/AppointmentProgress?DivisionCode=${code}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || '無法取得看診進度');
      }
      const data: ClinicProgress[] = await res.json();
      
      // Sort: Priority to targetClinicCode
      const sortedData = [...data].sort((a, b) => {
        if (targetClinicCode !== 'all') {
          if (a.ClinicCode === targetClinicCode) return -1;
          if (b.ClinicCode === targetClinicCode) return 1;
        }
        return 0;
      });

      setProgress(sortedData);
      setLastUpdated(new Date());
      setError(null);

      // Notification Logic
      if (isNotifyEnabled && userNumber) {
        const target = parseInt(userNumber);
        if (!isNaN(target)) {
          data.forEach(item => {
            // Check if this is the targeted clinic or if 'all' is selected
            if (targetClinicCode !== 'all' && item.ClinicCode !== targetClinicCode) return;

            const current = parseInt(item.CurrentVisitSeq);
            if (!isNaN(current)) {
              const diff = target - current;
              const clinicKey = `${item.ClinicCode}-${item.ShiftCode}-${target}`;
              
              if (diff > 0 && diff <= notifyBefore && !notifiedRef.current.has(clinicKey)) {
                sendNotification(item, diff);
                notifiedRef.current.add(clinicKey);
              }
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError('更新進度失敗');
    }
  }, []);

  // Handle auto-refresh
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    if (isAutoRefresh && selectedSubDiv) {
      setCountdown(refreshInterval);
      
      timerRef.current = setInterval(() => {
        fetchProgress(selectedSubDiv.DivisionCode);
        setCountdown(refreshInterval);
      }, refreshInterval * 1000);

      countdownRef.current = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : refreshInterval));
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [isAutoRefresh, refreshInterval, selectedSubDiv, fetchProgress]);

  const handleSubDivSelect = (subDiv: SubDivision) => {
    setSelectedSubDiv(subDiv);
    setProgress([]);
    setTargetClinicCode('all');
    notifiedRef.current.clear();
    fetchProgress(subDiv.DivisionCode);
  };

  const getNumberColorClass = (item: ClinicProgress) => {
    if (!userNumber || isNaN(parseInt(userNumber))) return 'text-emerald-600';
    
    const target = parseInt(userNumber);
    const current = parseInt(item.CurrentVisitSeq);
    if (isNaN(current)) return 'text-emerald-600';
    
    const diff = target - current;
    
    if (diff <= 0) return 'text-black/20'; // Already passed
    if (diff <= 2) return 'text-red-600';
    if (diff <= 5) return 'text-orange-600';
    if (diff <= 10) return 'text-orange-400';
    
    return 'text-emerald-600';
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('此瀏覽器不支援桌面通知');
      return;
    }
    
    // If permission is already denied, we can't request it again via code
    if (Notification.permission === 'denied') {
      alert('您先前已拒絕通知權限。請在瀏覽器網址列左側的設定中手動開啟通知權限，然後重新整理頁面。');
      return;
    }

    if (Notification.permission !== 'granted') {
      try {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission !== 'granted') {
          alert('未能取得通知權限。請確保您已點擊「允許」，或檢查瀏覽器設定。');
          return;
        }
        // Success! Send a test notification
        new Notification('通知功能已開啟', {
          body: '當看診進度接近您的號碼時，系統將會發送提醒。',
          icon: 'https://www.skh.org.tw/skh/images/logo.png'
        });
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        alert('要求通知權限時發生錯誤，請確認您不是在私密瀏覽模式下。');
        return;
      }
    }
    
    setIsNotifyEnabled(!isNotifyEnabled);
  };

  const sendNotification = (item: ClinicProgress, diff: number) => {
    if (Notification.permission === 'granted') {
      new Notification('新光醫院到號通知', {
        body: `${item.ClinicName} (${item.DoctorName}) 目前號碼 ${item.CurrentVisitSeq}，距離您的號碼 ${userNumber} 還有 ${diff} 號！`,
        icon: 'https://www.skh.org.tw/skh/images/logo.png'
      });
      
      // Play a simple beep sound if possible
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
      } catch (e) {
        console.error('Audio play failed', e);
      }
    }
  };

  const filteredDivisions = (Array.isArray(divisions) ? divisions : []).map(div => ({
    ...div,
    SubDivisions: (Array.isArray(div.SubDivisions) ? div.SubDivisions : []).filter(sub => 
      sub.DivisionName.includes(searchTerm) || 
      div.DivisionName.includes(searchTerm)
    )
  })).filter(div => div.SubDivisions.length > 0);

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141414] font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-black/5 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
                <Hospital size={20} className="sm:hidden" />
                <Hospital size={24} className="hidden sm:block" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-tight leading-tight">新光醫院看診進度</h1>
                <p className="text-[10px] text-black/20 font-bold uppercase tracking-wider hidden xs:block">Real-time Monitor</p>
              </div>
            </div>
            
            {/* Mobile Notification Toggle - Moved to header for better access */}
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
      
      {/* Mobile Quick Settings - Redesigned for single row scrollable */}
      {selectedSubDiv && (
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
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: Division List - Collapsible on Mobile */}
        <aside className="lg:col-span-4 space-y-4 sm:space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={18} />
            <input
              type="text"
              placeholder="搜尋科別..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-3 sm:py-4 bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-sm focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-sm sm:text-base"
            />
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-black/5 shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-black/5 bg-black/[0.02] flex items-center justify-between">
              <h2 className="text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-widest">科別清單</h2>
              {selectedSubDiv && (
                <span className="md:hidden text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  已選擇: {selectedSubDiv.DivisionName}
                </span>
              )}
            </div>
            <div className="max-h-[300px] lg:max-h-[calc(100vh-320px)] overflow-y-auto custom-scrollbar">
              {loading && divisions.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <RefreshCw className="mx-auto animate-spin text-emerald-500" size={24} />
                  <p className="text-sm text-black/40">載入中...</p>
                </div>
              ) : (
                filteredDivisions.map((div, dIdx) => (
                  <div key={`${div.DivisionCode}-${dIdx}`} className="border-b border-black/5 last:border-0">
                    <div className="px-4 py-2 bg-black/[0.01] text-[10px] font-bold text-black/30 uppercase tracking-tighter">
                      {div.DivisionName}
                    </div>
                    {div.SubDivisions.map((sub, sIdx) => (
                      <button
                        key={`${sub.DivisionCode}-${sIdx}`}
                        onClick={() => handleSubDivSelect(sub)}
                        className={`w-full flex items-center justify-between px-6 py-4 text-left transition-all hover:bg-emerald-50 group ${
                          selectedSubDiv?.DivisionCode === sub.DivisionCode ? 'bg-emerald-50 text-emerald-700' : ''
                        }`}
                      >
                        <span className="text-sm font-medium">{sub.DivisionName}</span>
                        <ChevronRight 
                          size={16} 
                          className={`transition-transform duration-300 ${
                            selectedSubDiv?.DivisionCode === sub.DivisionCode ? 'translate-x-1 text-emerald-500' : 'text-black/10 group-hover:text-emerald-300'
                          }`} 
                        />
                      </button>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* Main Content: Progress Grid */}
        <section className="lg:col-span-8">
          <AnimatePresence mode="wait">
            {!selectedSubDiv ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[40px] border border-dashed border-black/10"
              >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mb-6">
                  <Activity size={40} />
                </div>
                <h3 className="text-2xl font-bold mb-2">請選擇一個科別</h3>
                <p className="text-black/40 max-w-xs">從左側清單中選擇您想查看的科別，即可即時追蹤看診進度。</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedSubDiv.DivisionCode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6"
              >
                <div className="flex items-end justify-between px-2">
                  <div className="w-full">
                    <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-1 break-words">{selectedSubDiv.DivisionName}</h2>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] sm:text-sm text-black/40">
                      <span className="flex items-center gap-1">
                        <Clock size={12} className="sm:size-[14px]" />
                        更新: {lastUpdated?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) || '--:--:--'}
                      </span>
                      {error && (
                        <span className="flex items-center gap-1 text-red-500 font-medium">
                          <AlertCircle size={12} className="sm:size-[14px]" />
                          {error}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {progress.length > 0 ? (
                    progress.map((item, idx) => (
                      <motion.div
                        key={`${item.ClinicCode}-${item.ShiftCode}-${item.DoctorEmpNo}-${idx}`}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-[32px] border border-black/5 shadow-sm hover:shadow-xl hover:shadow-emerald-900/5 transition-all group"
                      >
                        <div className="flex justify-between items-start mb-4 sm:mb-6">
                          <div className="space-y-1">
                            <span className="inline-block px-2 py-0.5 sm:px-3 sm:py-1 bg-black/5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-black/40">
                              {item.ClinicName} • {item.ShiftName}
                            </span>
                            <div className="flex items-center gap-2 text-base sm:text-lg font-bold">
                              <User size={16} className="text-black/20 sm:size-[18px]" />
                              {item.DoctorName}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl sm:text-4xl font-black tabular-nums transition-colors duration-500 ${getNumberColorClass(item)}`}>
                              <AnimatePresence mode="wait">
                                <motion.span
                                  key={item.CurrentVisitSeq}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.3 }}
                                  className="inline-block"
                                >
                                  {item.CurrentVisitSeq}
                                </motion.span>
                              </AnimatePresence>
                            </div>
                            <div className="text-[9px] sm:text-[10px] font-bold text-black/30 uppercase tracking-widest">
                              目前號碼
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-3 sm:pt-4 border-t border-black/5">
                          <div className="space-y-0.5 sm:space-y-1">
                            <div className="text-[9px] sm:text-[10px] font-bold text-black/30 uppercase tracking-widest flex items-center gap-1">
                              <Stethoscope size={10} /> 下一號
                            </div>
                            <div className="text-base sm:text-lg font-bold tabular-nums">{item.NextVisitSeq}</div>
                          </div>
                          <div className="space-y-0.5 sm:space-y-1 text-right">
                            <div className="text-[9px] sm:text-[10px] font-bold text-black/30 uppercase tracking-widest">
                              報到人數
                            </div>
                            <div className="text-base sm:text-lg font-bold tabular-nums">{item.CheckInCount}</div>
                          </div>
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${item.ClinicVisitState === '1' ? 'bg-emerald-500 animate-pulse' : 'bg-black/10'}`} />
                            <span className="text-[9px] sm:text-[10px] font-bold text-black/40 uppercase tracking-widest">
                              {item.ClinicVisitState === '1' ? '看診中' : '暫停/結束'}
                            </span>
                          </div>
                          
                          <button
                            onClick={() => {
                              setTargetClinicCode(item.ClinicCode);
                              if (!isNotifyEnabled) {
                                requestNotificationPermission();
                              }
                            }}
                            className={`flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${
                              targetClinicCode === item.ClinicCode 
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-black/5 text-black/40 hover:bg-emerald-50 hover:text-emerald-600'
                            }`}
                          >
                            {targetClinicCode === item.ClinicCode ? <Bell size={10} /> : <BellOff size={10} />}
                            <span className="xs:inline hidden">{targetClinicCode === item.ClinicCode ? '監測中' : '設為提醒目標'}</span>
                            <span className="xs:hidden inline">{targetClinicCode === item.ClinicCode ? '監測' : '提醒'}</span>
                          </button>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-black/5">
                      <div className="w-16 h-16 bg-black/5 rounded-full flex items-center justify-center text-black/20 mx-auto mb-4">
                        <RefreshCw size={32} className={loading ? 'animate-spin' : ''} />
                      </div>
                      <p className="text-black/40 font-medium">
                        {loading ? '正在獲取最新進度...' : '目前此科別無看診資訊'}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0,0,0,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0,0,0,0.1);
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @media (max-width: 640px) {
          body {
            background-color: #fcfcfc;
          }
        }
      `}</style>
    </div>
  );
}
