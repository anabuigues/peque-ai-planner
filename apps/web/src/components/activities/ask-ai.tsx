'use client';

import { requestIdeasAction } from '@/app/actions/activities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/field';
import { Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

interface Props {
  categoryId?: string;
  childId?: string;
  duration?: string;
  noSpecialMaterials?: boolean;
  keyword?: string;
  pending: boolean;
  lastError?: string;
}

/** "¿No encuentras lo que buscas?" — pide 3 ideas a la IA con los filtros actuales (ADR-0020). */
export function AskAi(props: Props) {
  const router = useRouter();
  const [keyword, setKeyword] = useState(props.keyword ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, start] = useTransition();

  // Mientras haya una petición en curso, refresca cada 5 s para mostrar el resultado.
  useEffect(() => {
    if (!props.pending) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [props.pending, router]);

  return (
    <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface p-6">
      <div className="flex items-start gap-3">
        <span className="hero-gradient flex size-10 shrink-0 items-center justify-center rounded-full text-white">
          <Sparkles className="size-5" />
        </span>
        <div>
          <h2 className="font-semibold">¿No encuentras lo que buscas?</h2>
          <p className="text-sm text-muted">
            Pide 3 ideas nuevas a la IA con los filtros que tienes puestos. Tarda 1–3 minutos; puedes seguir navegando.
          </p>
        </div>
      </div>
      {props.pending ? (
        <p className="flex items-center gap-2 text-sm font-medium" role="status">
          <span className="size-2 animate-pulse rounded-full bg-primary" /> Pensando ideas para vosotros…
        </p>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            start(async () => {
              const res = await requestIdeasAction({ ...props, keyword: keyword || undefined });
              if (res.error) setError(res.error);
              router.refresh();
            });
          }}
        >
          <Input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={40}
            placeholder="Tema opcional (p. ej. agua, otoño, dinosaurios)"
            aria-label="Tema opcional"
            className="sm:flex-1"
          />
          <Button type="submit" disabled={submitting}>
            <Sparkles className="size-4" /> Pedir ideas a la IA
          </Button>
        </form>
      )}
      <p className="text-xs text-muted">No escribas datos de tus peques. Las ideas de la IA no están revisadas: comprueba que sean seguras.</p>
      {(error || props.lastError) && (
        <p className="text-sm text-red-600" role="alert">
          {error ?? props.lastError}
        </p>
      )}
    </div>
  );
}
