'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Service, VirtualNumber } from '@/lib/types';
import { cn } from '@/lib/utils';

type NumberCatalogProps = {
  services: Service[];
  numbers: VirtualNumber[];
  serviceSlug: string | null;
  numberId: string | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onService: (slug: string) => void;
  onNumber: (id: string) => void;
};

export function NumberCatalog({
  services,
  numbers,
  serviceSlug,
  numberId,
  loading,
  error,
  onRetry,
  onService,
  onNumber,
}: NumberCatalogProps) {
  const groups = new Map<string, VirtualNumber[]>();
  for (const number of numbers) {
    const key = `${number.flag} ${number.countryName}`;
    const list = groups.get(key) ?? [];
    list.push(number);
    groups.set(key, list);
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Servicio</p>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {services.map((service) => {
            const selected = service.slug === serviceSlug;
            return (
              <button
                key={service.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onService(service.slug)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:bg-muted',
                )}
              >
                {service.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Números disponibles</h2>
          <p className="text-xs text-muted-foreground">{numbers.filter((n) => n.status === 'AVAILABLE').length} libres</p>
        </div>

        {error ? (
          <div className="rounded-2xl border border-border bg-card p-5 text-sm">
            <p>No hay conexión con la API en el puerto 4000.</p>
            <Button className="mt-4" variant="outline" onClick={onRetry}>
              Reintentar
            </Button>
          </div>
        ) : null}

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : null}

        {!loading && !error && numbers.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No hay números. En el backend, ejecuta <span className="font-mono">npm run db:seed</span>.
          </p>
        ) : null}

        <div className="space-y-6">
          {[...groups.entries()].map(([label, items]) => (
            <div key={label}>
              <p className="mb-2 text-sm text-muted-foreground">{label}</p>
              <ul className="overflow-hidden rounded-2xl border border-border bg-card">
                {items.map((number) => {
                  const selected = number.id === numberId;
                  const busy = number.status !== 'AVAILABLE';
                  return (
                    <li key={number.id} className="border-b border-border last:border-b-0">
                      <button
                        type="button"
                        aria-pressed={selected}
                        disabled={busy}
                        onClick={() => onNumber(number.id)}
                        className={cn(
                          'flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors',
                          selected && 'bg-emerald-50',
                          !busy && !selected && 'hover:bg-muted/70',
                        )}
                      >
                        <span className="font-mono text-base tracking-wide">{number.display}</span>
                        <Badge tone={busy ? 'busy' : 'ok'}>{busy ? 'En uso' : 'Libre'}</Badge>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
