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

  const fetchProgress = useCallback(async (code: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/AppointmentProgress?DivisionCode=${code}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || '無法取得看診進度');
      }
      const data: ClinicProgress[] = await res.json();
      
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

      if (isNotifyEnabled && userNumber) {
        const target = parseInt(userNumber);
        if (!isNaN(target)) {
          data.forEach(item => {
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
