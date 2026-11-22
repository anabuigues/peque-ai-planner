import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { ListItem } from '@/components/ui/list-item';
import { QuickAction } from '@/components/ui/quick-action';
import type { Tone } from '@/components/ui/tone';
import { ThemeToggle } from '@/components/shell/theme-toggle';
import { getSessionUser } from '@/server/session';
import { ACTIVITY_CATEGORIES } from '@peque/shared';
import { CalendarPlus, Compass, Lightbulb, Shapes, Sparkles, Ticket, Trees, Users } from 'lucide-react';
import { notFound } from 'next/navigation';
import { FilterChips } from './filter-chips';

export const metadata = { title: 'Sistema de diseño' };

const COLOR_TOKENS = ['background', 'surface', 'surface-2', 'foreground', 'muted', 'primary', 'border'];

export default async function DesignPage() {
  // Catálogo vivo del sistema de diseño (docs/specs/diseno.md). En producción, solo admin.
  if (process.env.NODE_ENV === 'production' && !(await getSessionUser())?.isAdmin) notFound();

  return (
    <main className="mx-auto flex max-w-[1080px] flex-col gap-10 px-4 py-10 lg:px-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Peque Plan</p>
          <h1 className="text-4xl font-bold tracking-tight">Sistema de diseño</h1>
          <p className="mt-2 max-w-xl text-muted">
            Tokens y componentes base, inspirados en el estilo de las apps de banca modernas. Cambia el
            modo con el botón para revisar claro y oscuro.
          </p>
        </div>
        <ThemeToggle />
      </header>

      <section>
        <SectionHeader title="Colores" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {COLOR_TOKENS.map((t) => (
            <Card key={t} className="p-3">
              <div className="h-14 rounded-2xl border border-border" style={{ background: `var(--${t})` }} />
              <p className="mt-2 font-mono text-xs">--{t}</p>
            </Card>
          ))}
        </div>
        <div className="hero-gradient mt-3 h-16 rounded-[var(--radius-card)]" aria-label="Degradado de cabecera" />
      </section>

      <section>
        <SectionHeader title="Categorías de actividad" />
        <div className="flex flex-wrap gap-2">
          {ACTIVITY_CATEGORIES.map((c) => (
            <Badge key={c.id} tone={c.color as Tone}>
              {c.label}
            </Badge>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Tipografía" />
        <Card className="flex flex-col gap-2">
          <p className="text-5xl font-bold tracking-tight">12</p>
          <p className="text-3xl font-bold tracking-tight">Titular de página</p>
          <p className="text-lg font-semibold">Título de sección</p>
          <p>Texto de párrafo para descripciones de planes y actividades.</p>
          <p className="text-sm text-muted">Texto secundario y metadatos</p>
        </Card>
      </section>

      <section>
        <SectionHeader title="Cabecera con acciones rápidas" />
        <div className="hero-gradient rounded-[var(--radius-card)] px-6 pb-7 pt-8 text-white">
          <p className="text-sm text-white/80">Hola, Ana</p>
          <p className="mt-3 text-5xl font-bold tracking-tight">3</p>
          <p className="text-white/85">planes este fin de semana</p>
          <div className="mt-8 grid grid-cols-4 gap-2 sm:flex sm:gap-6">
            <QuickAction icon={Compass} label="Buscar plan" href="#" />
            <QuickAction icon={Shapes} label="En casa" href="#" />
            <QuickAction icon={CalendarPlus} label="Planificar" href="#" />
            <QuickAction icon={Users} label="Mi familia" href="#" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <SectionHeader title="Lista tipo movimientos" />
          <Card className="p-2">
            <ListItem icon={Trees} tone="green" title="Granja escuela El Álamo" subtitle="Sábado · 10:00" value="12 €" valueHint="4,2 km" />
            <ListItem icon={Ticket} tone="violet" title="Teatro de títeres" subtitle="Domingo · 12:30" value="Gratis" valueHint="1,1 km" />
            <ListItem icon={Lightbulb} tone="yellow" title="Mesa de luz: colores" subtitle="Mesa de luz" value="20 min" valueHint="desde 2 años" />
          </Card>
        </div>
        <div>
          <SectionHeader title="Botones y filtros" />
          <Card className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <Button>Añadir al calendario</Button>
              <Button variant="secondary">Guardar</Button>
              <Button variant="ghost">Cancelar</Button>
              <Button size="sm">Pequeño</Button>
            </div>
            <FilterChips />
            <div className="flex items-center gap-3">
              <Avatar name="Ana Buigues" />
              <Avatar name="Luis" />
              <Badge tone="green">Gratis</Badge>
              <Badge tone="blue">Interior</Badge>
              <Badge>Borrador</Badge>
            </div>
          </Card>
        </div>
      </section>

      <section>
        <SectionHeader title="Estado vacío" />
        <EmptyState
          icon={Sparkles}
          title="Nada por aquí todavía"
          description="Los estados vacíos explican qué falta y ofrecen el siguiente paso."
          action={<Button size="sm">Explorar planes</Button>}
        />
      </section>
    </main>
  );
}
