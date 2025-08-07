import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Car, QrCode, Bell, Shield } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-traffic-yellow/10 via-white to-traffic-yellow/5">
      <div className="max-w-md mx-auto min-h-screen flex flex-col">
        {/* Header */}
        <header className="text-center py-8 px-4">
          <div className="w-16 h-16 bg-traffic-yellow rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Car className="h-8 w-8 text-traffic-black" />
          </div>
          <h1 className="text-3xl font-bold text-traffic-black mb-2">QUERO SAIR</h1>
          <p className="text-lg text-gray-600">Estacionamento Inteligente</p>
          <p className="text-sm text-gray-500 mt-1">Lisboa, Portugal</p>
        </header>

        {/* Hero Section */}
        <div className="flex-1 px-4 py-8">
          <Card className="mb-8 border-2 border-traffic-yellow/20 shadow-lg">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-3">
                Solução Silenciosa para Conflitos de Estacionamento
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Acabaram-se as buzinadas! Comunique pacificamente com outros condutores
                através de códigos QR e notificações instantâneas.
              </p>
            </CardContent>
          </Card>

          {/* Features */}
          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-traffic-yellow/20 rounded-full flex items-center justify-center">
                <QrCode className="h-5 w-5 text-traffic-black" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Digitalização QR</h3>
                <p className="text-sm text-gray-600">Digitalize códigos nos carros bloqueadores</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-traffic-yellow/20 rounded-full flex items-center justify-center">
                <Bell className="h-5 w-5 text-traffic-black" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Notificações Instantâneas</h3>
                <p className="text-sm text-gray-600">Receba alertas quando alguém precisar sair</p>
              </div>
            </div>

            <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-10 h-10 bg-traffic-yellow/20 rounded-full flex items-center justify-center">
                <Shield className="h-5 w-5 text-traffic-black" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Comunicação Respeitosa</h3>
                <p className="text-sm text-gray-600">Sem ruído, sem stress, apenas cortesia</p>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Button
              onClick={() => window.location.href = '/api/login'}
              className="w-full bg-traffic-black text-traffic-yellow py-6 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all shadow-lg"
            >
              Começar Agora
            </Button>
            <p className="text-xs text-gray-500 mt-3">
              Transforme um lugar de estacionamento em dois — pacificamente
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-4 text-center text-xs text-gray-400">
          <p>Quero Sair © 2024 - Estacionamento Inteligente para Lisboa</p>
        </footer>
      </div>
    </div>
  );
}
