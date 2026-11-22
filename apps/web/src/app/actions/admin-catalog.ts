'use server';

import {
  blockSource,
  checkLinkExists,
  createSource,
  PoliteFetcher,
  runCrawl,
  runGenerationBatch,
  runResume,
  setActivitiesStatus,
  setSourceStatus,
  SourceInput,
  startGenerationBatch,
  startRun,
  updateActivityContent,
} from '@peque/catalog';
import { ACTIVITY_CATEGORY_IDS, ActivityContent, AGE_BANDS } from '@peque/shared';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { catalogDeps, hasAiCredentials } from '@/server/catalog-deps';
import { adminDb } from '@/server/firebase-admin';
import { requireAdmin } from '@/server/session';

/** Acciones del panel de carga de datos: todas exigen el claim admin (ADR-0007). */
export type AdminState = { error?: string; ok?: string; fieldErrors?: Record<string, string> } | undefined;

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

function zodErrors(e: z.ZodError): AdminState {
  const fieldErrors: Record<string, string> = {};
  for (const i of e.issues) fieldErrors[i.path.join('.')] ??= i.message;
  return { error: 'Revisa los campos marcados', fieldErrors };
}

function noKey(): AdminState {
  return { error: 'Falta GEMINI_API_KEY en .env.local: sin ella no se puede usar la IA.' };
}

// --- Fuentes -----------------------------------------------------------------

export async function createSourceAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = SourceInput.safeParse({
    name: form.get('name'),
    homepage: form.get('homepage'),
    discoveryKind: form.get('discoveryKind'),
    discoveryUrl: form.get('discoveryUrl') || undefined,
    urls: lines(form.get('urls')),
    pathFilter: form.get('pathFilter') || undefined,
    termsNote: form.get('termsNote') || undefined,
  });
  if (!parsed.success) return zodErrors(parsed.error);
  try {
    const { robotsAllowed } = await createSource(adminDb(), new PoliteFetcher(), parsed.data, admin.uid);
    revalidatePath('/admin');
    return { ok: robotsAllowed ? 'Fuente añadida y lista para rastrear.' : 'Fuente añadida en pausa: su robots.txt no permite rastrearla.' };
  } catch {
    return { error: 'No se pudo comprobar la web. ¿La URL es correcta?' };
  }
}

export async function crawlSourceAction(sourceId: string): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!hasAiCredentials()) return noKey();
  const runId = await startRun(adminDb(), 'crawl', admin.uid, sourceId);
  after(() => runCrawl(catalogDeps('admin'), runId, sourceId));
  revalidatePath('/admin');
  return { ok: 'Rastreo iniciado en segundo plano.' };
}

export async function resumeLoadAction(): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!hasAiCredentials()) return noKey();
  const runId = await startRun(adminDb(), 'resume', admin.uid);
  after(() => runResume(catalogDeps('admin'), runId));
  revalidatePath('/admin');
  return { ok: 'Carga reanudada en segundo plano.' };
}

export async function setSourceStatusAction(sourceId: string, status: 'active' | 'paused'): Promise<AdminState> {
  await requireAdmin();
  try {
    await setSourceStatus(adminDb(), sourceId, status);
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Error' };
  }
  revalidatePath('/admin/fuentes');
  return { ok: 'Hecho' };
}

export async function blockSourceAction(sourceId: string, retirePublished: boolean): Promise<AdminState> {
  const admin = await requireAdmin();
  const n = await blockSource(adminDb(), sourceId, admin.uid, retirePublished);
  revalidatePath('/admin', 'layout');
  return { ok: `Fuente bloqueada; ${n} actividades archivadas.` };
}

// --- Lotes de IA -------------------------------------------------------------

export async function generateBatchAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!hasAiCredentials()) return noKey();
  const parsed = z
    .object({
      category: z.union([z.enum(ACTIVITY_CATEGORY_IDS), z.literal('all')]),
      count: z.coerce.number().int().min(1).max(20),
      ageBand: z.string().optional(),
    })
    .safeParse({ category: form.get('category'), count: form.get('count'), ageBand: form.get('ageBand') || undefined });
  if (!parsed.success) return zodErrors(parsed.error);
  const ageBandId = AGE_BANDS.some((b) => b.id === parsed.data.ageBand) ? parsed.data.ageBand : undefined;
  const categories = parsed.data.category === 'all' ? [...ACTIVITY_CATEGORY_IDS] : [parsed.data.category];
  const batches: { categoryId: string; id: string }[] = [];
  for (const categoryId of categories) {
    batches.push({ categoryId, id: await startGenerationBatch(adminDb(), { categoryId, ageBandId, count: parsed.data.count }, admin.uid) });
  }
  // Uno detrás de otro en segundo plano, para no saturar la cuota.
  after(async () => {
    const deps = catalogDeps('admin');
    for (const b of batches) await runGenerationBatch(deps, b.id, { categoryId: b.categoryId, ageBandId, count: parsed.data.count });
  });
  revalidatePath('/admin/actividades');
  return { ok: `${batches.length} lote(s) en cola. Cada uno tarda unos minutos.` };
}

// --- Revisión ----------------------------------------------------------------

export async function bulkStatusAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const ids = form.getAll('ids').map(String);
  const status = z.enum(['published', 'archived', 'draft']).safeParse(form.get('status'));
  if (!ids.length) return { error: 'Selecciona al menos una actividad' };
  if (!status.success) return { error: 'Acción no válida' };
  await setActivitiesStatus(adminDb(), ids, status.data, admin.uid);
  revalidatePath('/admin', 'layout');
  revalidatePath('/actividades');
  const verb = { published: 'publicadas', archived: 'descartadas', draft: 'devueltas a pendientes' }[status.data];
  return { ok: `${ids.length} actividades ${verb}.` };
}

export async function updateActivityAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const id = String(form.get('id'));
  const resourceUrls = lines(form.get('resources'));
  const resources = [];
  for (const url of resourceUrls) {
    const check = await checkLinkExists(url, { db: adminDb() });
    if (check.status !== 'ok') return { error: `El enlace no funciona o no se puede usar: ${url}` };
    resources.push({ type: check.type, url: check.url, title: check.title ?? url, provider: check.provider, validatedAt: check.checkedAt });
  }
  const parsed = ActivityContent.safeParse({
    title: form.get('title'),
    summary: form.get('summary'),
    categories: form.getAll('categories'),
    age: { minMonths: Number(form.get('minMonths')), maxMonths: Number(form.get('maxMonths')) },
    durationMinutes: Number(form.get('durationMinutes')),
    materials: lines(form.get('materials')),
    specialMaterials: form.get('specialMaterials') === 'on',
    steps: lines(form.get('steps')).map((text, i) => ({ order: i + 1, text })),
    tips: lines(form.get('tips')),
    resources,
    youtubeSearchQuery: form.get('youtubeSearchQuery') || undefined,
  });
  if (!parsed.success) return zodErrors(parsed.error);
  await updateActivityContent(adminDb(), id, parsed.data);
  const status = form.get('publish');
  if (status === 'published' || status === 'archived') await setActivitiesStatus(adminDb(), [id], status, admin.uid);
  revalidatePath('/admin', 'layout');
  revalidatePath('/actividades', 'layout');
  return { ok: status === 'published' ? 'Guardada y publicada.' : 'Cambios guardados.' };
}
