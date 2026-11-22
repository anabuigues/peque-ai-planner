import { ActivityCard } from '@/components/activities/activity-card';
import { AskAi } from '@/components/activities/ask-ai';
import { categoryStyle } from '@/components/activities/category-style';
import { ChildAvatar } from '@/components/profile/child-avatar';
import { SectionHeader } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { TONES } from '@/components/ui/tone';
import { cn } from '@/lib/cn';
import { parseFilters } from '@/server/activity-filter';
import { requireAppContext } from '@/server/context';
import {
  listAiRequests,
  listHouseholdSuggestions,
  listSavedActivities,
  listSavedIds,
  searchActivities,
} from '@/server/repos/activities';
import { ACTIVITY_CATEGORIES, DURATION_FILTERS } from '@peque/shared';
import { Search, Shapes } from 'lucide-react';
import Link from 'next/link';

export const metadata = { title: 'Actividades' };

type Params = Record<string, string | undefined>;

function href(params: Params, change: Params): string {
  const next = { ...params, ...change };
  const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
  const s = qs.toString();
  return s ? `/actividades?${s}` : '/actividades';
}

function Pill({ to, active, children, tone }: { to: string; active: boolean; children: React.ReactNode; tone?: keyof typeof TONES }) {
  return (
    <Link
      href={to}
      scroll={false}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-medium transition',
        active ? 'bg-foreground text-background' : tone ? cn(TONES[tone], 'hover:opacity-80') : 'bg-surface hover:bg-surface-2',
      )}
    >
      {children}
    </Link>
  );
}

export default async function ActivitiesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const { user, household, children } = await requireAppContext();
  const filters = parseFilters(params);
  const tab = params.tab === 'guardadas' ? 'guardadas' : 'todas';

  const [results, savedIds, suggestions, requests] = await Promise.all([
    searchActivities(children, filters),
    listSavedIds(user.uid, household.id),
    listHouseholdSuggestions(household.id),
    listAiRequests(user.uid, household.id),
  ]);
  const saved = tab === 'guardadas' ? await listSavedActivities(user.uid, household.id) : [];
  const pendingRequest = requests.some((r) => r.status === 'queued' || r.status === 'generating');
  const lastError = requests[0]?.status === 'error' ? requests[0].error : undefined;
  const selectedChild = children.find((c) => c.id === filters.para);
  const whoLabel = selectedChild ? selectedChild.alias : children.map((c) => c.alias).join(' y ');
  const list = tab === 'guardadas' ? saved : results;
  const toggleCat = (id: string) => {
    const set = new Set(filters.categories);
    if (set.has(id as never)) set.delete(id as never);
    else set.add(id as never);
    return [...set].join(',') || undefined;
  };

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Actividades en casa</h1>
        <p className="text-muted">
          {tab === 'guardadas'
            ? `${saved.length} guardadas en «${household.name}»`
            : `${results.length} actividades${children.length ? ` para ${whoLabel}` : ''}`}
        </p>
      </header>

      <div className="flex gap-2">
        <Pill to={href(params, { tab: undefined })} active={tab === 'todas'}>
          Todas
        </Pill>
        <Pill to={href(params, { tab: 'guardadas' })} active={tab === 'guardadas'}>
          Guardadas ({savedIds.size})
        </Pill>
      </div>

      {tab === 'todas' && (
        <section className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-background">
          {children.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Para quién">
              <Pill to={href(params, { para: undefined })} active={!filters.para}>
                Todos
              </Pill>
              {children.map((c) => (
                <Pill key={c.id} to={href(params, { para: c.id })} active={filters.para === c.id}>
                  <ChildAvatar alias={c.alias} color={c.color} className="size-6 text-xs" /> {c.alias}
                </Pill>
              ))}
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Categorías">
            {ACTIVITY_CATEGORIES.map((c) => {
              const { icon: Icon } = categoryStyle(c.id);
              return (
                <Pill key={c.id} to={href(params, { cat: toggleCat(c.id) })} active={filters.categories.includes(c.id)} tone={c.color as keyof typeof TONES}>
                  <Icon className="size-4" /> {c.label}
                </Pill>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {DURATION_FILTERS.map((d) => (
              <Pill key={d.id} to={href(params, { dur: filters.duration === d.id ? undefined : d.id })} active={filters.duration === d.id}>
                {d.label}
              </Pill>
            ))}
            <Pill to={href(params, { sin: filters.noSpecialMaterials ? undefined : '1' })} active={filters.noSpecialMaterials}>
              Sin material especial
            </Pill>
            <Pill to={href(params, { origen: filters.origin === 'web' ? undefined : 'web' })} active={filters.origin === 'web'}>
              De la web
            </Pill>
            <Pill to={href(params, { origen: filters.origin === 'ai' ? undefined : 'ai' })} active={filters.origin === 'ai'}>
              Sugeridas por IA
            </Pill>
          </div>
          <form action="/actividades" className="relative">
            {Object.entries(params)
              .filter(([k, v]) => k !== 'q' && v)
              .map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={v} />
              ))}
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <input
              name="q"
              defaultValue={filters.query}
              placeholder="Buscar por palabra: agua, pinzas, harina…"
              aria-label="Buscar actividades"
              className="h-12 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-ring/40"
            />
          </form>
        </section>
      )}

      {tab === 'todas' && suggestions.length > 0 && (
        <section>
          <SectionHeader title="Sugeridas para vosotros" />
          <p className="-mt-2 mb-3 px-1 text-xs text-muted">Ideas de la IA que habéis pedido. Revisa que sean seguras para tus peques.</p>
          <div className="grid gap-3 lg:grid-cols-2">
            {suggestions.map((a) => (
              <ActivityCard key={a.id} activity={a} saved={savedIds.has(a.id)} />
            ))}
          </div>
        </section>
      )}

      <section>
        {list.length === 0 ? (
          <EmptyState
            icon={Shapes}
            title={tab === 'guardadas' ? 'Aún no has guardado actividades' : 'No hay actividades con estos filtros'}
            description={tab === 'guardadas' ? 'Pulsa el marcador de una actividad para guardarla aquí.' : 'Prueba a quitar algún filtro o pide ideas a la IA.'}
            action={
              tab === 'todas' ? (
                <Link href="/actividades" className="text-sm font-semibold text-primary">
                  Quitar filtros
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((a) => (
              <ActivityCard key={a.id} activity={a} saved={savedIds.has(a.id)} />
            ))}
          </div>
        )}
      </section>

      {tab === 'todas' && (
        <AskAi
          categoryId={filters.categories[0]}
          childId={filters.para}
          duration={filters.duration}
          noSpecialMaterials={filters.noSpecialMaterials}
          keyword={filters.query}
          pending={pendingRequest}
          lastError={lastError}
        />
      )}
    </div>
  );
}
