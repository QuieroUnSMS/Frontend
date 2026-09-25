'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'sonner';
import { NumberCatalog } from '@/components/number-catalog';
import { Providers } from '@/components/providers';
import { SessionPanel } from '@/components/session-panel';
import { api, wsUrl } from '@/lib/api';
import type { Rental, SmsEvent } from '@/lib/types';

export default function AppShell() {
  return (
    <Providers>
      <Inbox />
    </Providers>
  );
}

function Inbox() {
  const queryClient = useQueryClient();
  const [serviceSlug, setServiceSlug] = useState<string | null>(null);
  const [numberId, setNumberId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const servicesQuery = useQuery({ queryKey: ['services'], queryFn: api.services });
  const numbersQuery = useQuery({ queryKey: ['numbers'], queryFn: api.numbers, refetchInterval: 8000 });
  const rentalsQuery = useQuery({
    queryKey: ['rentals'],
    queryFn: api.rentals,
    refetchInterval: (query) => {
      const waiting = query.state.data?.some((rental) => rental.status === 'ACTIVE' && rental.messages.length === 0);
      return waiting ? 4000 : 8000;
    },
  });

  const services = servicesQuery.data ?? [];
  const numbers = numbersQuery.data ?? [];
  const rentals = rentalsQuery.data ?? [];
  const service = services.find((item) => item.slug === serviceSlug) ?? null;
  const selectedNumber = numbers.find((item) => item.id === numberId) ?? null;

  useEffect(() => {
    if (!serviceSlug && services[0]) setServiceSlug(services[0].slug);
  }, [serviceSlug, services]);

  useEffect(() => {
    const socket = io(wsUrl, { transports: ['websocket', 'polling'] });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('sms.received', (event: SmsEvent) => {
      queryClient.setQueryData<Rental[]>(['rentals'], (current) => {
        if (!current?.some((rental) => rental.id === event.rentalId)) return current;
        return current.map((rental) => {
          if (rental.id !== event.rentalId) return rental;
          if (rental.messages.some((message) => message.id === event.message.id)) return rental;
          return { ...rental, messages: [...rental.messages, event.message] };
        });
      });
      toast.success(event.message.code ? `Código ${event.message.code}` : 'Llegó un SMS', {
        description: event.message.body,
      });
    });
    socket.on('rental.updated', (rental: Rental) => {
      if (rental.status === 'EXPIRED') toast('El número se liberó al vencer el tiempo');
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      void queryClient.invalidateQueries({ queryKey: ['numbers'] });
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);

  const rent = useMutation({
    mutationFn: api.rent,
    onSuccess: async () => {
      setNumberId(null);
      await queryClient.invalidateQueries({ queryKey: ['rentals'] });
      await queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast('Número reservado', { description: 'El SMS de prueba llega en unos segundos.' });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function runRentalAction(id: string, action: (rentalId: string) => Promise<unknown>, success: string) {
    setBusyId(id);
    try {
      await action(id);
      await queryClient.invalidateQueries({ queryKey: ['rentals'] });
      await queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo completar');
    } finally {
      setBusyId(null);
    }
  }

  const offline = servicesQuery.isError || numbersQuery.isError;

  return (
    <div className="min-h-screen border-l-4 border-primary">
      <header className="border-b border-border/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Números virtuales</p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Quiero<span className="text-primary">UnSMS</span>
            </h1>
          </div>
          <p className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-600' : 'animate-pulse bg-amber-500'}`} />
            {connected ? 'En vivo' : 'Conectando'}
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-5 py-6 lg:grid-cols-[minmax(0,1.15fr)_380px]">
        <div className="order-2 lg:order-1">
          <NumberCatalog
            services={services}
            numbers={numbers}
            serviceSlug={serviceSlug}
            numberId={numberId}
            loading={numbersQuery.isLoading || servicesQuery.isLoading}
            error={offline}
            onRetry={() => {
              void servicesQuery.refetch();
              void numbersQuery.refetch();
            }}
            onService={setServiceSlug}
            onNumber={setNumberId}
          />
        </div>
        <div className="order-1 lg:order-2">
          <SessionPanel
            rentals={rentals}
            service={service}
            selectedNumber={selectedNumber}
            canRent={Boolean(service && selectedNumber?.status === 'AVAILABLE' && !rent.isPending)}
            renting={rent.isPending}
            busyId={busyId}
            onRent={() => {
              if (!service || !selectedNumber) return;
              rent.mutate({ virtualNumberId: selectedNumber.id, serviceSlug: service.slug });
            }}
            onCancel={(id) => void runRentalAction(id, api.cancel, 'Número liberado')}
            onComplete={(id) => void runRentalAction(id, api.complete, 'Sesión cerrada')}
            onSimulate={(id) => void runRentalAction(id, api.simulate, 'SMS enviado')}
          />
        </div>
      </main>
    </div>
  );
}
