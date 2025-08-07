import { useEffect, useRef, useState } from 'react';
import { X, FlashlightIcon as Flashlight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (qrCode: string) => void;
}

export function QRScanner({ isOpen, onClose, onScan }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // Start scanning for QR codes
      startQRDetection();
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasPermission(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startQRDetection = () => {
    // Simple QR code detection simulation
    // In a real implementation, you would use a library like jsQR
    const scanInterval = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (context && video.videoWidth > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);

          // Simulate QR code detection
          // In reality, you'd use jsQR or similar library here
          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          
          // Mock QR detection - in real app, use jsQR library
          // For demo purposes, we'll simulate finding a QR code after 3 seconds
          setTimeout(() => {
            if (isOpen) {
              const mockQRCode = 'quero-sair://mock-vehicle-id';
              onScan(mockQRCode);
              clearInterval(scanInterval);
            }
          }, 3000);
        }
      }
    }, 100);

    return () => clearInterval(scanInterval);
  };

  const toggleFlash = async () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const capabilities = track.getCapabilities() as any;
      
      if (capabilities.torch) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn } as any]
          });
          setIsFlashOn(!isFlashOn);
        } catch (error) {
          console.error('Error toggling flash:', error);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50">
      <div className="relative h-full">
        {/* Camera View */}
        <div className="h-full bg-gray-900 flex items-center justify-center relative">
          {hasPermission === false ? (
            <div className="text-center text-white p-6">
              <h3 className="text-xl font-semibold mb-4">Acesso à Câmara Necessário</h3>
              <p className="text-gray-300 mb-4">
                Para digitalizar códigos QR, precisamos de acesso à sua câmara.
              </p>
              <Button onClick={startCamera} variant="outline" className="text-black">
                Tentar Novamente
              </Button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanner Overlay */}
              <div className="absolute inset-0 bg-black/30">
                {/* Scanning Frame */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                  <div className="w-64 h-64 border-4 border-traffic-yellow rounded-lg relative">
                    {/* Corner indicators */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-white rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-white rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-white rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-white rounded-br-lg"></div>
                    
                    {/* Scanning line animation */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-traffic-yellow opacity-75 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Scanner Controls */}
        <div className="absolute top-0 left-0 right-0 p-4 z-10">
          <div className="flex items-center justify-between">
            <Button
              onClick={onClose}
              variant="ghost"
              size="icon"
              className="bg-black/50 text-white hover:bg-black/70"
            >
              <X className="h-6 w-6" />
            </Button>
            <div className="bg-black/70 rounded-full px-4 py-2">
              <span className="text-white font-medium">Aponte para o QR Code</span>
            </div>
            <Button
              onClick={toggleFlash}
              variant="ghost"
              size="icon"
              className={`bg-black/50 text-white hover:bg-black/70 ${isFlashOn ? 'bg-yellow-500' : ''}`}
            >
              <Flashlight className="h-6 w-6" />
            </Button>
          </div>
        </div>

        {/* Scanner Instructions */}
        <div className="absolute bottom-8 left-4 right-4">
          <div className="bg-black/70 rounded-xl p-4 text-center">
            <p className="text-white font-semibold mb-2">Posicione o QR Code dentro da moldura</p>
            <p className="text-gray-300 text-sm">O código será digitalizado automaticamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
