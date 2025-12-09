import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import VideoDropzone from './components/VideoDropzone';
import { QueuedVideo, ExportStatus, VideoResolution } from './types';
import { Trash2, Film, Download, Video, Loader2, Sparkles, Wand2, Plus } from 'lucide-react';
import { renderGridVideo, captureFrame } from './services/videoProcessor';
import { generateVideoMetadata } from './services/geminiService';

const MAX_VIDEOS = 4;

const App: React.FC = () => {
  const [videos, setVideos] = useState<(QueuedVideo | null)[]>([null, null, null, null]);
  const [status, setStatus] = useState<ExportStatus>(ExportStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadExt, setDownloadExt] = useState<string>("mp4");
  const [resolution, setResolution] = useState<VideoResolution>('1080p');
  
  // AI Metadata State
  const [suggestedFilename, setSuggestedFilename] = useState("");
  const [aiDescription, setAiDescription] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Hidden file input for individual slots
  const slotInputRef = useRef<HTMLInputElement>(null);
  const activeSlotIndex = useRef<number>(-1);

  const handleFiles = useCallback(async (files: File[]) => {
    // Fill empty slots
    setVideos(prev => {
      const newVideos = [...prev];
      let fileIdx = 0;
      
      // If a specific slot was clicked
      if (activeSlotIndex.current !== -1) {
          if (files.length > 0) {
             const file = files[0];
             const url = URL.createObjectURL(file);
             newVideos[activeSlotIndex.current] = {
                 id: Math.random().toString(36).substr(2, 9),
                 file,
                 url,
             };
             captureFrame(file).then(thumb => {
                setVideos(current => current.map((v, idx) => (idx === activeSlotIndex.current && v?.url === url) ? { ...v, thumbnail: thumb } : v));
             });
          }
          activeSlotIndex.current = -1; // Reset
      } else {
        // General upload (fill first available)
        for (let i = 0; i < MAX_VIDEOS; i++) {
            if (newVideos[i] === null && fileIdx < files.length) {
              const file = files[fileIdx];
              const url = URL.createObjectURL(file);
              newVideos[i] = {
                id: Math.random().toString(36).substr(2, 9),
                file,
                url,
              };
              captureFrame(file).then(thumb => {
                setVideos(current => current.map(v => (v && v.url === url) ? { ...v, thumbnail: thumb } : v));
              });
              fileIdx++;
            }
          }
      }
      return newVideos;
    });
  }, []);

  const onSlotClick = (index: number) => {
    if (videos[index] === null) {
        activeSlotIndex.current = index;
        slotInputRef.current?.click();
    }
  };

  const removeVideo = (index: number) => {
    setVideos(prev => {
      const newVideos = [...prev];
      if (newVideos[index]) {
        URL.revokeObjectURL(newVideos[index]!.url);
      }
      newVideos[index] = null;
      return newVideos;
    });
    setDownloadUrl(null);
    setStatus(ExportStatus.IDLE);
  };

  const handleAiGenerate = async () => {
    const validVideos = videos.filter(v => v !== null && v.thumbnail) as QueuedVideo[];
    if (validVideos.length === 0) return;

    setIsAiThinking(true);
    try {
      const thumbnails = validVideos.map(v => v.thumbnail!);
      const meta = await generateVideoMetadata(thumbnails);
      setSuggestedFilename(meta.title.replace(/\s+/g, '-').toLowerCase());
      setAiDescription(meta.description);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleExport = async () => {
    if (videos.every(v => v === null)) return;

    setStatus(ExportStatus.PREPARING);
    setDownloadUrl(null);
    setProgress(0);

    const width = resolution === '4k' ? 3840 : 1920;
    const height = resolution === '4k' ? 2160 : 1080;

    try {
      await new Promise(r => setTimeout(r, 100));
      setStatus(ExportStatus.RECORDING);

      const result = await renderGridVideo(
        videos, 
        {
          width,
          height,
          gap: 0,
          backgroundColor: '#000000',
          includeAudio: true
        },
        (pct) => setProgress(pct)
      );

      const url = URL.createObjectURL(result.blob);
      setDownloadUrl(url);
      setDownloadExt(result.extension);
      setStatus(ExportStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(ExportStatus.ERROR);
      alert("Failed to export video. Please try again with shorter clips or supported formats.");
    }
  };

  // Grid Colors matching mockup
  const slotColors = [
      'bg-pop-pink',   // TL
      'bg-pop-cyan',   // TR
      'bg-pop-yellow', // BL
      'bg-pop-green'   // BR
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        
        {/* Main White Container */}
        <div className="bg-white border-[6px] border-black rounded-[40px] shadow-pop-lg p-6 md:p-10 flex flex-col lg:flex-row gap-10 min-h-[600px]">
            
            {/* Left Column: Grid */}
            <div className="flex-1 flex flex-col gap-6">
                <div className="relative aspect-video w-full rounded-[30px] border-[5px] border-black overflow-hidden shadow-pop bg-white">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                        {videos.map((video, idx) => (
                            <div 
                                key={idx} 
                                onClick={() => !video && onSlotClick(idx)}
                                className={`
                                    relative w-full h-full border-2 border-black/10 transition-all duration-200
                                    ${video ? 'bg-black' : `${slotColors[idx]} cursor-pointer hover:brightness-105 active:scale-95`}
                                `}
                            >
                                {/* Dashed Border for Empty State */}
                                {!video && (
                                    <div className="absolute inset-4 border-[3px] border-dashed border-black/30 rounded-2xl flex items-center justify-center">
                                         {/* Plus Button - White Circle with Black Border */}
                                         <div className="bg-white border-[3px] border-black rounded-full p-2.5 shadow-sm transform group-hover:scale-110 transition-transform">
                                            <Plus size={32} className="text-black" strokeWidth={3} />
                                         </div>
                                         <span className="sr-only">Add Video</span>
                                    </div>
                                )}

                                {video && (
                                    <div className="relative w-full h-full group">
                                        <video 
                                            src={video.url} 
                                            className="w-full h-full object-cover"
                                            muted 
                                        />
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); removeVideo(idx); }}
                                            className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full border-2 border-black shadow-pop-sm hover:scale-110 transition-transform z-10"
                                        >
                                            <Trash2 size={16} strokeWidth={3} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Speech Bubble Tooltip for Empty Grid */}
                    {videos.every(v => v === null) && (
                         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                             <div className="relative">
                                 <div className="bg-white border-[3px] border-black px-6 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] text-black font-extrabold text-lg whitespace-nowrap">
                                     Drop videos here!
                                 </div>
                                 {/* Arrow */}
                                 <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-t-[12px] border-t-black border-r-[12px] border-r-transparent"></div>
                                 <div className="absolute -bottom-[8px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white border-r-[8px] border-r-transparent"></div>
                             </div>
                         </div>
                    )}

                    {/* Hidden Global Input for Slots */}
                    <input
                        ref={slotInputRef}
                        type="file"
                        accept="video/*"
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                handleFiles(Array.from(e.target.files));
                            }
                        }}
                        className="hidden"
                    />
                </div>

                {/* Progress Bar */}
                {(status === ExportStatus.RECORDING || status === ExportStatus.PREPARING) && (
                    <div className="w-full border-4 border-black rounded-full h-8 bg-gray-100 overflow-hidden relative shadow-pop-sm">
                        <div 
                            className="h-full bg-pop-pink transition-all duration-300 border-r-4 border-black" 
                            style={{ width: `${progress}%` }}
                        ></div>
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold uppercase tracking-wider text-black">
                            Processing {Math.round(progress)}%
                        </span>
                    </div>
                )}
            </div>

            {/* Right Column: Settings Panel */}
            <div className="w-full lg:w-[380px] flex flex-col gap-4">
                 <div className="border-[5px] border-black rounded-[32px] p-0 bg-white shadow-pop flex flex-col gap-0 h-full overflow-hidden">
                     
                     {/* Header */}
                     <div className="bg-white border-b-[4px] border-black p-5 text-center">
                        <h2 className="text-xl font-black text-black uppercase tracking-wide">
                            Settings & Output
                        </h2>
                     </div>

                     <div className="p-6 flex flex-col gap-6 flex-1">
                        {/* Upload Area */}
                        <VideoDropzone onFilesAccepted={handleFiles} disabled={status === ExportStatus.RECORDING} />

                        {/* Title & AI */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-black text-black uppercase tracking-wide">Title</label>
                                <button 
                                    onClick={handleAiGenerate}
                                    disabled={isAiThinking || videos.every(v => v === null)}
                                    className="text-xs flex items-center gap-1 text-pop-purple hover:text-pop-pink font-bold disabled:opacity-50"
                                >
                                    {isAiThinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                                    Auto-Generate
                                </button>
                            </div>
                            <input 
                                type="text" 
                                value={suggestedFilename}
                                onChange={(e) => setSuggestedFilename(e.target.value)}
                                placeholder="Enter title..."
                                className="w-full border-[3px] border-black rounded-xl px-4 py-3 font-bold text-gray-700 bg-white focus:outline-none focus:bg-pop-bg-start transition-colors placeholder:text-gray-300"
                            />
                            {aiDescription && (
                                <p className="text-xs text-gray-500 italic px-2">
                                    "{aiDescription}"
                                </p>
                            )}
                        </div>

                        {/* Resolution Toggle */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-black uppercase tracking-wide">Resolution</label>
                            <div className="flex bg-white rounded-xl border-[3px] border-black p-1">
                                <button
                                    onClick={() => setResolution('1080p')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border-2 ${resolution === '1080p' ? 'bg-pop-cyan text-black border-black shadow-sm' : 'text-gray-400 border-transparent hover:text-black'}`}
                                >
                                    1080p
                                </button>
                                <button
                                    onClick={() => setResolution('4k')}
                                    className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all border-2 ${resolution === '4k' ? 'bg-pop-cyan text-black border-black shadow-sm' : 'text-gray-400 border-transparent hover:text-black'}`}
                                >
                                    4K
                                </button>
                            </div>
                        </div>

                        <div className="flex-1"></div>

                        {/* Action Button */}
                        {status === ExportStatus.COMPLETED && downloadUrl ? (
                            <div className="space-y-2">
                                <a 
                                    href={downloadUrl}
                                    download={`${suggestedFilename || 'tile-video'}.${downloadExt}`}
                                    className="block w-full bg-pop-green hover:bg-[#8eef65] text-black border-[3px] border-black rounded-xl py-4 font-black text-lg text-center shadow-pop hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-pop-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all uppercase"
                                >
                                    Download Video
                                </a>
                                <button 
                                    onClick={() => { setDownloadUrl(null); setStatus(ExportStatus.IDLE); }}
                                    className="w-full text-center text-xs font-bold text-gray-400 hover:text-black underline decoration-2"
                                >
                                    Reset & Start Over
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={handleExport}
                                disabled={status === ExportStatus.RECORDING || videos.every(v => v === null)}
                                className={`
                                    w-full border-[3px] border-black rounded-xl py-4 font-black text-lg shadow-pop transition-all uppercase flex items-center justify-center gap-2
                                    ${status === ExportStatus.RECORDING 
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none translate-x-[4px] translate-y-[4px]' 
                                        : 'bg-pop-pink hover:bg-[#ff4785] text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-pop-sm active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                                    }
                                `}
                            >
                                {status === ExportStatus.RECORDING ? (
                                    <Loader2 className="animate-spin" />
                                ) : "Create Tile Video!"}
                            </button>
                        )}
                     </div>
                 </div>
            </div>

        </div>
      </main>
    </div>
  );
};

export default App;