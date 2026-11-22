'use client';

import { Button } from '@/components/ui/button';
import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, pendingText = 'Guardando…', ...props }: React.ComponentProps<typeof Button> & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
