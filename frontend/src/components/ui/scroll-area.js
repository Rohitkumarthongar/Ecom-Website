import { cn } from '../../lib/utils';

export function ScrollArea({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-auto scrollbar-invisible',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function ScrollAreaWithThinScrollbar({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'relative overflow-auto scrollbar-thin',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}