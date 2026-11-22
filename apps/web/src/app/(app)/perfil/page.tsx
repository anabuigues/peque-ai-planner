import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export const metadata = { title: 'Mi familia' };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Mi familia</h1>
      <EmptyState icon={Users} title="Tu familia" description="Aquí darás de alta a tus peques, sus gustos y a otros adultos del hogar (fase 1)." />
    </div>
  );
}
