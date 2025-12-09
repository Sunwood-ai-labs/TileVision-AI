import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full py-6 px-6 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 transform hover:scale-105 transition-transform duration-200 cursor-default">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-pop-text" 
              style={{ 
                textShadow: '3px 3px 0px #fff, 5px 5px 0px rgba(0,0,0,0.1)' 
              }}>
            <span className="text-pop-cyan">Tile</span>
            <span className="text-pop-pink">Pop</span>
            <span className="text-pop-yellow">!</span>
          </h1>
        </div>
        
        {/* Nav Pills - Visual Decoration */}
        <div className="flex items-center gap-4">
            {['Home', 'Concert', 'Settings & Output', 'Exit'].map((item, idx) => (
                <button 
                    key={item}
                    className={`
                        px-6 py-2 rounded-full border-[3px] border-black font-bold text-sm shadow-pop-sm transition-all hover:-translate-y-1 hover:shadow-pop
                        ${item === 'Settings & Output' ? 'bg-pop-cyan text-black' : 'bg-white text-black'}
                    `}
                >
                    {item}
                </button>
            ))}
        </div>
      </div>
    </header>
  );
};

export default Header;