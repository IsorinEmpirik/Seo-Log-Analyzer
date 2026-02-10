import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
}

export function StatCard({ title, value, subtitle, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn('bg-surface rounded-xl border border-gray-200 p-6', className)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-text mt-2">{value}</p>
          {subtitle && (
            <p className="text-xs text-text-muted mt-1">{subtitle}</p>
          )}
          {trend && (
            <p
              className={cn(
                'text-sm mt-2',
                trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-error' : 'text-text-muted'
              )}
            >
              {trend.value > 0 ? '+' : ''}
              {trend.value}% {trend.label}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary-50 rounded-lg text-primary">{icon}</div>
        )}
      </div>
    </div>
  );
}
