import { requireAdmin } from '@/server/session';
import { AdminTabs } from './admin-tabs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-primary">Solo administración</p>
        <h1 className="text-3xl font-bold tracking-tight">Carga de datos</h1>
      </div>
      <AdminTabs />
      {children}
    </div>
  );
}
