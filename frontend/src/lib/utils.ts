import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getHttpCodeColor(code: number): string {
  if (code >= 200 && code < 300) return '#10B981'; // Success - green
  if (code >= 300 && code < 400) return '#3B82F6'; // Redirect - blue
  if (code >= 400 && code < 500) return '#F59E0B'; // Client error - orange
  if (code >= 500) return '#EF4444'; // Server error - red
  return '#64748B'; // Unknown - gray
}

export function getHttpCodeLabel(code: number): string {
  const labels: Record<number, string> = {
    200: 'OK',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return labels[code] || `HTTP ${code}`;
}
