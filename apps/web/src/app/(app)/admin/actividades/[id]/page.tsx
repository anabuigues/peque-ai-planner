import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { getActivityForAdmin } from '@/server/repos/admin-catalog';
import { notFound } from 'next/navigation';
import { EditActivityForm } from './edit-form';

export const metadata = { title: 'Editar actividad' };

export default async function EditActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const a = await getActivityForAdmin(id);
  if (!a) notFound();
  return (
    <div className="max-w-3xl">
      <PageHeader title="Editar actividad" back="/admin/actividades" description={`Estado: ${a.status} · origen: ${a.origin}`} />
      {a.attributions.length > 0 && (
        <p className="-mt-3 mb-4 text-sm text-muted">
          Fuentes:{' '}
          {a.attributions.map((x) => (
            <a key={x.url} href={x.url} target="_blank" rel="noopener noreferrer" className="mr-2 text-primary underline">
              {x.sourceName}
            </a>
          ))}
        </p>
      )}
      <Card className="p-6">
        <EditActivityForm activity={a} />
      </Card>
    </div>
  );
}
