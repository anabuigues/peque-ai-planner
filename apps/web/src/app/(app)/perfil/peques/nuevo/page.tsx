import { ChildForm } from '@/components/profile/child-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/context';

export const metadata = { title: 'Añadir peque' };

export default async function NewChildPage() {
  const { household } = await requireAppContext();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Añadir peque" back="/perfil" description={`Se añadirá a «${household.name}».`} />
      <Card className="p-6">
        <ChildForm submitLabel="Añadir peque" />
      </Card>
    </div>
  );
}
