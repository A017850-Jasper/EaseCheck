import { useState, useEffect, useCallback, useRef } from 'react';
import { SubDivision, ClinicProgress } from '../types';
import { API_BASE } from '../constants';

export function useClinicProgress(
  selectedSubDiv: SubDivision | null,
  targetClinicCode: string,
  setTargetClinicCode: (code: string) => void,
  isNotifyEnabled: boolean,
  userNumber: string,
  notifyBefore: number,
  checkAndSendNotification: (item: ClinicProgress, target: number, notifyBefore: number) => void
) {
  const [progress, setProgress] = useState<ClinicProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(5);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const historyRef = useRef<Record<string, { timestamp: number; seq: number }[]>>({});

  const fetchProgress = useCallback(async (code: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/AppointmentProgress?DivisionCode=${code}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || '無法取得看診進度');
      }
      const data: ClinicProgress[] = await res.json();
      
      const now = Date.now();
      const userNumInt = parseInt(userNumber);

      const dataWithEstimation = data.map(item => {
        const key = `${item.ClinicCode}-${item.ShiftCode}-${item.DoctorEmpNo}`;
        const currentSeq = parseInt(item.CurrentVisitSeq);
        
        if (isNaN(currentSeq)) return item;

        // Update history
        if (!historyRef.current[key]) historyRef.current[key] = [];
        const history = historyRef.current[key];
        
        // Only add if sequence changed or it's the first point
        if (history.length === 0 || history[history.length - 1].seq !== currentSeq) {
          history.push({ timestamp: now, seq: currentSeq });
        }

        // Keep only last 10 points or last 30 mins
        if (history.length > 10) history.shift();
        while (history.length > 2 && now - history[0].timestamp > 30 * 60 * 1000) {
          history.shift();
        }

        let estimatedMinutes: number | null = null;
        if (!isNaN(userNumInt) && userNumInt > currentSeq && history.length >= 2) {
          const first = history[0];
          const last = history[history.length - 1];
          const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60); // minutes
          const seqDiff = last.seq - first.seq;

          if (seqDiff > 0 && timeDiff > 0) {
            const minsPerPatient = timeDiff / seqDiff;
            estimatedMinutes = Math.ceil((userNumInt - currentSeq) * minsPerPatient);
          }
        }

        return { ...item, estimatedMinutes };
      });

      const sortedData = [...dataWithEstimation].sort((a, b) => {
        if (targetClinicCode !== 'all') {
          if (a.ClinicCode === targetClinicCode) return -1;
          if (b.ClinicCode === targetClinicCode) return 1;
        }
        return 0;
      });

      setProgress(sortedData);
      setLastUpdated(new Date());
      setError(null);

      if (isNotifyEnabled && userNumber) {
        const target = parseInt(userNumber);
        if (!isNaN(target)) {
          dataWithEstimation.forEach(item => {
            if (targetClinicCode !== 'all' && item.ClinicCode !== targetClinicCode) return;
            checkAndSendNotification(item, target, notifyBefore);
          });
        }
      }
    } catch (err) {
      console.error(err);
      setError('更新進度失敗');
    } finally {
      setLoading(false);
    }
  }, [isNotifyEnabled, userNumber, targetClinicCode, notifyBefore, checkAndSendNotification]);

  useEffect(() => {
    // Clear history when subdivision changes
    historyRef.current = {};
  }, [selectedSubDiv]);

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

  return {
    progress,
    setProgress,
    loading,
    refreshInterval,
    setRefreshInterval,
    isAutoRefresh,
    setIsAutoRefresh,
    error,
    setError,
    lastUpdated,
    countdown,
    fetchProgress
  };
}
