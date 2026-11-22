import { categoryStyle, formatAgeRange } from '@/components/activities/category-style';
import { AutoRefresh } from '@/components/admin/action-button';
import { Card, SectionHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { hasAiCredentials } from '@/server/catalog-deps';
import { adminOverview, listForReview, type AdminTab } from '@/server/repos/admin-catalog';
import Link from 'next/link';
import { BulkReview } from './bulk-review';
import { GenerateForm } from './generate-form';

export const metadata = { title: 'Revisar actividades' };

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'pendientes', label: 'Pendientes' },
  { id: 'familias', label: 'Sugeridas por familias' },
  { id: 'publicadas', label: 'Publicadas' },
  { id: 'descartadas', label: 'Descartadas' },
];

const ORIGIN_LABEL: Record<string, string> = { web: 'Web', 'ai-admin': 'IA (lote)', 'ai-on-demand': 'IA (familia)', manual: 'Manual' };

export default async function AdminActivitiesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.id === sp.tab)?.id ?? 'pendientes') as AdminTab;
  const [items, overview] = await Promise.all([
    listForReview(tab, { category: sp.cat, source: sp.fuente, origin: sp.origen }),
    adminOverview(),
  ]);
  const busy = overview.batches.some((b) => ['queued', 'generating', 'validating'].includes(b.status)) || overview.runs.some((r) => r.status === 'running');

  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="Generar con IA para cubrir huecos" />
        <Card className="p-6">
          <GenerateForm enabled={hasAiCredentials()} />
        </Card>
      </section>
      <AutoRefresh active={busy} />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/admin/actividades?tab=${t.id}`}
            className={cn('rounded-full px-4 py-1.5 text-sm font-medium', tab === t.id ? 'bg-foreground text-background' : 'bg-surface text-muted')}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="text-muted">Origen:</span>
        {['', 'web', 'ai-admin', 'manual'].map((o) => (
          <Link key={o} href={`/admin/actividades?tab=${tab}${o ? `&origen=${o}` : ''}`} className={cn('rounded-full px-3 py-1', (sp.origen ?? '') === o ? 'bg-foreground text-background' : 'bg-surface')}>
            {o ? ORIGIN_LABEL[o] : 'Todos'}
          </Link>
        ))}
        {overview.sources.length > 0 && <span className="ml-2 text-muted">Fuente:</span>}
        {overview.sources.map((s) => (
          <Link key={s.id} href={`/admin/actividades?tab=${tab}&fuente=${s.id}`} className={cn('rounded-full px-3 py-1', sp.fuente === s.id ? 'bg-foreground text-background' : 'bg-surface')}>
            {s.name}
          </Link>
        ))}
      </div>

      <BulkReview
        tab={tab}
        items={items.map((a) => {
          const c = categoryStyle(a.categories[0]);
          return {
            id: a.id,
            title: a.title,
            summary: a.summary,
            meta: [
              c.label,
              formatAgeRange(a.age.minMonths, a.age.maxMonths),
              `${a.durationMinutes} min`,
              ORIGIN_LABEL[a.origin],
              a.attributions.map((x) => x.sourceName).join(', '),
              a.resources.length ? `${a.resources.length} recurso(s)` : 'sin vídeo',
              tab === 'familias' ? `guardada por ${a.savedBy} hogar(es)` : '',
            ]
              .filter(Boolean)
              .join(' · '),
          };
        })}
      />
    </div>
  );
}
