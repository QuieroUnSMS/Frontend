export type NumberStatus = 'AVAILABLE' | 'RENTED';
export type RentalStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED';

export type Service = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export type VirtualNumber = {
  id: string;
  e164: string;
  display: string;
  countryIso: string;
  countryName: string;
  flag: string;
  status: NumberStatus;
};

export type SmsMessage = {
  id: string;
  rentalId: string;
  sender: string;
  body: string;
  code: string | null;
  receivedAt: string;
};

export type Rental = {
  id: string;
  status: RentalStatus;
  expiresAt: string;
  createdAt: string;
  virtualNumber: VirtualNumber;
  service: Service;
  messages: SmsMessage[];
};

export type SmsEvent = {
  rentalId: string;
  message: SmsMessage;
};
