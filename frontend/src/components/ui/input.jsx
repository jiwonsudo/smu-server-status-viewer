import { cn } from '../../lib/cn';

const base =
  'w-full rounded-md border border-input bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50';

export function Input({ className, ...props }) {
  return <input className={cn(base, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={cn(base, 'min-h-20 resize-y', className)} {...props} />;
}
