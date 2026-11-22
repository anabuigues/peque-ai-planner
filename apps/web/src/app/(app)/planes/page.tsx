import { EmptyState } from '@/components/ui/empty-state';
import { Compass } from 'lucide-react';

export const metadata = { title: 'Planes' };

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Planes</h1>
      <EmptyState icon={Compass} title="Planes en Madrid" description="Muy pronto podrás buscar planes por edad, precio y distancia desde casa (fase 3)." />
    </div>
  );
}
