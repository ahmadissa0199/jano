
import React, { useState, useRef, useEffect } from 'react';
import { analyzeVideo } from './services/geminiService';
import { AppState, GeminiResponse, VideoSegment } from './types';
import { LanguageSelect } from './components/LanguageSelect';
import { Overlay } from './components/Overlay';

const LANGUAGES = [
  { label: 'Arabic', value: 'Arabic' },
  { label: 'German', value: 'German' },
  { label: 'English', value: 'English' },
  { label: 'French', value: 'French' },
  { label: 'Spanish', value: 'Spanish' },
  { label: 'Japanese', value: 'Japanese' },
];

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    videoFile: null,
    videoUrl: null,
    youtubeId: null,
    videoSrc: null,
    isLoading: false,
    error: null,
    results: null,
    currentTime: 0,
  });

  const [inputType, setInputType] = useState<'file' | 'url'>('file');
  const [urlInputValue, setUrlInputValue] = useState('');
  const [sourceLang, setSourceLang] = useState('Arabic');
  const [targetLang, setTargetLang] = useState('German');
  const [ytApiLoaded, setYtApiLoaded] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const ytIntervalRef = useRef<number | null>(null);
  const activeSegmentRef = useRef<HTMLButtonElement>(null);

  // Auto-scroll logic for segments list
  useEffect(() => {
    if (activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [state.currentTime]);

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setYtApiLoaded(true);
      };
    } else if (window.YT && window.YT.Player) {
      setYtApiLoaded(true);
    }

    return () => {
      if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
    };
  }, []);

  const initYTPlayer = (videoId: string) => {
    const playerElement = document.getElementById('yt-player');
    if (!ytApiLoaded || !window.YT || !window.YT.Player || !playerElement) return;

    if (ytPlayerRef.current) {
      try { ytPlayerRef.current.destroy(); } catch (e) {}
      ytPlayerRef.current = null;
    }

    const origin = window.location.protocol + '//' + window.location.host;

    try {
      ytPlayerRef.current = new window.YT.Player('yt-player', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: { 
          'autoplay': 0, 
          'modestbranding': 1, 
          'rel': 0,
          'enablejsapi': 1,
          'origin': origin,
          'widget_referrer': origin
        },
        events: {
          'onStateChange': (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
              ytIntervalRef.current = window.setInterval(() => {
                if (ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
                  setState(prev => ({ ...prev, currentTime: ytPlayerRef.current.getCurrentTime() }));
                }
              }, 500);
            } else {
              if (ytIntervalRef.current) clearInterval(ytIntervalRef.current);
            }
          },
        }
      });
    } catch (err) {
      setState(prev => ({ ...prev, error: 'YouTube player initialization error.' }));
    }
  };

  useEffect(() => {
    if (state.youtubeId && ytApiLoaded) {
      const timer = setTimeout(() => initYTPlayer(state.youtubeId!), 200);
      return () => clearTimeout(timer);
    }
  }, [state.youtubeId, ytApiLoaded]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (state.videoSrc && state.videoFile) URL.revokeObjectURL(state.videoSrc);
      setState(prev => ({
        ...prev,
        videoFile: file,
        videoUrl: null,
        youtubeId: null,
        videoSrc: URL.createObjectURL(file),
        results: null,
        error: null,
        currentTime: 0
      }));
    }
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = urlInputValue.trim();
    if (!url) return;
    const ytId = getYouTubeId(url);
    setState(prev => ({
      ...prev,
      videoFile: null,
      videoUrl: url,
      youtubeId: ytId,
      videoSrc: ytId ? null : url,
      results: null,
      error: null,
      currentTime: 0
    }));
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
    });
  };

  const handleAnalyze = async () => {
    if (!state.videoSrc && !state.youtubeId) return;
    if (state.youtubeId) {
       setState(prev => ({ ...prev, error: "Due to CORS, YouTube videos must be uploaded as files for full neural translation." }));
       return;
    }
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const base64 = state.videoFile ? await fileToBase64(state.videoFile) : "";
      const mimeType = state.videoFile?.type || "video/mp4";
      const data = await analyzeVideo(base64, mimeType, sourceLang, targetLang);
      setState(prev => ({ ...prev, results: data, isLoading: false }));
    } catch (err: any) {
      setState(prev => ({ ...prev, isLoading: false, error: err.message }));
    }
  };

  const parseTimestamp = (ts: string): number => {
    const parts = ts.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const currentSegment = state.results?.segments.find(seg => {
    const start = parseTimestamp(seg.timestamp_start);
    const end = parseTimestamp(seg.timestamp_end);
    return state.currentTime >= start && state.currentTime <= end;
  }) || null;

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-600/20">
             <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-emerald-500 bg-clip-text text-transparent">
              Translate-Tube
            </h1>
            <p className="text-slate-400 font-bold tracking-[0.2em] text-[10px] uppercase">Neural Sentence Translation</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-end gap-4 bg-slate-900/80 p-5 rounded-3xl border border-slate-800 shadow-2xl backdrop-blur-xl">
          <div className="flex gap-4 min-w-[320px]">
            <LanguageSelect label="Source" value={sourceLang} onChange={setSourceLang} options={LANGUAGES} />
            <LanguageSelect label="Target" value={targetLang} onChange={setTargetLang} options={LANGUAGES} />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={state.isLoading || (!state.videoSrc && !state.videoFile)}
            className={`px-10 py-3 rounded-xl font-black transition-all shadow-xl ${
              state.isLoading || (!state.videoSrc && !state.videoFile)
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed opacity-50' 
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30 active:scale-95'
            }`}
          >
            {state.isLoading ? 'Processing Sentences...' : 'Analyze Full Video'}
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        <div className="lg:col-span-3 flex flex-col gap-6">
          <div className="relative aspect-video bg-black rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-4 border-slate-800 ring-1 ring-white/5 group">
            
            <div id="yt-player" className={`w-full h-full ${state.youtubeId ? 'block' : 'hidden'}`}></div>

            {state.videoSrc && !state.youtubeId && (
              <video
                ref={videoRef}
                src={state.videoSrc}
                onTimeUpdate={() => setState(p => ({ ...p, currentTime: videoRef.current?.currentTime || 0 }))}
                controls
                className="w-full h-full object-contain"
                crossOrigin="anonymous"
              />
            )}

            {!state.videoSrc && !state.youtubeId && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/60 backdrop-blur-3xl">
                <div className="flex gap-2 mb-12 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-700 shadow-2xl">
                  <button onClick={() => setInputType('file')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${inputType === 'file' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Upload File</button>
                  <button onClick={() => setInputType('url')} className={`px-8 py-2.5 rounded-xl text-sm font-black transition-all ${inputType === 'url' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>Link</button>
                </div>

                {inputType === 'file' ? (
                  <label className="cursor-pointer group/upload flex flex-col items-center gap-6 bg-slate-800/40 hover:bg-slate-700/40 px-20 py-12 rounded-[2.5rem] font-black transition-all text-slate-200 border-4 border-dashed border-slate-700 hover:border-blue-500/50">
                    <div className="w-24 h-24 rounded-3xl bg-slate-900 flex items-center justify-center border-2 border-slate-800 group-hover/upload:scale-110 group-hover/upload:rotate-3 transition-all">
                      <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <span className="text-xl tracking-tight">Select your video</span>
                    <input type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                  </label>
                ) : (
                  <form onSubmit={handleUrlSubmit} className="flex flex-col items-center gap-6 w-full max-w-lg">
                    <input 
                      type="url" 
                      value={urlInputValue}
                      onChange={(e) => setUrlInputValue(e.target.value)}
                      placeholder="Paste link here"
                      className="w-full bg-slate-900/90 border-2 border-slate-700 rounded-3xl px-8 py-6 text-slate-100 outline-none focus:ring-4 focus:ring-blue-500/30 transition-all"
                      required
                    />
                    <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-16 py-5 rounded-full font-black text-xl transition-all active:scale-95">Load Video</button>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Translation Area - Now Below the Video */}
          {(state.videoSrc || state.youtubeId) && (
            <div className="mt-2">
               <Overlay segment={currentSegment} sourceLang={sourceLang} targetLang={targetLang} />
            </div>
          )}
          
          {state.error && (
            <div className="bg-red-950/40 border-2 border-red-500/50 text-red-100 p-6 rounded-[2rem] text-sm flex items-start gap-5 animate-in slide-in-from-top-4 backdrop-blur-xl">
               <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               </div>
               <div className="flex-1">
                  <p className="font-black text-lg text-red-400 mb-1 tracking-tight">System Notice</p>
                  <p className="opacity-80 leading-relaxed font-medium">{state.error}</p>
               </div>
               <button onClick={() => setState(p => ({ ...p, error: null }))} className="text-slate-500 hover:text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
               </button>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6">
           <div className="bg-slate-900/60 rounded-[2rem] p-6 border-2 border-slate-800 h-[800px] flex flex-col shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 opacity-20"></div>
              
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black tracking-tight">Transcript</h2>
                {state.results && <span className="text-[10px] font-black bg-slate-800 text-blue-400 px-4 py-2 rounded-full border border-slate-700 uppercase tracking-widest">{state.results.segments.length} Sentences</span>}
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 -mr-4">
                {state.results?.segments.map((seg, idx) => {
                  const isActive = currentSegment === seg;
                  return (
                    <button
                      key={idx}
                      ref={isActive ? activeSegmentRef : null}
                      onClick={() => {
                        if (state.youtubeId && ytPlayerRef.current) ytPlayerRef.current.seekTo(parseTimestamp(seg.timestamp_start));
                        else if (videoRef.current) videoRef.current.currentTime = parseTimestamp(seg.timestamp_start);
                      }}
                      className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group/item relative overflow-hidden ${
                        isActive 
                          ? 'bg-blue-500/10 border-blue-500/50 shadow-lg scale-[1.01]' 
                          : 'bg-slate-800/30 border-transparent hover:bg-slate-800/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${isActive ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                          {seg.timestamp_start}
                        </span>
                        {isActive && <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>}
                      </div>
                      <p className={`text-sm font-bold leading-snug tracking-tight ${isActive ? 'text-blue-300' : 'text-slate-200'}`}>{seg.original_text}</p>
                    </button>
                  );
                }) || (
                  <div className="flex flex-col items-center justify-center h-full text-slate-700 text-center px-4 space-y-6 opacity-30">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    <p className="font-black text-sm uppercase tracking-tighter">Awaiting analysis</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </main>

      <footer className="mt-auto py-12 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-6 opacity-40">
         <p className="text-[10px] font-black uppercase tracking-[0.5em]">Translate-Tube &bull; Neural Translation Engine</p>
         <div className="flex gap-8 items-center">
            <span className="text-[10px] font-black uppercase tracking-widest bg-slate-800 px-4 py-2 rounded-full border border-slate-700">Gemini 3.0 Flash</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Sentence Tracking Active</span>
         </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
        
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
      `}</style>
    </div>
  );
};

export default App;