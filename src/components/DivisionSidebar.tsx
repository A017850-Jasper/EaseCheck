import { Search, RefreshCw, ChevronRight } from 'lucide-react';
import { Division, SubDivision } from '../types';

interface DivisionSidebarProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  loading: boolean;
  divisions: Division[];
  selectedSubDiv: SubDivision | null;
  handleSubDivSelect: (subDiv: SubDivision) => void;
  filteredDivisions: Division[];
}

export function DivisionSidebar({
  searchTerm,
  setSearchTerm,
  loading,
  divisions,
  selectedSubDiv,
  handleSubDivSelect,
  filteredDivisions
}: DivisionSidebarProps) {
  return (
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
  );
}
