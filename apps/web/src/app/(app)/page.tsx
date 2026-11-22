import { Card, SectionHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { QuickAction } from '@/components/ui/quick-action';
import type { Tone } from '@/components/ui/tone';
import { countPublishedActivities, listPublishedActivities } from '@/server/repos/activities';
import { requireUser } from '@/server/session';
import { ACTIVITY_CATEGORIES, formatAge } from '@peque/shared';
import { CalendarPlus, Compass, Shapes, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Inicio' };

export default async function HomePage() {
  const user = await requireUser();
  const [count, activities] = await Promise.all([countPublishedActivities(), listPublishedActivities(5)]);
  const firstName = user.name.split(' ')[0];

  return (
    <div className="flex flex-col gap-8">
      <section className="hero-gradient rounded-[var(--radius-card)] px-6 pb-7 pt-8 text-white lg:px-10">
        <p className="text-sm font-medium text-white/80">Hola, {firstName}</p>
        <p className="mt-3 text-5xl font-bold tracking-tight">{count}</p>
        <p className="mt-1 text-white/85">actividades listas para hacer en casa</p>
        <div className="mt-8 grid grid-cols-4 gap-2 sm:flex sm:gap-6">
          <QuickAction icon={Compass} label="Buscar plan" href="/planes" />
          <QuickAction icon={Shapes} label="En casa" href="/actividades" />
          <QuickAction icon={CalendarPlus} label="Planificar" href="/calendario" />
          <QuickAction icon={Users} label="Mi familia" href="/perfil" />
        </div>
      </section>

      <section>
        <SectionHeader
          title="Ideas para hoy"
          action={
            <Link href="/actividades" className="text-sm font-semibold text-primary">
              Ver todas
            </Link>
          }
        />
        {activities.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Aún no hay actividades"
            description="Cuando el catálogo tenga actividades publicadas aparecerán aquí. En local, ejecuta npm run seed."
          />
        ) : (
          <Card className="p-2">
            {activities.map((a) => {
              const category = ACTIVITY_CATEGORIES.find((c) => c.id === a.categories[0]);
              return (
                <ListItem
                  key={a.id}
                  icon={Shapes}
                  tone={(category?.color ?? 'gray') as Tone}
                  title={a.title}
                  subtitle={category?.label}
                  value={`${a.durationMinutes} min`}
                  valueHint={`desde ${formatAge(a.age.minMonths)}`}
                />
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
