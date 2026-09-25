'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatClock } from '@/lib/api';
import type { Rental, RentalStatus, Service, VirtualNumber } from '@/lib/types';

const statusLabel: Record<RentalStatus, string> = {
  ACTIVE: 'En curso',
  COMPLETED: 'Usado',
  EXPIRED: 'Venció',
  CANCELLED: 'Liberado',
};

function useCountdown(expiresAt?: string) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!expiresAt) return null;
  const total = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  return { label: `${mm}:${ss}`, urgent: total < 30 };
}

type SessionPanelProps = {
  rentals: Rental[];
  service: Service | null;
  selectedNumber: VirtualNumber | null;
  canRent: boolean;
  renting: boolean;
  onRent: () => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onSimulate: (id: string) => void;
  busyId: string | null;
};

export function SessionPanel({
  rentals,
  service,
  selectedNumber,
  canRent,
  renting,
  onRent,
  onCancel,
  onComplete,
  onSimulate,
  busyId,
}: SessionPanelProps) {
  const active = rentals.filter((rental) => rental.status === 'ACTIVE');
  const recent = rentals.filter((rental) => rental.status !== 'ACTIVE');

  return (
    <aside className="space-y-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-auto">
      {active.length === 0 ? (
        <Card>
          <CardHeader>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Bandeja</p>
            <h2 className="text-lg font-semibold tracking-tight">Esperando un número</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Elige un servicio y un número libre. El código entra solo, en cuanto el SMS llega.
            </p>
          </CardContent>
        </Card>
      ) : (
        active.map((rental) => (
          <ActiveRental
            key={rental.id}
            rental={rental}
            busy={busyId === rental.id}
            onCancel={onCancel}
            onComplete={onComplete}
            onSimulate={onSimulate}
          />
        ))
      )}

      <Card>
        <CardHeader>
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Nueva recepción</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-mono text-lg">{selectedNumber?.display ?? 'Ningún número'}</p>
            <p className="text-sm text-muted-foreground">
              {selectedNumber ? `${selectedNumber.flag} ${selectedNumber.countryName}` : 'Elige uno de la lista'}
              {service ? ` · ${service.name}` : ''}
            </p>
          </div>
          <Button className="w-full" size="lg" disabled={!canRent} onClick={onRent}>
            {renting ? 'Reservando…' : selectedNumber ? 'Recibir SMS' : 'Elige un número'}
          </Button>
        </CardContent>
      </Card>

      {recent.length > 0 ? (
        <div className="px-1">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Recientes</p>
          <ul className="space-y-2">
            {recent.map((rental) => (
              <li key={rental.id} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-mono text-xs">{rental.virtualNumber.display}</span>
                <span className="text-muted-foreground">
                  {rental.service.name} · {statusLabel[rental.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </aside>
  );
}

function ActiveRental({
  rental,
  busy,
  onCancel,
  onComplete,
  onSimulate,
}: {
  rental: Rental;
  busy: boolean;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
  onSimulate: (id: string) => void;
}) {
  const countdown = useCountdown(rental.expiresAt);
  const latest = [...rental.messages].reverse().find((message) => message.code);

  async function copyCode() {
    if (!latest?.code) return;
    try {
      await navigator.clipboard.writeText(latest.code);
      toast.success('Código copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{rental.service.name}</p>
            <p className="mt-1 font-mono text-xl tracking-wide">{rental.virtualNumber.display}</p>
            <p className="text-sm text-muted-foreground">
              {rental.virtualNumber.flag} {rental.virtualNumber.countryName}
            </p>
          </div>
          <p className={`font-mono text-sm tabular-nums ${countdown?.urgent ? 'text-destructive' : 'text-muted-foreground'}`}>
            {countdown?.label ?? '--:--'}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest?.code ? (
          <div className="rounded-2xl bg-[#14342c] px-4 py-5 text-center text-[#e7ff6a]">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#e7ff6a]/70">Código</p>
            <p className="mt-1 font-mono text-3xl tracking-[0.18em] sm:text-4xl" aria-live="polite">
              {latest.code}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Esperando el SMS…</p>
            <div className="signal-track" />
          </div>
        )}

        {rental.messages.length > 0 ? (
          <ul className="max-h-48 space-y-3 overflow-auto">
            {rental.messages.map((message, index) => (
              <li key={message.id}>
                {index > 0 ? <Separator className="mb-3" /> : null}
                <p className="text-xs text-muted-foreground">
                  {message.sender} · {formatClock(message.receivedAt)}
                </p>
                <p className="mt-1 text-sm leading-relaxed">{message.body}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!latest?.code} onClick={() => void copyCode()}>
            Copiar código
          </Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onSimulate(rental.id)}>
            Otro SMS
          </Button>
          <Button size="sm" disabled={busy || !latest?.code} onClick={() => onComplete(rental.id)}>
            Ya lo usé
          </Button>
          <Button size="sm" variant="destructive" disabled={busy} onClick={() => onCancel(rental.id)}>
            Liberar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
