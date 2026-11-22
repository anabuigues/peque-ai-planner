import { deleteAccountAction, deleteHouseholdAction, leaveHouseholdAction } from '@/app/actions/profile';
import { ChildAvatar } from '@/components/profile/child-avatar';
import { ConfirmForm } from '@/components/profile/confirm-form';
import { buttonClasses } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { ListItem } from '@/components/ui/list-item';
import { requireAppContext } from '@/server/context';
import { listMembers } from '@/server/repos/households';
import { ageInMonths, CHILD_INTEREST_LABELS, formatAge, PLAN_CATEGORIES } from '@peque/shared';
import { ChevronRight, Download, House, MapPin, Plus, SlidersHorizontal, Users } from 'lucide-react';
import Link from 'next/link';
import { HouseholdNameForm } from './household-name-form';

export const metadata = { title: 'Mi familia' };

const BUDGET_LABEL = { free: 'Solo gratis', upTo10: 'Hasta 10 €', upTo25: 'Hasta 25 €', any: 'Sin límite' } as const;

export default async function ProfilePage() {
  const { user, household, households, children } = await requireAppContext();
  const members = await listMembers(user.uid, household.id);
  const isOwner = household.ownerUid === user.uid;
  const p = household.preferences;
  const prefSummary = [
    p.maxDistanceKm ? `Hasta ${p.maxDistanceKm} km` : 'Sin límite de distancia',
    BUDGET_LABEL[p.budget],
    p.planCategories.length ? p.planCategories.map((c) => PLAN_CATEGORIES.find((x) => x.id === c)?.label).join(', ') : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-col gap-8">
      <section className="hero-gradient rounded-[var(--radius-card)] px-6 py-7 text-white lg:px-10">
        <p className="text-sm text-white/80">{isOwner ? 'Eres titular de este hogar' : 'Eres miembro de este hogar'}</p>
        <HouseholdNameForm name={household.name} />
        <p className="mt-2 flex items-center gap-2 text-white/85">
          <MapPin className="size-4" /> {household.area.label}
          {household.preciseLocation && <Badge tone="gray">ubicación precisa</Badge>}
        </p>
      </section>

      <section>
        <SectionHeader
          title="Peques"
          action={
            <Link href="/perfil/peques/nuevo" className={buttonClasses('secondary', 'sm')}>
              <Plus className="size-4" /> Añadir
            </Link>
          }
        />
        <Card className="p-2">
          {children.length === 0 ? (
            <p className="p-4 text-sm text-muted">Aún no has añadido peques a este hogar.</p>
          ) : (
            children.map((c) => (
              <Link key={c.id} href={`/perfil/peques/${c.id}`} className="flex items-center gap-4 rounded-2xl px-2 py-2.5 transition hover:bg-surface-2">
                <ChildAvatar alias={c.alias} color={c.color} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{c.alias}</span>
                  <span className="block truncate text-sm text-muted">
                    {c.interests.map((i) => CHILD_INTEREST_LABELS[i]).join(', ') || 'Sin intereses indicados'}
                  </span>
                </span>
                <span className="font-semibold">{formatAge(ageInMonths(c.birthYearMonth))}</span>
                <ChevronRight className="size-4 text-muted" />
              </Link>
            ))
          )}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Este hogar" />
          <Card className="p-2">
            <ListItem icon={Users} tone="violet" title="Adultos" subtitle={members.map((m) => m.name).join(', ')} href="/perfil/adultos" value={String(members.length)} />
            <ListItem icon={MapPin} tone="teal" title="Ubicación" subtitle={household.area.label} href="/perfil/ubicacion" />
            <ListItem icon={SlidersHorizontal} tone="amber" title="Preferencias" subtitle={prefSummary} href="/perfil/preferencias" />
          </Card>
        </div>
        <div>
          <SectionHeader
            title="Mis hogares"
            action={
              <Link href="/perfil/hogares/nuevo" className={buttonClasses('secondary', 'sm')}>
                <Plus className="size-4" /> Crear
              </Link>
            }
          />
          <Card className="p-2">
            {households.map((h) => (
              <ListItem
                key={h.id}
                icon={House}
                tone={h.id === household.id ? 'blue' : 'gray'}
                title={h.name}
                subtitle={h.areaLabel}
                value={h.id === household.id ? 'Activo' : undefined}
                valueHint={h.role === 'owner' ? 'Titular' : 'Miembro'}
              />
            ))}
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title="Privacidad" />
        <Card className="flex flex-col gap-5">
          <p className="text-sm text-muted">
            Los datos de tus peques se guardan cifrados y nunca se envían a la IA ni a terceros.
          </p>
          <a href="/api/export" className={buttonClasses('secondary', 'md', 'w-fit')}>
            <Download className="size-4" /> Descargar mis datos
          </a>
          <div className="flex flex-col gap-3 border-t border-border pt-5">
            {isOwner ? (
              <ConfirmForm
                action={deleteHouseholdAction}
                label={`Borrar «${household.name}»`}
                description="Se borrarán sus peques, preferencias e invitaciones para todos sus adultos. No se puede deshacer."
              />
            ) : (
              <ConfirmForm
                action={leaveHouseholdAction}
                label={`Salir de «${household.name}»`}
                description="Dejarás de ver sus peques y su calendario. Podrán volver a invitarte."
              />
            )}
            <ConfirmForm
              action={deleteAccountAction}
              label="Borrar mi cuenta"
              description="Se borrarán tus datos y los hogares en los que estés solo. Si eres titular de un hogar con más adultos, antes tendrás que transferirlo o borrarlo."
            />
          </div>
        </Card>
      </section>
    </div>
  );
}
