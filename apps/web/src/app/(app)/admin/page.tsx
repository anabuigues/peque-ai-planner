import { resumeLoadAction } from '@/app/actions/admin-catalog';
import { ActionButton, AutoRefresh } from '@/components/admin/action-button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { hasAiCredentials } from '@/server/catalog-deps';
import { adminOverview } from '@/server/repos/admin-catalog';
import { ACTIVITY_CATEGORIES, AGE_BANDS } from '@peque/shared';
import Link from 'next/link';

export const metadata = { title: 'Administración' };

const STATUS_LABEL: Record<string, string> = {
  running: 'En curso', paused_quota: 'Pausada (cuota del día)', done: 'Terminada', error: 'Error',
  queued: 'En cola', generating: 'Generando', validating: 'Validando enlaces',
};

export default async function AdminPage() {
  const o = await adminOverview();
  const busy = o.runs.some((r) => r.status === 'running') || o.batches.some((b) => ['queued', 'generating', 'validating'].includes(b.status));
  const pct = Math.min(100, Math.round((o.usage.used / o.usage.daily) * 100));

  return (
    <div className="flex flex-col gap-6">
      {!hasAiCredentials() && (
        <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">Falta GEMINI_API_KEY en .env.local: la carga con IA está desactivada.</p>
      )}
      <AutoRefresh active={busy} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Cuota de IA de hoy</p>
          <p className="mt-1 text-3xl font-bold">
            {o.usage.used}
            <span className="text-base font-medium text-muted"> / {o.usage.daily}</span>
          </p>
          <div className="mt-3 h-2 rounded-full bg-surface-2">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted">Carga: hasta {o.usage.adminLimit} · el 20 % se reserva para las familias.</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Páginas en cola</p>
          <p className="mt-1 text-3xl font-bold">{o.pending}</p>
          <p className="mt-2 text-xs text-muted">{o.pending ? `≈ ${o.estimatedDays} día(s) al ritmo de la cuota gratuita` : 'Nada pendiente'}</p>
          {o.pending > 0 && (
            <div className="mt-3">
              <ActionButton action={resumeLoadAction} variant="primary">
                Continuar carga
              </ActionButton>
            </div>
          )}
        </Card>
        <Card>
          <p className="text-sm text-muted">Catálogo</p>
          <p className="mt-1 text-3xl font-bold">{o.counts.published}</p>
          <p className="mt-2 text-xs text-muted">
            publicadas ·{' '}
            <Link href="/admin/actividades" className="font-semibold text-primary">
              {o.counts.drafts} pendientes de revisar
            </Link>
          </p>
        </Card>
      </div>

      <section>
        <SectionHeader title="Cobertura (publicadas por categoría y edad)" />
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="p-3 font-medium">Categoría</th>
                {AGE_BANDS.map((b) => (
                  <th key={b.id} className="p-3 text-center font-medium">{b.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ACTIVITY_CATEGORIES.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="p-3 font-medium">{c.label}</td>
                  {AGE_BANDS.map((b) => {
                    const n = o.coverage[c.id]?.[b.id] ?? 0;
                    return (
                      <td key={b.id} className="p-3 text-center">
                        <span className={n === 0 ? 'text-red-500' : n < 5 ? 'text-amber-600' : 'font-semibold'}>{n}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Últimos rastreos" />
          <Card className="flex flex-col gap-3 text-sm">
            {o.runs.length === 0 && <p className="text-muted">Aún no hay rastreos. Añade una fuente.</p>}
            {o.runs.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3">
                <span>
                  {r.job === 'crawl' ? `Rastreo · ${o.sources.find((s) => s.id === r.sourceId)?.name ?? 'fuente'}` : 'Continuar carga'}
                  <span className="block text-xs text-muted">
                    {r.counters?.fetched ?? 0} páginas · {r.counters?.activities ?? 0} actividades · {r.counters?.pending ?? 0} en cola
                    {r.error ? ` · ${r.error}` : ''}
                  </span>
                </span>
                <Badge tone={r.status === 'done' ? 'green' : r.status === 'error' ? 'pink' : 'amber'}>{STATUS_LABEL[r.status] ?? r.status}</Badge>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <SectionHeader title="Últimos lotes de IA" />
          <Card className="flex flex-col gap-3 text-sm">
            {o.batches.length === 0 && <p className="text-muted">Sin lotes todavía.</p>}
            {o.batches.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <span>
                  {ACTIVITY_CATEGORIES.find((c) => c.id === b.category)?.label} · {b.requested}
                  <span className="block text-xs text-muted">
                    {b.created ?? 0} creadas · {b.duplicates ?? 0} duplicadas · {b.links?.valid ?? 0} vídeos válidos
                    {b.error ? ` · ${b.error}` : ''}
                  </span>
                </span>
                <Badge tone={b.status === 'done' ? 'green' : b.status === 'error' ? 'pink' : 'amber'}>{STATUS_LABEL[b.status] ?? b.status}</Badge>
              </div>
            ))}
          </Card>
        </div>
      </section>
    </div>
  );
}
