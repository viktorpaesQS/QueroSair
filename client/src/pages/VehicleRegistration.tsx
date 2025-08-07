import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { apiRequest } from '@/lib/queryClient';
import { insertVehicleSchema } from '@shared/schema';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { ArrowLeft, Car, Bike } from 'lucide-react';
import { useLocation } from 'wouter';

const vehicleFormSchema = insertVehicleSchema.extend({
  plate: z.string().min(1, 'Matrícula é obrigatória').regex(/^[A-Z]{2}-\d{2}-[A-Z]{2}$/, 'Formato inválido (ex: AB-12-CD)'),
});

type VehicleFormData = z.infer<typeof vehicleFormSchema>;

export default function VehicleRegistration() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [selectedType, setSelectedType] = useState<'car' | 'motorcycle'>('car');

  const form = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      plate: '',
      vehicleType: 'car',
      color: '',
    },
  });

  const vehicleRegistrationMutation = useMutation({
    mutationFn: async (data: VehicleFormData) => {
      const response = await apiRequest('POST', '/api/vehicles', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles/my'] });
      toast({
        title: "Veículo registado!",
        description: "O seu veículo foi registado com sucesso.",
      });
      setLocation('/');
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
      
      if (error.message.includes('already registered')) {
        toast({
          title: "Matrícula já registada",
          description: "Esta matrícula já está registada no sistema.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível registar o veículo.",
          variant: "destructive",
        });
      }
    },
  });

  const onSubmit = (data: VehicleFormData) => {
    vehicleRegistrationMutation.mutate(data);
  };

  // Redirect if not authenticated
  if (!user) {
    setTimeout(() => {
      toast({
        title: "Sessão expirada",
        description: "A fazer login novamente...",
        variant: "destructive",
      });
      window.location.href = "/api/login";
    }, 500);
    return null;
  }

  return (
    <div className="max-w-md mx-auto bg-white min-h-screen">
      {/* Header */}
      <header className="bg-traffic-yellow text-traffic-black px-4 py-4 flex items-center">
        <Button
          onClick={() => setLocation('/')}
          variant="ghost"
          size="icon"
          className="mr-4"
        >
          <ArrowLeft className="text-xl" />
        </Button>
        <h1 className="text-xl font-bold">Registar Veículo</h1>
      </header>

      {/* Form */}
      <div className="p-4">
        <Card>
          <CardContent className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Vehicle Plate */}
                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Matrícula do Veículo</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="AB-12-CD"
                          className="text-lg font-mono text-center"
                          onChange={(e) => {
                            const value = e.target.value.toUpperCase();
                            field.onChange(value);
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Vehicle Type */}
                <FormField
                  control={form.control}
                  name="vehicleType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Veículo</FormLabel>
                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          type="button"
                          variant={selectedType === 'car' ? 'default' : 'outline'}
                          className="p-4 h-auto flex-col"
                          onClick={() => {
                            setSelectedType('car');
                            field.onChange('car');
                          }}
                        >
                          <Car className="text-2xl mb-2" />
                          <span className="font-medium">Carro</span>
                        </Button>
                        <Button
                          type="button"
                          variant={selectedType === 'motorcycle' ? 'default' : 'outline'}
                          className="p-4 h-auto flex-col"
                          onClick={() => {
                            setSelectedType('motorcycle');
                            field.onChange('motorcycle');
                          }}
                        >
                          <Bike className="text-2xl mb-2" />
                          <span className="font-medium">Mota</span>
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Color */}
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor do Veículo</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar cor..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="branco">Branco</SelectItem>
                          <SelectItem value="preto">Preto</SelectItem>
                          <SelectItem value="cinzento">Cinzento</SelectItem>
                          <SelectItem value="azul">Azul</SelectItem>
                          <SelectItem value="vermelho">Vermelho</SelectItem>
                          <SelectItem value="verde">Verde</SelectItem>
                          <SelectItem value="amarelo">Amarelo</SelectItem>
                          <SelectItem value="laranja">Laranja</SelectItem>
                          <SelectItem value="castanho">Castanho</SelectItem>
                          <SelectItem value="prata">Prata</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Register Button */}
                <Button
                  type="submit"
                  disabled={vehicleRegistrationMutation.isPending}
                  className="w-full bg-traffic-black text-traffic-yellow py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors"
                >
                  {vehicleRegistrationMutation.isPending ? 'A registar...' : 'Registar Veículo'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
