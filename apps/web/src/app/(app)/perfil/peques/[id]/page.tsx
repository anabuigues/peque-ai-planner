import { deleteChildAction } from '@/app/actions/profile';
import { ChildForm } from '@/components/profile/child-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/context';
import { notFound } from 'next/navigation';
import { DeleteChildButton } from './delete-child-button';

export const metadata = { title: 'Editar peque' };

export default async function EditChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { children } = await requireAppContext();
  const child = children.find((c) => c.id === id);
  if (!child) notFound();
  return (
    <div className="max-w-2xl">
      <PageHeader title={child.alias} back="/perfil" />
      <Card className="p-6">
        <ChildForm child={child} />
      </Card>
      <div className="mt-6">
        <DeleteChildButton onDelete={deleteChildAction.bind(null, child.id)} alias={child.alias} />
      </div>
    </div>
  );
}
