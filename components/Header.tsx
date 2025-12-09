import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 transform hover:scale-105 transition-transform duration-200 cursor-default">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-pop-text" 
              style={{ 
                textShadow: '3px 3px 0px #fff, 5px 5px 0px rgba(0,0,0,0.1)' 
              }}>
            <span className="text-pop-cyan">Tile</span>
            <span className="text-pop-pink">Pop</span>
            <span className="text-pop-yellow">!</span>
          </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;