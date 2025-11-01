import React, { useRef, useEffect } from 'react';
import { useLiveAssistant } from './hooks/useLiveAssistant';
import { AssistantAvatar } from './components/AssistantAvatar';
import { ControlButton } from './components/ControlButton';
import { Transcript } from './components/Transcript';
import { WebcamView } from './components/WebcamView';
import { AssistantState } from './types';

const App: React.FC = () => {
  const { 
    assistantState, 
    transcript, 
    error,
    startConversation, 
    stopConversation,
    sendImageFrame
  } = useLiveAssistant();

  const isConversationActive = assistantState !== AssistantState.IDLE && assistantState !== AssistantState.ERROR;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error('Failed to convert blob to base64.'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  useEffect(() => {
    if (isConversationActive && videoRef.current && canvasRef.current && sendImageFrame) {
      const videoEl = videoRef.current;
      const canvasEl = canvasRef.current;
      const ctx = canvasEl.getContext('2d');
      
      if (!ctx) return;

      frameIntervalRef.current = window.setInterval(() => {
        if (videoEl.readyState >= 2) { 
            canvasEl.width = videoEl.videoWidth;
            canvasEl.height = videoEl.videoHeight;
            ctx.drawImage(videoEl, 0, 0, videoEl.videoWidth, videoEl.videoHeight);
            canvasEl.toBlob(
                async (blob) => {
                    if (blob) {
                        try {
                            const base64Data = await blobToBase64(blob);
                            sendImageFrame(base64Data);
                        } catch (e) {
                            console.error("Error processing frame:", e);
                        }
                    }
                },
                'image/jpeg',
                0.8
            );
        }
      }, 1000 / 2); // 2 frames per second
    } else {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
      }
    };
  }, [isConversationActive, sendImageFrame]);


  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col justify-between p-4 overflow-hidden relative">
      <header className="w-full max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-bold text-cortexz-purple">
          Cortexz
        </h1>
        <p className="mt-2 text-gray-400">
          Your Personal AI Voice Assistant
        </p>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center my-4 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <AssistantAvatar state={assistantState} />
        </div>
        <div className="w-full max-w-4xl h-full flex flex-col relative z-10">
          <Transcript transcript={transcript} />
        </div>
      </main>

      <WebcamView 
        isActive={isConversationActive} 
        videoRef={videoRef} 
      />
      <canvas ref={canvasRef} className="hidden"></canvas>

      <footer className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center pb-4">
        {error && <p className="text-red-500 mb-4 text-center">{error}</p>}
        <ControlButton 
          isActive={isConversationActive} 
          onClick={isConversationActive ? stopConversation : startConversation} 
        />
        <p className="text-gray-500 text-xs mt-4">
          {isConversationActive 
            ? "Say 'Hey Cortex' followed by your question."
            : "Click the button to start the conversation."
          }
        </p>
      </footer>
    </div>
  );
};

export default App;