import { blockSourceAction, crawlSourceAction, setSourceStatusAction } from '@/app/actions/admin-catalog';
import { ActionButton } from '@/components/admin/action-button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { adminDb } from '@/server/firebase-admin';
import { listSources } from '@peque/catalog';
import { ExternalLink } from 'lucide-react';
import { SourceForm } from './source-form';

export const metadata = { title: 'Fuentes' };

export default async function SourcesPage() {
  const sources = await listSources(adminDb());
  return (
    <div className="flex flex-col gap-6">
      <section>
        <SectionHeader title="Fuentes de actividades" />
        <Card className="flex flex-col divide-y divide-border p-2">
          {sources.length === 0 && <p className="p-4 text-sm text-muted">Añade blogs o webs de actividades infantiles para empezar a llenar el catálogo.</p>}
          {sources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold">
                  {s.name}
                  <a href={s.homepage} target="_blank" rel="noopener noreferrer" className="text-muted">
                    <ExternalLink className="size-3.5" />
                  </a>
                </p>
                <p className="text-xs text-muted">
                  {s.discovery.kind.toUpperCase()} · {s.pending ?? 0} páginas en cola
                  {s.lastCrawlAt ? ` · último rastreo ${new Date(s.lastCrawlAt).toLocaleString('es-ES')}` : ''}
                  {s.termsNote ? ` · ${s.termsNote}` : ''}
                </p>
              </div>
              {!s.robotsAllowed && <Badge tone="pink">robots.txt lo prohíbe</Badge>}
              <Badge tone={s.status === 'active' ? 'green' : s.status === 'blocked' ? 'pink' : 'gray'}>
                {s.status === 'active' ? 'Activa' : s.status === 'blocked' ? 'Bloqueada' : 'En pausa'}
              </Badge>
              {s.status === 'active' && (
                <>
                  <ActionButton action={crawlSourceAction.bind(null, s.id)} variant="primary">
                    Rastrear
                  </ActionButton>
                  <ActionButton action={setSourceStatusAction.bind(null, s.id, 'paused')}>Pausar</ActionButton>
                </>
              )}
              {s.status === 'paused' && s.robotsAllowed && <ActionButton action={setSourceStatusAction.bind(null, s.id, 'active')}>Activar</ActionButton>}
              {s.status !== 'blocked' && (
                <>
                  <ActionButton action={blockSourceAction.bind(null, s.id, false)} variant="ghost" confirm="Se bloqueará la fuente y se archivarán sus actividades pendientes. ¿Seguir?">
                    Bloquear
                  </ActionButton>
                  <ActionButton
                    action={blockSourceAction.bind(null, s.id, true)}
                    variant="ghost"
                    confirm="Se bloqueará la fuente y se retirarán TODAS sus actividades, también las publicadas. ¿Seguir?"
                  >
                    Bloquear y retirar publicadas
                  </ActionButton>
                </>
              )}
            </div>
          ))}
        </Card>
      </section>
      <section>
        <SectionHeader title="Añadir fuente" />
        <Card className="p-6">
          <SourceForm />
        </Card>
      </section>
    </div>
  );
}
