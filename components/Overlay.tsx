
import React from 'react';
import { VideoSegment } from '../types';

interface OverlayProps {
  segment: VideoSegment | null;
  sourceLang: string;
  targetLang: string;
}

export const Overlay: React.FC<OverlayProps> = ({ segment, sourceLang, targetLang }) => {
  if (!segment) {
    return (
      <div className="w-full min-h-[160px] bg-slate-900/40 rounded-3xl border border-slate-800 flex items-center justify-center italic text-slate-500 text-sm">
        Silence or awaiting dialogue...
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Source Language Box */}
        <div className="relative group">
          <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded uppercase tracking-widest z-10 shadow-lg">
            {sourceLang}
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/30 shadow-xl min-h-[80px] flex items-center">
            <p className="text-emerald-400 text-lg font-bold leading-tight w-full">
              {segment.original_text}
            </p>
          </div>
        </div>

        {/* Target Language Box */}
        <div className="relative group">
          <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-blue-600 text-white text-[10px] font-black rounded uppercase tracking-widest z-10 shadow-lg">
            {targetLang}
          </div>
          <div className="bg-slate-900/80 backdrop-blur-md p-5 rounded-2xl border border-blue-500/30 shadow-xl min-h-[80px] flex items-center">
            <p className="text-blue-300 text-lg font-semibold leading-tight w-full">
              {segment.translated_text}
            </p>
          </div>
        </div>

      </div>

      {segment.explanation && (
        <div className="px-5 py-2 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-400 italic">
          <span className="font-bold text-slate-300 not-italic mr-2">Note:</span>
          {segment.explanation}
        </div>
      )}
    </div>
  );
};
