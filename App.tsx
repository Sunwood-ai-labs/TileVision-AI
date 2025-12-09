import React, { useState, useCallback, useRef } from 'react';
import Header from './components/Header';
import VideoDropzone from './components/VideoDropzone';
import { QueuedVideo, ExportStatus } from './types';
import { Trash2, Film, Download, Video, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { renderGridVideo, captureFrame } from './services/videoProcessor';
import { generateVideoMetadata } from './services/geminiService';

const MAX_VIDEOS = 4;

const App: React.FC = () => {
  const [videos, setVideos] = useState<(QueuedVideo | null)[]>([null, null, null, null]);
  const [status, setStatus] = useState<ExportStatus>(ExportStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  // AI Metadata State
  const [suggestedFilename, setSuggestedFilename] = useState("video-grid-export");
  const [aiDescription, setAiDescription] = useState<string>("");
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleFiles = useCallback(async (files: File[]) => {
    // Fill empty slots
    setVideos(prev => {
      const newVideos = [...prev];
      let fileIdx = 0;
      
      for (let i = 0; i < MAX_VIDEOS; i++) {
        if (newVideos[i] === null && fileIdx < files.length) {
          const file = files[fileIdx];
          const url = URL.createObjectURL(file);
          // Async update needed for thumbnail, but we update state immediately to show placeholder
          newVideos[i] = {
            id: Math.random().toString(36).substr(2, 9),
            file,
            url,
          };
          
          // Capture thumbnail separately
          captureFrame(file).then(thumb => {
            setVideos(current => current.map(v => (v && v.url === url) ? { ...v, thumbnail: thumb } : v));
          });

          fileIdx++;
        }
      }
      return newVideos;
    });
  }, []);

  const removeVideo = (index: number) => {
    setVideos(prev => {
      const newVideos = [...prev];
      if (newVideos[index]) {
        URL.revokeObjectURL(newVideos[index]!.url);
      }
      newVideos[index] = null;
      return newVideos;
    });
    // Reset export state if user changes content
    setDownloadUrl(null);
    setStatus(ExportStatus.IDLE);
  };

  const handleAiGenerate = async () => {
    const validVideos = videos.filter(v => v !== null && v.thumbnail) as QueuedVideo[];
    if (validVideos.length === 0) return;

    setIsAiThinking(true);
    try {
      // Collect thumbnails
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

    try {
      // Wait a moment for UI update
      await new Promise(r => setTimeout(r, 100));
      setStatus(ExportStatus.RECORDING);

      const blob = await renderGridVideo(
        videos, 
        {
          width: 1920,
          height: 1080,
          gap: 0,
          backgroundColor: '#000000',
          includeAudio: true
        },
        (pct) => setProgress(pct)
      );

      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus(ExportStatus.COMPLETED);
    } catch (error) {
      console.error(error);
      setStatus(ExportStatus.ERROR);
      alert("Failed to export video. Please try again with shorter clips or supported formats.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col pb-20">
      <Header />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Controls */}
        <div className="flex flex-col md:flex-row gap-6 mb-8 items-start md:items-end justify-between">
           <div>
             <h2 className="text-2xl font-bold text-white mb-2">Workspace</h2>
             <p className="text-gray-400">Upload up to 4 videos. Drag to fill slots.</p>
           </div>
           
           <div className="flex gap-3">
              <button 
                onClick={() => setVideos([null, null, null, null])}
                className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition font-medium text-sm"
              >
                Clear All
              </button>
           </div>
        </div>

        {/* Main Grid Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left: Video Grid */}
          <div className="lg:col-span-2 space-y-4">
             <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800 grid grid-cols-2 grid-rows-2 relative group">
                {videos.map((video, idx) => (
                  <div key={idx} className="relative w-full h-full border border-gray-900/50 bg-gray-900 overflow-hidden">
                    {video ? (
                      <div className="relative w-full h-full group/slot">
                        <video 
                          src={video.url} 
                          className="w-full h-full object-cover"
                          muted // Muted in preview
                        />
                        <button 
                          onClick={() => removeVideo(idx)}
                          className="absolute top-2 right-2 p-1.5 bg-red-500/90 hover:bg-red-600 text-white rounded-md opacity-0 group-hover/slot:opacity-100 transition-opacity z-10"
                        >
                          <Trash2 size={16} />
                        </button>
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 rounded text-xs text-white font-mono">
                          SRC {idx + 1}
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center opacity-30">
                         <div className="text-center">
                            <Video className="w-8 h-8 mx-auto mb-1" />
                            <span className="text-xs">Empty Slot</span>
                         </div>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Center overlay if completely empty */}
                {videos.every(v => v === null) && (
                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="text-gray-600 font-medium">Preview Area</div>
                   </div>
                )}
             </div>

             {/* Progress Bar */}
             {(status === ExportStatus.RECORDING || status === ExportStatus.PREPARING) && (
                <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                  <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
             )}
          </div>

          {/* Right: Controls & Upload */}
          <div className="space-y-6">
            <div className="h-40">
              <VideoDropzone onFilesAccepted={handleFiles} disabled={status === ExportStatus.RECORDING} />
            </div>

            {/* AI Section */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="font-semibold text-gray-200 flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-secondary" />
                   AI Analysis
                 </h3>
                 <button
                    onClick={handleAiGenerate}
                    disabled={isAiThinking || videos.every(v => v === null)}
                    className="text-xs bg-secondary/10 text-secondary hover:bg-secondary/20 px-3 py-1.5 rounded-full transition disabled:opacity-50 flex items-center gap-1.5"
                 >
                   {isAiThinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                   Generate Info
                 </button>
               </div>
               
               <div className="space-y-3">
                 <div>
                    <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Title Idea</label>
                    <input 
                      type="text" 
                      value={suggestedFilename}
                      onChange={(e) => setSuggestedFilename(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-primary transition"
                    />
                 </div>
                 {aiDescription && (
                   <div className="bg-gray-800/50 p-3 rounded-md border border-gray-700/50">
                      <p className="text-sm text-gray-300 italic">"{aiDescription}"</p>
                   </div>
                 )}
               </div>
            </div>

            {/* Export Section */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
              <h3 className="font-semibold text-gray-200 mb-4 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Export
              </h3>
              
              {status === ExportStatus.COMPLETED && downloadUrl ? (
                <a 
                  href={downloadUrl}
                  download={`${suggestedFilename}.mp4`}
                  className="flex items-center justify-center gap-2 w-full bg-secondary hover:bg-emerald-400 text-white font-bold py-3 px-4 rounded-xl transition shadow-lg shadow-emerald-900/20"
                >
                  <Download size={20} />
                  Download MP4
                </a>
              ) : (
                <button
                  onClick={handleExport}
                  disabled={status === ExportStatus.RECORDING || videos.every(v => v === null)}
                  className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl transition shadow-lg
                    ${status === ExportStatus.RECORDING 
                       ? 'bg-gray-800 text-gray-400 cursor-not-allowed' 
                       : 'bg-primary hover:bg-indigo-400 text-white shadow-indigo-900/20'
                    }`}
                >
                  {status === ExportStatus.RECORDING ? (
                     <>
                       <Loader2 className="animate-spin" size={20} />
                       Rendering... {Math.round(progress)}%
                     </>
                  ) : (
                    <>
                      <Film size={20} />
                      Render 2x2 Grid
                    </>
                  )}
                </button>
              )}

              {status === ExportStatus.RECORDING && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Processing in real-time. Please keep tab open.
                </p>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;
