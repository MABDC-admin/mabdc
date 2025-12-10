import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, UserCheck, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEmployeeFaceData } from '@/hooks/useFaceRecognition';
import { loadFaceApiModels, detectFace, findBestMatch } from '@/utils/faceApiLoader';
import { toast } from 'sonner';

interface FaceRecognitionScannerProps {
  onRecognized: (employeeId: string, employeeName: string, hrmsNo: string) => void;
  isProcessing: boolean;
}

export function FaceRecognitionScanner({ onRecognized, isProcessing }: FaceRecognitionScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [isActive, setIsActive] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastRecognized, setLastRecognized] = useState<string | null>(null);
  const [recognitionCooldown, setRecognitionCooldown] = useState(false);
  
  const { data: enrolledFaces = [], isLoading: facesLoading } = useEmployeeFaceData();

  useEffect(() => {
    loadFaceApiModels()
      .then(() => setModelsReady(true))
      .catch((err) => {
        console.error('Failed to load face models:', err);
        toast.error('Failed to load face recognition models');
      });
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsActive(false);
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const scanForFace = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsReady || isProcessing || recognitionCooldown) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    try {
      const detection = await detectFace(canvas);
      
      if (detection) {
        const storedDescriptors = enrolledFaces.map(f => ({
          employeeId: f.employee_id,
          descriptor: f.face_descriptor as number[],
          name: f.employees?.full_name || 'Unknown',
          hrmsNo: f.employees?.hrms_no || '',
        }));
        
        const match = findBestMatch(detection.descriptor, storedDescriptors, 0.5);
        
        if (match && match.employeeId !== lastRecognized) {
          setLastRecognized(match.employeeId);
          setRecognitionCooldown(true);
          
          // Visual feedback
          toast.success(`Recognized: ${match.name}`, {
            description: `Confidence: ${((1 - match.distance) * 100).toFixed(0)}%`
          });
          
          onRecognized(match.employeeId, match.name, match.hrmsNo);
          
          // Cooldown to prevent rapid re-recognition
          setTimeout(() => {
            setRecognitionCooldown(false);
            setLastRecognized(null);
          }, 5000);
        }
      }
    } catch (err) {
      console.error('Face scan error:', err);
    }
  }, [modelsReady, isProcessing, recognitionCooldown, enrolledFaces, lastRecognized, onRecognized]);

  const startScanning = useCallback(() => {
    if (!isActive || !modelsReady) return;
    
    setIsScanning(true);
    // Scan every 1.5 seconds to balance performance and responsiveness
    scanIntervalRef.current = setInterval(scanForFace, 1500);
    scanForFace(); // Run immediately
  }, [isActive, modelsReady, scanForFace]);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    setIsScanning(false);
  }, []);

  if (facesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (enrolledFaces.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/50 rounded-xl">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No Enrolled Faces</h3>
        <p className="text-sm text-muted-foreground">
          Please enroll employee faces first before using facial recognition.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera View */}
      <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        />
        
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <p>Click "Start Camera" to begin</p>
          </div>
        )}
        
        {/* Scanning indicator */}
        {isScanning && (
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-sm">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Scanning for faces...
          </div>
        )}
        
        {/* Recognition cooldown indicator */}
        {recognitionCooldown && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-500/90 text-white px-3 py-1.5 rounded-full text-sm">
            <UserCheck className="w-4 h-4" />
            Face recognized!
          </div>
        )}
        
        {/* Loading overlay */}
        {!modelsReady && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading face recognition...</p>
            </div>
          </div>
        )}
        
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Processing attendance...</p>
            </div>
          </div>
        )}
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Controls */}
      <div className="flex gap-2">
        {!isActive ? (
          <Button
            onClick={startCamera}
            disabled={!modelsReady}
            className="flex-1"
            size="lg"
          >
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        ) : (
          <>
            {!isScanning ? (
              <Button
                onClick={startScanning}
                className="flex-1"
                size="lg"
              >
                <UserCheck className="w-5 h-5 mr-2" />
                Start Scanning
              </Button>
            ) : (
              <Button
                onClick={stopScanning}
                variant="secondary"
                className="flex-1"
                size="lg"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Pause Scanning
              </Button>
            )}
            <Button
              onClick={stopCamera}
              variant="outline"
              size="lg"
            >
              Stop
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {enrolledFaces.length} employee(s) enrolled • Position face clearly in frame
      </p>
    </div>
  );
}
