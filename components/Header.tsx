import React from 'react';
import { Grid3X3, Sparkles } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-8 border-b border-gray-800 bg-dark/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-purple-600 p-2 rounded-lg">
            <Grid3X3 className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">TileVision AI</h1>
            <p className="text-xs text-gray-400">Multi-Stream Video Compositor</p>
          </div>
        </div>
        
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-800/50 border border-gray-700">
          <Sparkles className="w-4 h-4 text-secondary" />
          <span className="text-xs font-medium text-gray-300">Powered by Gemini 2.5 Flash</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
