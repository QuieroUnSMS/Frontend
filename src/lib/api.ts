import type { Rental, Service, SmsMessage, VirtualNumber } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const wsUrl = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message;
    throw new Error(message || `Error ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  services: () => request<Service[]>('/services'),
  numbers: () => request<VirtualNumber[]>('/numbers'),
  rentals: () => request<Rental[]>('/rentals'),
  rent: (body: { virtualNumberId: string; serviceSlug: string }) =>
    request<Rental>('/rentals', { method: 'POST', body: JSON.stringify(body) }),
  cancel: (id: string) => request<Rental>(`/rentals/${id}/cancel`, { method: 'POST' }),
  complete: (id: string) => request<Rental>(`/rentals/${id}/complete`, { method: 'POST' }),
  simulate: (id: string) => request<SmsMessage>(`/rentals/${id}/simulate`, { method: 'POST' }),
};

export function formatClock(iso: string) {
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}
