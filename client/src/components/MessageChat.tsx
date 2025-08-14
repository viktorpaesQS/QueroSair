import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, MessageCircle, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import type { Message } from '@shared/schema';

interface MessageChatProps {
  exitRequestId: string;
  receiverId: string;
  receiverName?: string;
  onClose: () => void;
}

export function MessageChat({ exitRequestId, receiverId, receiverName, onClose }: MessageChatProps) {
  const [message, setMessage] = useState('');
  const [quickMessages] = useState([
    "Vou mover agora!",
    "2 minutos, por favor",
    "5 minutos máximo",
    "Estou a chegar",
    "Desculpe a demora"
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch messages for this exit request
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/messages', exitRequestId],
    refetchInterval: 2000, // Poll for new messages every 2 seconds
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest('/api/messages', {
        method: 'POST',
        body: JSON.stringify({
          exitRequestId,
          receiverId,
          content,
        }),
      });
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/messages', exitRequestId] });
    },
  });

  const handleSendMessage = async () => {
    if (message.trim() && !sendMessageMutation.isPending) {
      await sendMessageMutation.mutateAsync(message.trim());
    }
  };

  const handleQuickMessage = async (content: string) => {
    if (!sendMessageMutation.isPending) {
      await sendMessageMutation.mutateAsync(content);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md h-96 flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-3">
          <CardTitle className="flex items-center text-lg">
            <MessageCircle className="mr-2" size={20} />
            Chat com {receiverName || 'Condutor'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X size={20} />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading ? (
              <div className="text-center text-gray-500 text-sm">A carregar mensagens...</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-gray-500 text-sm">
                Sem mensagens ainda. Envie uma mensagem rápida!
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      msg.senderId === user?.id
                        ? 'bg-traffic-yellow text-traffic-black'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                    <div className={`text-xs mt-1 ${
                      msg.senderId === user?.id ? 'text-gray-700' : 'text-gray-500'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Messages */}
          <div className="px-4 py-2 border-t bg-gray-50">
            <div className="text-xs text-gray-600 mb-2">Mensagens rápidas:</div>
            <div className="flex flex-wrap gap-1">
              {quickMessages.map((quickMsg) => (
                <Button
                  key={quickMsg}
                  size="sm"
                  variant="outline"
                  onClick={() => handleQuickMessage(quickMsg)}
                  disabled={sendMessageMutation.isPending}
                  className="text-xs py-1 px-2 h-auto bg-white hover:bg-gray-100"
                >
                  {quickMsg}
                </Button>
              ))}
            </div>
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua mensagem..."
                className="flex-1"
                maxLength={200}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="icon"
                className="bg-traffic-yellow text-traffic-black hover:bg-yellow-400"
              >
                <Send size={16} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}