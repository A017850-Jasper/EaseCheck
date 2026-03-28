import { ClinicProgress } from '../types';

export const getNumberColorClass = (item: ClinicProgress, userNumber: string) => {
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
