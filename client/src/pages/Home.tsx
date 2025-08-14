import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useWebSocket } from '@/hooks/useWebSocket';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QRScanner } from '@/components/QRScanner';
import { QRCodeDisplay } from '@/components/QRCodeDisplay';
import { MessageChat } from '@/components/MessageChat';
import { 
  Car, 
  QrCode, 
  Bell, 
  Settings, 
  Home as HomeIcon, 
  TriangleAlert,
  Camera,
  Shield,
  Check,
  User,
  MessageCircle
} from 'lucide-react';
import { Link } from 'wouter';

export default function Home() {
  const { user } = useAuth();
  const { lastMessage } = useWebSocket();
  const { toast } = useToast();
  const { isSupported: isPushSupported, isSubscribed: isPushSubscribed, subscribe: subscribeToPush } = usePushNotifications();
  const queryClient = useQueryClient();
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [showMessageChat, setShowMessageChat] = useState(false);
  const [currentChatRequest, setCurrentChatRequest] = useState<any>(null);

  // Fetch user's vehicle
  const { data: vehicle, isLoading: vehicleLoading, error: vehicleError } = useQuery({
    queryKey: ['/api/vehicles/my'],
    retry: false,
  });

  // Handle vehicle query error
  useEffect(() => {
    if (vehicleError && isUnauthorizedError(vehicleError as Error)) {
      toast({
        title: "Sessão expirada",
        description: "A fazer login novamente...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [vehicleError, toast]);

  // Fetch active parking session
  const { data: activeSession } = useQuery({
    queryKey: ['/api/parking-sessions/active'],
    enabled: !!vehicle,
  });

  // Auto-setup push notifications
  useEffect(() => {
    if (isPushSupported && !isPushSubscribed && user) {
      subscribeToPush().catch(() => {
        // Silent fail - push notifications are optional
      });
    }
  }, [isPushSupported, isPushSubscribed, user, subscribeToPush]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'EXIT_REQUEST') {
        setIncomingRequest(lastMessage.data);
        toast({
          title: "Solicitação de Saída",
          description: "Alguém precisa que mova o seu carro",
          variant: "default",
        });
      }
    }
  }, [lastMessage, toast]);

  // Create parking session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (blockingVehicleId: string) => {
      const response = await apiRequest('POST', '/api/parking-sessions', {
        blockingVehicleId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/parking-sessions/active'] });
      toast({
        title: "Sessão criada",
        description: "Registou-se como bloqueado por este veículo",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "A fazer login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão",
        variant: "destructive",
      });
    },
  });

  // Exit request mutation
  const exitRequestMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/exit-requests', {});
      return response.json();
    },
    onSuccess: () => {
      setShowExitModal(false);
      toast({
        title: "Notificação Enviada!",
        description: "O condutor será notificado em breve.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Sessão expirada",
          description: "A fazer login novamente...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Erro",
        description: "Não foi possível enviar a notificação",
        variant: "destructive",
      });
    },
  });

  // Handle QR scan
  const handleQRScan = async (qrCode: string) => {
    setIsQRScannerOpen(false);
    
    try {
      // Get vehicle info from QR code
      const response = await apiRequest('GET', `/api/vehicles/qr/${encodeURIComponent(qrCode)}`);
      const scannedVehicle = await response.json();
      
      // Create parking session
      createSessionMutation.mutate(scannedVehicle.id);
    } catch (error) {
      toast({
        title: "Código QR inválido",
        description: "Não foi possível encontrar este veículo",
        variant: "destructive",
      });
    }
  };

  // Handle exit request response
  const respondToRequest = async (response: string) => {
    if (incomingRequest) {
      try {
        await apiRequest('PATCH', `/api/exit-requests/${incomingRequest.requestId}/respond`, {
          response
        });
        setIncomingRequest(null);
        toast({
          title: "Resposta enviada",
          description: response === 'moving' ? "Informou que vai mover o carro" : "Pediu mais 5 minutos",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Não foi possível enviar a resposta",
          variant: "destructive",
        });
      }
    }
  };

  if (vehicleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-traffic-yellow border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return <Link href="/vehicle-registration">Registar Veículo</Link>;
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen relative overflow-hidden">
      {/* Header */}
      <header className="bg-traffic-yellow text-traffic-black px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-traffic-black rounded-full flex items-center justify-center">
              <Car className="text-traffic-yellow text-lg" />
            </div>
            <div>
              <h1 className="text-xl font-bold">QUERO SAIR</h1>
              <p className="text-sm opacity-80">Estacionamento Inteligente</p>
            </div>
          </div>
          <Button
            onClick={() => window.location.href = '/api/logout'}
            variant="ghost"
            size="icon"
            className="hover:bg-black/10"
          >
            <User className="text-2xl" />
          </Button>
        </div>
      </header>

      {/* Status Card */}
      <div className="p-4">
        <Card className="border-2 border-gray-100 shadow-lg">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-success-green rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="text-white text-2xl" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Veículo Registado</h2>
              <p className="text-gray-600 mt-1">{vehicle?.plate}</p>
            </div>
            
            {/* QR Code Display */}
            {vehicle && <QRCodeDisplay qrCode={vehicle.qrCode} vehiclePlate={vehicle.plate} />}
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex-1 px-4 pb-24">
        <div className="space-y-4">
          {/* Quero Sair Button */}
          {!activeSession ? (
            <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
              <p className="text-gray-600 font-medium mb-2">Para usar "QUERO SAIR":</p>
              <p className="text-gray-500 text-sm">Primeiro digitalize o QR do carro que o está a bloquear</p>
            </div>
          ) : (
            <Button
              onClick={() => setShowExitModal(true)}
              disabled={exitRequestMutation.isPending}
              className="w-full bg-warning-orange text-white py-8 rounded-xl font-bold text-2xl shadow-lg hover:bg-orange-600 transition-all transform active:scale-95 border-4 border-orange-300"
            >
              <TriangleAlert className="mr-3" size={28} />
              QUERO SAIR
            </Button>
          )}

          {/* Scan QR Button */}
          <Button
            onClick={() => setIsQRScannerOpen(true)}
            variant="outline"
            className="w-full bg-traffic-black text-traffic-yellow py-4 rounded-xl font-semibold text-lg border-2 border-traffic-yellow hover:bg-gray-800 transition-all"
          >
            <Camera className="mr-3" />
            Digitalizar QR Code
          </Button>

          {/* Status Info */}
          {activeSession ? (
            <div className="bg-orange-50 border-2 border-warning-orange rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <TriangleAlert className="text-warning-orange mr-2" size={20} />
                <p className="text-orange-800 font-bold">ESTÁ BLOQUEADO</p>
              </div>
              <p className="text-orange-700 text-sm">Use "QUERO SAIR" para notificar quando precisar sair</p>
            </div>
          ) : (
            <div className="bg-green-50 border-2 border-success-green rounded-lg p-4 text-center">
              <div className="flex items-center justify-center mb-2">
                <Shield className="text-success-green mr-2" size={20} />
                <p className="text-green-800 font-bold">LIVRE PARA SAIR</p>
              </div>
              <p className="text-green-700 text-sm">Digitalize QR se alguém o estiver a bloquear</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Quick Scan Button */}
      <Button
        onClick={() => setIsQRScannerOpen(true)}
        className="fixed bottom-20 right-4 w-16 h-16 bg-traffic-yellow text-traffic-black rounded-full shadow-2xl hover:bg-yellow-400 transition-all transform hover:scale-110 z-40"
      >
        <QrCode size={24} />
      </Button>

      {/* Bottom Navigation */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-traffic-yellow">
            <HomeIcon className="text-xl mb-1" />
            <span className="text-xs font-medium">Início</span>
          </Button>
          <Button 
            variant="ghost" 
            className="flex flex-col items-center py-2 px-4 text-gray-400"
            onClick={() => setIsQRScannerOpen(true)}
          >
            <QrCode className="text-xl mb-1" />
            <span className="text-xs">Digitalizar</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-gray-400">
            <Bell className="text-xl mb-1" />
            <span className="text-xs">Notificações</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center py-2 px-4 text-gray-400">
            <Settings className="text-xl mb-1" />
            <span className="text-xs">Definições</span>
          </Button>
        </div>
      </nav>

      {/* QR Scanner */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onScan={handleQRScan}
      />

      {/* Exit Request Modal */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-warning-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <TriangleAlert className="text-white text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Solicitar Saída</h3>
              <p className="text-gray-600 mb-6">Quer notificar o condutor que está à sua frente?</p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => exitRequestMutation.mutate()}
                  disabled={exitRequestMutation.isPending}
                  className="w-full bg-warning-orange text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                >
                  {exitRequestMutation.isPending ? 'A enviar...' : 'Sim, Notificar'}
                </Button>
                <Button
                  onClick={() => setShowExitModal(false)}
                  variant="outline"
                  className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Incoming Notification - Enhanced for stress scenarios */}
      {incomingRequest && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm border-4 border-warning-orange shadow-2xl animate-pulse">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-warning-orange rounded-full flex items-center justify-center mx-auto mb-4">
                <Bell className="text-white text-2xl animate-bounce" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">ALGUÉM QUER SAIR!</h3>
              <p className="text-gray-600 mb-6">Precisa que mova o seu carro</p>
              
              <div className="space-y-3">
                <Button
                  onClick={() => respondToRequest('moving')}
                  className="w-full bg-warning-orange text-white py-4 rounded-lg font-bold text-lg hover:bg-orange-600 transition-colors"
                >
                  ✓ VOU MOVER AGORA
                </Button>
                <Button
                  onClick={() => respondToRequest('wait_5min')}
                  variant="outline"
                  className="w-full bg-yellow-100 text-yellow-800 py-3 rounded-lg font-medium border-2 border-yellow-300 hover:bg-yellow-200"
                >
                  ⏱️ Preciso de 5 minutos
                </Button>
                <Button
                  onClick={() => {
                    setCurrentChatRequest(incomingRequest);
                    setShowMessageChat(true);
                  }}
                  variant="outline"
                  className="w-full bg-blue-50 text-blue-700 py-3 rounded-lg font-medium border-2 border-blue-300 hover:bg-blue-100"
                >
                  <MessageCircle className="mr-2" size={16} />
                  Enviar Mensagem
                </Button>
                <Button
                  onClick={() => setIncomingRequest(null)}
                  variant="ghost"
                  className="w-full text-gray-500 py-2 text-sm"
                >
                  Ignorar (não recomendado)
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Scanner Modal */}
      {isQRScannerOpen && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setIsQRScannerOpen(false)}
        />
      )}

      {/* Message Chat Modal */}
      {showMessageChat && currentChatRequest && (
        <MessageChat
          exitRequestId={currentChatRequest.requestId}
          receiverId={currentChatRequest.blockedVehicle?.userId || ''}
          receiverName="Condutor"
          onClose={() => {
            setShowMessageChat(false);
            setCurrentChatRequest(null);
          }}
        />
      )}
    </div>
  );
}
