import { useState, useCallback, useRef } from 'react';
import { ClinicProgress } from '../types';

export function useNotifications(userNumber: string) {
  const [isNotifyEnabled, setIsNotifyEnabled] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const notifiedRef = useRef<Set<string>>(new Set());

  const sendNotification = useCallback((item: ClinicProgress, diff: number) => {
    if (Notification.permission === 'granted') {
      console.log('Sending notification:', item.ClinicName, diff);
      const title = diff === 0 ? '您的號碼到了！' : '新光醫院到號通知';
      const body = diff === 0 
        ? `${item.ClinicName} (${item.DoctorName}) 目前號碼已經是 ${item.CurrentVisitSeq}，請立即前往診室！`
        : `${item.ClinicName} (${item.DoctorName}) 目前號碼 ${item.CurrentVisitSeq}，距離您的號碼 ${userNumber} 還有 ${diff} 號！`;
      
      new Notification(title, {
        body,
        icon: 'https://www.skh.org.tw/skh/images/logo.png'
      });
      
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
    } else {
      console.warn('Notification permission not granted:', Notification.permission);
    }
  }, [userNumber]);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('此瀏覽器不支援桌面通知');
      return;
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !(window.navigator as any).standalone) {
      alert('iOS 使用者請先將此網頁「加入主畫面」才能接收桌面通知。');
    }
    
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
    
    setIsNotifyEnabled(prev => !prev);
  };

  const clearNotified = useCallback(() => {
    notifiedRef.current.clear();
  }, []);

  const checkAndSendNotification = useCallback((item: ClinicProgress, target: number, notifyBefore: number) => {
    const current = parseInt(item.CurrentVisitSeq);
    if (!isNaN(current)) {
      const diff = target - current;
      const clinicKey = `${item.ClinicCode}-${item.ShiftCode}-${target}`;
      
      if (diff >= 0 && diff <= notifyBefore && !notifiedRef.current.has(clinicKey)) {
        sendNotification(item, diff);
        notifiedRef.current.add(clinicKey);
      }
    }
  }, [sendNotification]);

  return {
    isNotifyEnabled,
    setIsNotifyEnabled,
    permissionStatus,
    requestNotificationPermission,
    sendNotification,
    checkAndSendNotification,
    clearNotified
  };
}
