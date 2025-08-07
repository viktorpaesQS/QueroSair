import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QRCodeDisplayProps {
  qrCode: string;
  vehiclePlate: string;
}

export function QRCodeDisplay({ qrCode, vehiclePlate }: QRCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (canvasRef.current && qrCode) {
      QRCode.toCanvas(canvasRef.current, qrCode, {
        width: 128,
        margin: 1,
        color: {
          dark: '#1A1A1A',
          light: '#FFFFFF'
        }
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [qrCode]);

  const shareQRCode = async () => {
    if (navigator.share && canvasRef.current) {
      try {
        const canvas = canvasRef.current;
        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `qr-code-${vehiclePlate}.png`, { type: 'image/png' });
            await navigator.share({
              title: 'Quero Sair - QR Code',
              text: `QR Code do veículo ${vehiclePlate}`,
              files: [file]
            });
          }
        });
      } catch (error) {
        console.error('Error sharing QR code:', error);
        fallbackShare();
      }
    } else {
      fallbackShare();
    }
  };

  const fallbackShare = () => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `qr-code-${vehiclePlate}.png`;
          a.click();
          URL.revokeObjectURL(url);
          
          toast({
            title: "QR Code guardado",
            description: "O QR Code foi guardado nos seus downloads.",
          });
        }
      });
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 text-center">
      <div className="w-32 h-32 bg-white rounded-lg mx-auto mb-3 flex items-center justify-center border-2 border-gray-200">
        <canvas ref={canvasRef} className="max-w-full max-h-full" />
      </div>
      <p className="text-sm text-gray-600 mb-2">Seu código QR</p>
      <Button
        onClick={shareQRCode}
        variant="ghost"
        size="sm"
        className="text-blue-600 hover:text-blue-700"
      >
        <Share2 className="h-4 w-4 mr-1" />
        Partilhar QR Code
      </Button>
    </div>
  );
}
