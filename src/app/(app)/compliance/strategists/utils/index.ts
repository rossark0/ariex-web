import { FullStrategistMock } from '@/lib/mocks/strategist-full';
import { FullClientMock } from '@/lib/mocks/client-full';

export function getInitials(name: string | null): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getStrategistDescription(strategist: FullStrategistMock): string {
  const parts: string[] = [];

  if (strategist.profile.title) {
    parts.push(strategist.profile.title);
  }
  if (strategist.profile.specializations?.length > 0) {
    parts.push(strategist.profile.specializations.slice(0, 2).join(', '));
  }

  if (parts.length === 0) {
    return 'Tax Strategist';
  }

  return parts.join(' · ');
}

export function getClientDescription(client: FullClientMock): string {
  const parts: string[] = [];

  if (client.profile.businessName) {
    parts.push(client.profile.businessName);
  }
  if (client.profile.city && client.profile.state) {
    parts.push(`${client.profile.city}, ${client.profile.state}`);
  }

  if (parts.length === 0) {
    return 'Tax strategy client';
  }

  return parts.join(' · ');
}
