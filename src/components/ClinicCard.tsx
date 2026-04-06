import { motion, AnimatePresence } from 'motion/react';
import { User, Stethoscope, Bell, BellOff, Hourglass } from 'lucide-react';
import { ClinicProgress } from '../types';
import { getNumberColorClass } from '../utils/clinicUtils';

interface ClinicCardProps {
  key?: string | number;
  item: ClinicProgress;
  userNumber: string;
  targetClinicCode: string;
  setTargetClinicCode: (code: string) => void;
  isNotifyEnabled: boolean;
  requestNotificationPermission: () => void;
}

export function ClinicCard({
  item,
  userNumber,
  targetClinicCode,
  setTargetClinicCode,
  isNotifyEnabled,
  requestNotificationPermission
}: ClinicCardProps) {
  const currentNum = parseInt(item.CurrentVisitSeq);
  const userNum = parseInt(userNumber);
  const isWaiting = !isNaN(userNum) && !isNaN(currentNum) && userNum > currentNum;

  return (
    <motion.div
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
          <div className={`text-2xl sm:text-4xl font-black tabular-nums transition-colors duration-500 ${getNumberColorClass(item, userNumber)}`}>
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
      
      {isWaiting && (
        <div className="mt-4 pt-3 border-t border-black/5 flex items-center justify-between">
          <div className="text-[9px] sm:text-[10px] font-bold text-black/30 uppercase tracking-widest flex items-center gap-1">
            <Hourglass size={10} /> 預計等待時間
          </div>
          <div className="text-xs sm:text-sm font-bold text-emerald-600">
            {item.estimatedMinutes !== undefined ? (
              item.estimatedMinutes === null ? (
                <span className="text-black/20 italic">計算中...</span>
              ) : (
                `約 ${item.estimatedMinutes} 分鐘`
              )
            ) : (
              <span className="text-black/20 italic">等待資料更新...</span>
            )}
          </div>
        </div>
      )}

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
  );
}
