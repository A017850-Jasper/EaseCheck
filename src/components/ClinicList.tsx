import { motion, AnimatePresence } from 'motion/react';
import { Activity, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { SubDivision, ClinicProgress } from '../types';
import { ClinicCard } from './ClinicCard';

interface ClinicListProps {
  selectedSubDiv: SubDivision | null;
  progress: ClinicProgress[];
  lastUpdated: Date | null;
  error: string | null;
  loading: boolean;
  userNumber: string;
  targetClinicCode: string;
  setTargetClinicCode: (code: string) => void;
  isNotifyEnabled: boolean;
  requestNotificationPermission: () => void;
}

export function ClinicList({
  selectedSubDiv,
  progress,
  lastUpdated,
  error,
  loading,
  userNumber,
  targetClinicCode,
  setTargetClinicCode,
  isNotifyEnabled,
  requestNotificationPermission
}: ClinicListProps) {
  return (
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
                  <ClinicCard
                    key={`${item.ClinicCode}-${item.ShiftCode}-${item.DoctorEmpNo}-${idx}`}
                    item={item}
                    userNumber={userNumber}
                    targetClinicCode={targetClinicCode}
                    setTargetClinicCode={setTargetClinicCode}
                    isNotifyEnabled={isNotifyEnabled}
                    requestNotificationPermission={requestNotificationPermission}
                  />
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
  );
}
