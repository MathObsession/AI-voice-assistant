import React, { useRef, useEffect } from 'react';
import { TranscriptMessage } from '../types';

interface TranscriptProps {
  transcript: TranscriptMessage[];
}

export const Transcript: React.FC<TranscriptProps> = ({ transcript }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <div ref={scrollRef} className="w-full h-64 md:h-80 lg:h-96 flex-grow p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
      {transcript.map((msg) => (
        <div
          key={msg.id}
          className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          {msg.sender === 'assistant' && (
            <div className="w-8 h-8 rounded-full bg-cortexz-purple flex-shrink-0"></div>
          )}
          <div
            className={`max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl transition-opacity duration-300
              ${msg.sender === 'user' 
                ? 'bg-cortexz-purple rounded-br-none' 
                : 'bg-gray-700 rounded-bl-none'}
              ${!msg.isFinal ? 'opacity-70' : 'opacity-100'}
            `}
          >
            <p className="text-sm md:text-base">{msg.text || '...'}</p>
          </div>
        </div>
      ))}
    </div>
  );
};