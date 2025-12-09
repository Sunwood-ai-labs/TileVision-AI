import React from 'react';
import { Upload } from 'lucide-react';

interface VideoDropzoneProps {
  onFilesAccepted: (files: File[]) => void;
  disabled?: boolean;
}

const VideoDropzone: React.FC<VideoDropzoneProps> = ({ onFilesAccepted, disabled }) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    
    const files = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith('video/'));
    if (files.length > 0) {
      onFilesAccepted(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAccepted(Array.from(e.target.files));
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`w-full group`}
    >
      <input
        type="file"
        multiple
        accept="video/*"
        onChange={handleFileInput}
        className="hidden"
        id="video-upload"
        disabled={disabled}
      />
      <label 
        htmlFor="video-upload" 
        className={`
            relative w-full flex flex-col items-center justify-center py-8 px-6 rounded-2xl border-[3px] border-black cursor-pointer transition-all duration-200 overflow-hidden
            ${disabled 
                ? 'bg-gray-200 opacity-60 cursor-not-allowed' 
                : 'shadow-pop hover:shadow-pop-lg hover:-translate-y-1 active:translate-y-0 active:shadow-pop'
            }
        `}
      >
        {/* Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-pop-yellow via-pop-pink to-pop-cyan opacity-90 group-hover:opacity-100 transition-opacity" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col items-center">
            <div className="mb-2">
                <Upload size={36} className="text-black drop-shadow-sm" strokeWidth={2.5} />
            </div>
            <span className="text-black font-black text-xl uppercase tracking-wider mb-1">
                UPLOAD VIDEOS
            </span>
            <span className="text-black/80 font-bold text-xs">
                (Max 4 Videos)
            </span>
        </div>
      </label>
    </div>
  );
};

export default VideoDropzone;