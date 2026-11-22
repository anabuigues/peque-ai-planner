import { EmptyState } from '@/components/ui/empty-state';
import { CalendarDays } from 'lucide-react';

export const metadata = { title: 'Calendario' };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Calendario</h1>
      <EmptyState icon={CalendarDays} title="Tu planificación" description="El calendario semanal y mensual de la familia llega en la fase 4." />
    </div>
  );
}
