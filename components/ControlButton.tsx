
import React from 'react';

interface ControlButtonProps {
  isActive: boolean;
  onClick: () => void;
}

export const ControlButton: React.FC<ControlButtonProps> = ({ isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-opacity-50
        ${isActive 
          ? 'bg-red-600 shadow-lg shadow-red-500/50 hover:bg-red-700 focus:ring-red-400' 
          : 'bg-cortexz-purple shadow-lg shadow-purple-500/50 hover:bg-purple-700 focus:ring-purple-400'}
      `}
      aria-label={isActive ? "Stop conversation" : "Start conversation"}
    >
      <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${isActive ? 'bg-red-500' : 'bg-cortexz-purple'}`}></span>
      <div className="relative text-white w-10 h-10">
        {isActive ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M6 6h12v12H6z"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </div>
    </button>
  );
};
