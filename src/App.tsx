/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { Division, SubDivision } from './types';
import { API_BASE } from './constants';
import { useNotifications } from './hooks/useNotifications';
import { useClinicProgress } from './hooks/useClinicProgress';
import { Header } from './components/Header';
import { MobileQuickSettings } from './components/MobileQuickSettings';
import { DivisionSidebar } from './components/DivisionSidebar';
import { ClinicList } from './components/ClinicList';

export default function App() {
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [selectedSubDiv, setSelectedSubDiv] = useState<SubDivision | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userNumber, setUserNumber] = useState<string>('');
  const [notifyBefore, setNotifyBefore] = useState<number>(5);
  const [targetClinicCode, setTargetClinicCode] = useState<string>('all');

  const {
    isNotifyEnabled,
    setIsNotifyEnabled,
    permissionStatus,
    requestNotificationPermission,
    testNotification,
    checkAndSendNotification,
    clearNotified
  } = useNotifications(userNumber);

  const {
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
  } = useClinicProgress(
    selectedSubDiv,
    targetClinicCode,
    setTargetClinicCode,
    isNotifyEnabled,
    userNumber,
    notifyBefore,
    checkAndSendNotification
  );

  // Fetch divisions on mount
  useEffect(() => {
    const fetchDivisions = async () => {
      try {
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
        setDivisions([]);
        console.error(err);
      }
    };
    fetchDivisions();
  }, [setError]);

  const handleSubDivSelect = (subDiv: SubDivision) => {
    setSelectedSubDiv(subDiv);
    setProgress([]);
    setTargetClinicCode('all');
    clearNotified();
    fetchProgress(subDiv.DivisionCode);
  };

  const filteredDivisions = useMemo(() => {
    return (Array.isArray(divisions) ? divisions : []).map(div => ({
      ...div,
      SubDivisions: (Array.isArray(div.SubDivisions) ? div.SubDivisions : []).filter(sub => 
        sub.DivisionName.includes(searchTerm) || 
        div.DivisionName.includes(searchTerm)
      )
    })).filter(div => div.SubDivisions.length > 0);
  }, [divisions, searchTerm]);

  return (
    <div className="min-h-screen bg-[#F5F5F4] text-[#141414] font-sans selection:bg-emerald-100">
      <Header 
        selectedSubDiv={selectedSubDiv}
        isNotifyEnabled={isNotifyEnabled}
        permissionStatus={permissionStatus}
        requestNotificationPermission={requestNotificationPermission}
        progress={progress}
        targetClinicCode={targetClinicCode}
        setTargetClinicCode={setTargetClinicCode}
        userNumber={userNumber}
        setUserNumber={setUserNumber}
        notifyBefore={notifyBefore}
        setNotifyBefore={setNotifyBefore}
        isAutoRefresh={isAutoRefresh}
        setIsAutoRefresh={setIsAutoRefresh}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
        countdown={countdown}
        loading={loading}
        testNotification={testNotification}
      />
      
      <MobileQuickSettings 
        selectedSubDiv={selectedSubDiv}
        targetClinicCode={targetClinicCode}
        setTargetClinicCode={setTargetClinicCode}
        progress={progress}
        userNumber={userNumber}
        setUserNumber={setUserNumber}
        notifyBefore={notifyBefore}
        setNotifyBefore={setNotifyBefore}
        requestNotificationPermission={requestNotificationPermission}
        testNotification={testNotification}
      />

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <DivisionSidebar 
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          loading={loading}
          divisions={divisions}
          selectedSubDiv={selectedSubDiv}
          handleSubDivSelect={handleSubDivSelect}
          filteredDivisions={filteredDivisions}
        />

        <ClinicList 
          selectedSubDiv={selectedSubDiv}
          progress={progress}
          lastUpdated={lastUpdated}
          error={error}
          loading={loading}
          userNumber={userNumber}
          targetClinicCode={targetClinicCode}
          setTargetClinicCode={setTargetClinicCode}
          isNotifyEnabled={isNotifyEnabled}
          requestNotificationPermission={requestNotificationPermission}
        />
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
