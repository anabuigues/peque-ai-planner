import { EmptyState } from '@/components/ui/empty-state';
import { Shapes } from 'lucide-react';

export const metadata = { title: 'Actividades' };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Actividades</h1>
      <EmptyState icon={Shapes} title="Actividades para casa" description="El catálogo por categorías con paso a paso llega en la fase 2." />
    </div>
  );
}
