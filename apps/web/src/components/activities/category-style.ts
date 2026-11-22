import type { Tone } from '@/components/ui/tone';
import { ACTIVITY_CATEGORIES } from '@peque/shared';
import { Brain, Footprints, Hand, Lightbulb, MessageCircle, Moon, Sparkles, Utensils, type LucideIcon } from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  'vida-practica': Utensils,
  'motricidad-gruesa': Footprints,
  'motricidad-fina': Hand,
  cognicion: Brain,
  lenguaje: MessageCircle,
  sensorial: Sparkles,
  'mesa-de-luz': Lightbulb,
  'luz-negra': Moon,
};

export function categoryStyle(id: string | undefined) {
  const c = ACTIVITY_CATEGORIES.find((x) => x.id === id);
  return { label: c?.label ?? 'Actividad', tone: (c?.color ?? 'gray') as Tone, icon: ICONS[id ?? ''] ?? Sparkles };
}

export function formatAgeRange(min: number, max: number): string {
  const f = (m: number) => (m < 24 ? `${m} m` : `${Math.floor(m / 12)} a`);
  if (max >= 144) return `desde ${f(min)}`;
  return `${f(min)} – ${f(max)}`;
}
