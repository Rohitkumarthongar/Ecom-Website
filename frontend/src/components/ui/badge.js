import { cn } from '../../lib/utils';

const badgeVariants = {
  default: 'bg-primary text-white hover:bg-primary/80',
  secondary: 'bg-slate-600 text-slate-100 hover:bg-slate-600/80',
  destructive: 'bg-red-600 text-white hover:bg-red-600/80',
  outline: 'border border-slate-600 text-slate-300 hover:bg-slate-700',
  success: 'bg-green-600 text-white hover:bg-green-600/80',
  warning: 'bg-yellow-600 text-white hover:bg-yellow-600/80',
};

export function Badge({ className, variant = 'default', ...props }) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  );
}