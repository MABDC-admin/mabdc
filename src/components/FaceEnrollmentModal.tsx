import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Check, X, RefreshCw, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEmployees } from '@/hooks/useEmployees';
import { useEnrollFace, useEmployeeFaceData } from '@/hooks/useFaceRecognition';
import { loadFaceApiModels, detectFace } from '@/utils/faceApiLoader';
import { toast } from 'sonner';

interface FaceEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FaceEnrollmentModal({ isOpen, onClose }: FaceEnrollmentModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelsReady, setModelsReady] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const { data: employees = [] } = useEmployees();
  const { data: enrolledFaces = [] } = useEmployeeFaceData();
  const enrollFace = useEnrollFace();
  
  const enrolledEmployeeIds = new Set(enrolledFaces.map(f => f.employee_id));
  const unenrolledEmployees = employees.filter(e => !enrolledEmployeeIds.has(e.id));

  useEffect(() => {
    if (isOpen) {
      loadFaceApiModels()
        .then(() => setModelsReady(true))
        .catch((err) => {
          console.error('Failed to load face models:', err);
          toast.error('Failed to load face recognition models');
        });
    }
  }, [isOpen]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Failed to access camera');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !modelsReady) return;
    
    setIsLoading(true);
    
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      
      const detection = await detectFace(canvas);
      
      if (!detection) {
        toast.error('No face detected. Please position your face in the frame.');
        setIsLoading(false);
        return;
      }
      
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      setFaceDescriptor(Array.from(detection.descriptor));
      stopCamera();
      
      toast.success('Face captured successfully!');
    } catch (err) {
      console.error('Capture error:', err);
      toast.error('Failed to capture face');
    } finally {
      setIsLoading(false);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    setFaceDescriptor(null);
    startCamera();
  };

  const handleEnroll = async () => {
    if (!selectedEmployee || !faceDescriptor) {
      toast.error('Please select an employee and capture a photo');
      return;
    }
    
    enrollFace.mutate(
      {
        employeeId: selectedEmployee,
        faceDescriptor,
        photoUrl: capturedImage || undefined,
      },
      {
        onSuccess: () => {
          onClose();
          resetState();
        },
      }
    );
  };

  const resetState = () => {
    setSelectedEmployee('');
    setCapturedImage(null);
    setFaceDescriptor(null);
    stopCamera();
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Face Enrollment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee Selection */}
          <div>
            <label className="text-sm font-medium mb-2 block">Select Employee</label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee to enroll" />
              </SelectTrigger>
              <SelectContent>
                {unenrolledEmployees.map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.hrms_no})
                  </SelectItem>
                ))}
                {unenrolledEmployees.length === 0 && (
                  <div className="p-2 text-sm text-muted-foreground text-center">
                    All employees are enrolled
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Camera / Preview */}
          <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
            {!capturedImage ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                    <Camera className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-sm">Click "Start Camera" to begin</p>
                  </div>
                )}
              </>
            ) : (
              <img
                src={capturedImage}
                alt="Captured face"
                className="w-full h-full object-cover"
              />
            )}
            
            {/* Loading overlay */}
            {(isLoading || !modelsReady) && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {!modelsReady ? 'Loading face recognition...' : 'Detecting face...'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Face detection status */}
          {faceDescriptor && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <Check className="w-5 h-5" />
              <span className="text-sm font-medium">Face detected and ready for enrollment</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!capturedImage ? (
              <>
                {!cameraActive ? (
                  <Button
                    onClick={startCamera}
                    disabled={!modelsReady || !selectedEmployee}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Start Camera
                  </Button>
                ) : (
                  <Button
                    onClick={capturePhoto}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button variant="outline" onClick={retake} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  onClick={handleEnroll}
                  disabled={!faceDescriptor || enrollFace.isPending}
                  className="flex-1"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Enroll Face
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Position the employee's face clearly in the frame. Good lighting improves accuracy.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
