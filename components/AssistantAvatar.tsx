import React from 'react';
import { AssistantState } from '../types';

interface AssistantAvatarProps {
  state: AssistantState;
}

const IdleState: React.FC = () => (
  <div className="relative w-48 h-48 sm:w-64 sm:h-64">
    <div className="absolute inset-0 bg-gray-800 rounded-full"></div>
    <div className="absolute inset-0 border-2 border-cortexz-purple rounded-full opacity-50"></div>
     <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 bg-cortexz-purple rounded-full shadow-lg opacity-80 animate-color-pulse-purple"></div>
    </div>
  </div>
);

const PassiveListeningState: React.FC = () => (
  <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
      <div className="absolute w-full h-full rounded-full bg-cortexz-purple/20 animate-breathing"></div>
      <div className="absolute w-4/5 h-4/5 rounded-full bg-cortexz-purple/30 animate-pulse-slow"></div>
      <div className="w-3/5 h-3/5 rounded-full bg-cortexz-purple shadow-lg animate-color-pulse-purple"></div>
  </div>
);

const ThinkingState: React.FC = () => (
    <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center overflow-hidden">
        <div className="absolute w-full h-full bg-cortexz-purple/10 rounded-full"></div>
        <div className="absolute w-1/2 h-1/2 bg-cortexz-purple/50 rounded-full animate-pulse-slow"></div>
        <div className="absolute w-1/3 h-1/3 rounded-full border-2 border-cortexz-yellow animate-scanner"></div>
        <div className="absolute w-1/4 h-1/4 rounded-full bg-cortexz-light-purple animate-pulse"></div>
        <div className="absolute inset-0 border-t-2 border-cortexz-light-purple rounded-full animate-swirl [animation-direction:reverse]"></div>
    </div>
);

const SpeakingState: React.FC = () => (
  <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
    {/* Central Orb */}
    <div className="w-24 h-24 bg-cortexz-yellow rounded-full animate-color-shift-speak"></div>
    {/* Emanating waves */}
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="absolute w-full h-full rounded-full border-2 border-cortexz-light-purple"
        style={{
          animation: `wave 2.5s linear ${i * 0.5}s infinite`,
        }}
      />
    ))}
  </div>
);

const ErrorState: React.FC = () => (
  <div className="relative w-48 h-48 sm:w-64 sm:h-64 flex items-center justify-center">
     <div className="absolute inset-0 bg-red-500/20 rounded-full animate-pulse"></div>
     <div className="w-24 h-24 text-red-500">
       <svg xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>
     </div>
  </div>
);

export const AssistantAvatar: React.FC<AssistantAvatarProps> = ({ state }) => {
  const renderState = () => {
    switch (state) {
      case AssistantState.IDLE:
        return <IdleState />;
      case AssistantState.PASSIVE_LISTENING:
        return <PassiveListeningState />;
      case AssistantState.THINKING:
        return <ThinkingState />;
      case AssistantState.SPEAKING:
        return <SpeakingState />;
      case AssistantState.ERROR:
        return <ErrorState />;
      default:
        return <IdleState />;
    }
  };

  return <div className="transition-all duration-500 ease-in-out">{renderState()}</div>;
};