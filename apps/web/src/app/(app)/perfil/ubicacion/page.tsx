import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/context';
import { LocationForm } from './location-form';

export const metadata = { title: 'Ubicación' };

export default async function LocationPage() {
  const { household } = await requireAppContext();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Ubicación" back="/perfil" description="La usamos para calcular la distancia a los planes. Nunca te pedimos la dirección." />
      <Card className="p-6">
        <LocationForm
          initial={{ kind: household.area.kind, id: household.area.id, label: household.area.label, precise: household.preciseLocation }}
        />
      </Card>
    </div>
  );
}
