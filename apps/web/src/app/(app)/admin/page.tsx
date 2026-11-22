import { EmptyState } from '@/components/ui/empty-state';
import { requireAdmin } from '@/server/session';
import { Database } from 'lucide-react';

export const metadata = { title: 'Administración' };

export default async function AdminPage() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
      <EmptyState
        icon={Database}
        title="Gestión de datos"
        description="Fuentes, ingestas, revisión de borradores y caché de IA. Solo visible para administradoras (ADR-0007). Llega en las fases 2 y 3."
      />
    </div>
  );
}
