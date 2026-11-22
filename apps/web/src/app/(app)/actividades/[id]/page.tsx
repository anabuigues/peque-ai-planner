import { categoryStyle, formatAgeRange } from '@/components/activities/category-style';
import { SaveButton } from '@/components/activities/save-button';
import { VideoEmbed } from '@/components/activities/video-embed';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { PageHeader } from '@/components/ui/page-header';
import { TONES } from '@/components/ui/tone';
import { cn } from '@/lib/cn';
import { requireAppContext } from '@/server/context';
import { getActivityForHousehold, listSavedIds } from '@/server/repos/activities';
import { youtubeId } from '@peque/catalog';
import { CalendarPlus, Clock, ExternalLink, ShieldAlert, Users } from 'lucide-react';
import { notFound } from 'next/navigation';

export async function generateMetadata() {
  return { title: 'Actividad' };
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, household } = await requireAppContext();
  const a = await getActivityForHousehold(id, household.id);
  if (!a) notFound();
  const saved = (await listSavedIds(user.uid, household.id)).has(a.id);
  const { tone, label } = categoryStyle(a.categories[0]);
  const isAi = a.origin === 'ai-admin' || a.origin === 'ai-on-demand';
  const video = a.resources.find((r) => r.type === 'video' && youtubeId(r.url));
  const articles = a.resources.filter((r) => r !== video);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title={a.title} back="/actividades" />
      <div className="-mt-4 flex flex-wrap items-center gap-2 text-sm text-muted">
        {a.categories.map((c) => (
          <Badge key={c} tone={categoryStyle(c).tone}>
            {categoryStyle(c).label}
          </Badge>
        ))}
        <span className="inline-flex items-center gap-1">
          <Clock className="size-4" /> {a.durationMinutes} min
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-4" /> {formatAgeRange(a.age.minMonths, a.age.maxMonths)}
        </span>
        {a.specialMaterials && <Badge>Material especial</Badge>}
      </div>

      {a.origin === 'ai-on-demand' && (
        <p className="flex items-start gap-2 rounded-2xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 size-4 shrink-0" /> Sugerida por IA y sin revisar: comprueba que sea segura para tus peques antes de hacerla.
        </p>
      )}

      <p className="text-lg">{a.summary}</p>

      <div className="flex flex-wrap gap-2">
        <SaveButton activityId={a.id} saved={saved} withLabel />
        <Button variant="secondary" disabled title="Muy pronto">
          <CalendarPlus className="size-4" /> Añadir al calendario · muy pronto
        </Button>
      </div>

      {video && <VideoEmbed videoId={youtubeId(video.url)!} title={video.title} provider={video.provider} />}

      <div className="grid gap-6 md:grid-cols-[1fr_1.4fr]">
        <section>
          <SectionHeader title="Materiales" />
          <Card>
            {a.materials.length ? (
              <ul className="flex flex-col gap-2 text-sm">
                {a.materials.map((m) => (
                  <li key={m} className="flex items-center gap-3">
                    <input type="checkbox" className="size-4 accent-[var(--primary)]" aria-label={m} /> {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No necesitas nada especial.</p>
            )}
          </Card>
        </section>
        <section>
          <SectionHeader title="Paso a paso" />
          <Card>
            <ol className="flex flex-col gap-4">
              {a.steps.map((s) => (
                <li key={s.order} className="flex gap-3">
                  <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold", TONES[tone])}>{s.order}</span>
                  <span className="pt-0.5 text-sm leading-relaxed">{s.text}</span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      </div>

      {a.tips.length > 0 && (
        <section>
          <SectionHeader title="Consejos" />
          <Card>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm">
              {a.tips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section className="flex flex-col gap-2 text-sm">
        {a.attributions.map((at) => (
          <a key={at.url} href={at.url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 font-semibold text-primary">
            Idea de {at.sourceName} <ExternalLink className="size-4" />
          </a>
        ))}
        {articles.map((r) => (
          <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="flex w-fit items-center gap-2 text-primary">
            {r.title} <ExternalLink className="size-4" />
          </a>
        ))}
        {a.youtubeSearchQuery && (
          <a
            href={`https://www.youtube.com/results?search_query=${encodeURIComponent(a.youtubeSearchQuery)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-fit items-center gap-2 text-muted hover:text-foreground"
          >
            Ver ejemplos en YouTube <ExternalLink className="size-4" />
          </a>
        )}
        {isAi && a.origin === 'ai-admin' && <p className="text-xs text-muted">Actividad propuesta por IA y revisada por Peque Plan.</p>}
        <p className="text-xs text-muted">Categoría principal: {label}.</p>
      </section>
    </div>
  );
}
