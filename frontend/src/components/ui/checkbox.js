import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Checkbox({ checked, onCheckedChange, className, ...props }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        'h-4 w-4 rounded border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
        checked && 'bg-primary border-primary text-white',
        className
      )}
      {...props}
    >
      {checked && <Check className="h-3 w-3" />}
    </button>
  );
}