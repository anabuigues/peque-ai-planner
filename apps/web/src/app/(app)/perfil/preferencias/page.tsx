import { PreferencesForm } from '@/components/profile/preferences-form';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/context';

export const metadata = { title: 'Preferencias' };

export default async function PreferencesPage() {
  const { household } = await requireAppContext();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Preferencias" back="/perfil" description={`Cómo os gusta planificar en «${household.name}».`} />
      <Card className="p-6">
        <PreferencesForm prefs={household.preferences} />
      </Card>
    </div>
  );
}
