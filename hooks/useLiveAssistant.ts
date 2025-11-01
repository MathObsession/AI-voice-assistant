import { useState, useRef, useCallback, useEffect } from 'react';
// Fix: The `LiveSession` type is not exported from the SDK.
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { AssistantState, TranscriptMessage } from '../types';
import { encode, decode, decodeAudioData } from '../utils/audio';

// The LiveSession type is not exported from the SDK, so we define a local interface.
interface LiveSession {
  sendRealtimeInput(input: { media: Blob }): void;
  close(): void;
}

const INPUT_SAMPLE_RATE = 16000;
const OUTPUT_SAMPLE_RATE = 24000;
const BUFFER_SIZE = 4096;
const WAKE_WORDS = ['cortex', 'hey cortex'];

export const useLiveAssistant = () => {
  const [assistantState, setAssistantState] = useState<AssistantState>(AssistantState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);

  const playingSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  
  const currentInputTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');
  const isWaitingForWakeWordRef = useRef(true);

  const stopConversation = useCallback(async () => {
    setAssistantState(AssistantState.IDLE);
    isWaitingForWakeWordRef.current = true;
    
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
    }
    if (mediaStreamSourceRef.current) {
        mediaStreamSourceRef.current.disconnect();
        mediaStreamSourceRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
     if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      for (const source of playingSourcesRef.current.values()) {
        source.stop();
      }
      playingSourcesRef.current.clear();
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    if(sessionPromiseRef.current){
        const session = await sessionPromiseRef.current;
        session.close();
        sessionPromiseRef.current = null;
    }
    
    currentInputTranscriptionRef.current = '';
    currentOutputTranscriptionRef.current = '';
    nextStartTimeRef.current = 0;

  }, []);

  const handleMessage = useCallback(async (message: LiveServerMessage) => {
    // Handle Transcription
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      currentInputTranscriptionRef.current += text;

      if (isWaitingForWakeWordRef.current) {
        const command = currentInputTranscriptionRef.current.toLowerCase();
        if (WAKE_WORDS.some(w => command.includes(w))) {
          isWaitingForWakeWordRef.current = false;
          setAssistantState(AssistantState.THINKING);
          // Reset transcriptions so wake word isn't shown
          currentInputTranscriptionRef.current = '';
        }
      } else {
         // We have the wake word, now we display the user's prompt
         setTranscript(prev => {
           const last = prev[prev.length - 1];
           if (last?.sender === 'user' && !last.isFinal) {
             return [...prev.slice(0, -1), { ...last, text: currentInputTranscriptionRef.current }];
           }
           return [...prev, { id: `user-${Date.now()}`, sender: 'user', text: currentInputTranscriptionRef.current, isFinal: false }];
         });
      }
    }

    if (message.serverContent?.outputTranscription) {
      setAssistantState(AssistantState.SPEAKING);
      const text = message.serverContent.outputTranscription.text;
      currentOutputTranscriptionRef.current += text;
      setTranscript(prev => {
        const last = prev[prev.length -1];
        if(last?.sender === 'assistant' && !last.isFinal){
            return [...prev.slice(0, -1), {...last, text: currentOutputTranscriptionRef.current}];
        }
        return [...prev, {id: `assistant-${Date.now()}`, sender: 'assistant', text: currentOutputTranscriptionRef.current, isFinal: false}];
      });
    }

    // Handle Audio Output
    const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
    if (base64Audio && outputAudioContextRef.current) {
      setAssistantState(AssistantState.SPEAKING);
      const audioContext = outputAudioContextRef.current;
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContext.currentTime);
      
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        OUTPUT_SAMPLE_RATE,
        1
      );
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      source.addEventListener('ended', () => {
        playingSourcesRef.current.delete(source);
      });
      
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      playingSourcesRef.current.add(source);
    }

    // Finalize turn
    if (message.serverContent?.turnComplete) {
       setTranscript(prev => prev.map(msg => ({...msg, isFinal: true})));
       currentInputTranscriptionRef.current = '';
       currentOutputTranscriptionRef.current = '';
       isWaitingForWakeWordRef.current = true;
       setAssistantState(AssistantState.PASSIVE_LISTENING);
    }
    
    // Handle interruptions
    if (message.serverContent?.interrupted) {
      for (const source of playingSourcesRef.current.values()) {
        source.stop();
      }
      playingSourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  }, []);

  const startConversation = useCallback(async () => {
    setError(null);
    setTranscript([]);
    isWaitingForWakeWordRef.current = true;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: INPUT_SAMPLE_RATE });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });

      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      sessionPromiseRef.current = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            setAssistantState(AssistantState.PASSIVE_LISTENING);
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(BUFFER_SIZE, 1, 1);

            scriptProcessorRef.current.onaudioprocess = (event) => {
              const inputData = event.inputBuffer.getChannelData(0);
              const pcmBlob: Blob = {
                data: encode(new Uint8Array(new Int16Array(inputData.map(x => x * 32768)).buffer)),
                mimeType: `audio/pcm;rate=${INPUT_SAMPLE_RATE}`,
              };
              
              if(sessionPromiseRef.current){
                sessionPromiseRef.current.then((session) => {
                    session.sendRealtimeInput({ media: pcmBlob });
                });
              }
            };
            
            mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
            scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: handleMessage,
          onerror: (e) => {
            console.error('API Error:', e);
            setError('An API error occurred. Please try again.');
            setAssistantState(AssistantState.ERROR);
            stopConversation();
          },
          onclose: () => {
            console.log('API connection closed.');
            setAssistantState(AssistantState.IDLE);
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction: 'You are Cortexz, a friendly and helpful voice assistant. You can see through the user\'s camera. Use this visual information to provide more relevant and helpful responses. Keep your responses concise and conversational.',
        },
      });

    } catch (err) {
      console.error('Initialization Error:', err);
      let message = 'An unknown error occurred.';
      if (err instanceof Error) {
        if(err.name === 'NotAllowedError'){
            message = 'Microphone or camera access was denied. Please allow access in your browser settings.';
        } else {
            message = err.message;
        }
      }
      setError(message);
      setAssistantState(AssistantState.ERROR);
    }
  }, [handleMessage, stopConversation]);
  
  const sendImageFrame = useCallback(async (base64Data: string) => {
    if (sessionPromiseRef.current) {
      const imageBlob: Blob = {
        data: base64Data,
        mimeType: 'image/jpeg',
      };
      
      try {
        const session = await sessionPromiseRef.current;
        session.sendRealtimeInput({ media: imageBlob });
      } catch (e) {
        console.error("Failed to send image frame:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      stopConversation();
    };
  }, [stopConversation]);

  return { assistantState, transcript, error, startConversation, stopConversation, sendImageFrame };
};