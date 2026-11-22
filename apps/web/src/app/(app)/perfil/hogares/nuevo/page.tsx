import { HouseholdForm } from '@/components/profile/household-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/context';
import { listChildren } from '@/server/repos/households';

export const metadata = { title: 'Crear hogar' };

export default async function NewHouseholdPage() {
  const { user, households } = await requireAppContext();
  const sources = await Promise.all(
    households.map(async (h) => ({ id: h.id, name: h.name, children: (await listChildren(user.uid, h.id)).map((c) => ({ id: c.id, alias: c.alias })) })),
  );
  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Crear otro hogar"
        back="/perfil"
        description="Por ejemplo la casa del pueblo o la de los abuelos. Cada hogar tiene sus adultos, peques, ubicación y calendario."
      />
      <Card className="p-6">
        <HouseholdForm copySources={sources.filter((s) => s.children.length > 0)} next="/perfil" />
      </Card>
    </div>
  );
}
