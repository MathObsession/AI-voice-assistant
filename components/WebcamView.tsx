import React, { useEffect, useRef } from 'react';

interface WebcamViewProps {
  isActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
}

export const WebcamView: React.FC<WebcamViewProps> = ({ isActive, videoRef }) => {
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing webcam:", err);
        // Silently fail for now, but a user-facing message could be added here.
      }
    };

    const stopWebcam = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };

    if (isActive) {
      startWebcam();
    } else {
      stopWebcam();
    }

    return () => {
      stopWebcam();
    };
  }, [isActive, videoRef]);

  return (
    <div className={`absolute bottom-4 left-4 w-48 h-36 rounded-lg border-2 border-dashed border-gray-600 overflow-hidden transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
      />
    </div>
  );
};
