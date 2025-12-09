import React, { useCallback } from 'react';
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
      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-colors h-full min-h-[200px]
        ${disabled 
          ? 'border-gray-700 bg-gray-900/50 opacity-50 cursor-not-allowed' 
          : 'border-gray-600 bg-gray-800/50 hover:border-primary hover:bg-gray-800 cursor-pointer'
        }`}
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
      <label htmlFor="video-upload" className="flex flex-col items-center cursor-pointer w-full h-full justify-center">
        <div className="p-4 rounded-full bg-gray-800 mb-4 text-primary">
          <Upload size={32} />
        </div>
        <h3 className="text-lg font-semibold text-gray-200 mb-2">Drop videos here</h3>
        <p className="text-sm text-gray-400 text-center max-w-xs">
          Upload up to 4 videos. We'll arrange them in a grid automatically.
        </p>
      </label>
    </div>
  );
};

export default VideoDropzone;