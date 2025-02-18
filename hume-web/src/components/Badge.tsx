import { ReactNode } from 'react';
import { typography } from '@/styles/typography';

interface BadgeProps {
  variant?: 'brand' | 'success' | 'warning' | 'error' | 'neutral';
  children: ReactNode;
}

const variantStyles = {
  brand: 'bg-brand-600 text-white',
  success: 'bg-green-500 text-white',
  warning: 'bg-yellow-500 text-black',
  error: 'bg-error-600 text-white',
  neutral: 'bg-neutral-100 text-neutral-700'
};

export const Badge = ({ variant = 'brand', children }: BadgeProps) => {
  return (
    <div className={`inline-flex h-6 items-center gap-1 rounded-md px-2 ${variantStyles[variant]} ${typography.bodyText}`}>
      {children}
    </div>
  );
}; 