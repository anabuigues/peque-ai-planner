'use client';

import { searchMunicipalitiesAction } from '@/app/actions/profile';
import { Field, Input } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { MADRID_NEIGHBORHOODS, normalizeForSearch } from '@peque/shared';
import { Check, LocateFixed, MapPin } from 'lucide-react';
import { useEffect, useMemo, useState, useTransition } from 'react';

interface Initial {
  kind: 'barrio' | 'municipio';
  id: string;
  label: string;
  precise?: { lat: number; lng: number };
}

/**
 * Ubicación sin direcciones (ADR-0012, ADR-0016): barrio de Madrid o municipio,
 * y opcionalmente la geolocalización del navegador (se guarda cifrada).
 */
export function LocationPicker({ initial, error }: { initial?: Initial; error?: string }) {
  const [mode, setMode] = useState<'barrio' | 'municipio'>(initial?.kind ?? 'barrio');
  const [selected, setSelected] = useState<{ id: string; label: string } | null>(
    initial ? { id: initial.id, label: initial.label } : null,
  );
  const [query, setQuery] = useState('');
  const [municipios, setMunicipios] = useState<{ code: string; name: string; province: string }[]>([]);
  const [precise, setPrecise] = useState(initial?.precise ?? null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const barrios = useMemo(() => {
    const q = normalizeForSearch(query);
    if (!q) return [];
    return MADRID_NEIGHBORHOODS.filter(
      (n) => normalizeForSearch(n.name).includes(q) || normalizeForSearch(n.district).includes(q),
    ).slice(0, 8);
  }, [query]);

  useEffect(() => {
    if (mode !== 'municipio' || query.trim().length < 2) return;
    const t = setTimeout(() => startTransition(async () => setMunicipios(await searchMunicipalitiesAction(query))), 200);
    return () => clearTimeout(t);
  }, [query, mode]);

  const results =
    mode === 'barrio'
      ? barrios.map((n) => ({ id: n.id, label: `${n.name} · ${n.district}` }))
      : query.trim().length < 2
        ? []
        : municipios.map((m) => ({ id: m.code, label: `${m.name} · ${m.province}` }));

  function switchMode(next: 'barrio' | 'municipio') {
    setMode(next);
    setSelected(null);
    setQuery('');
    setMunicipios([]);
  }

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name="locationKind" value={mode} />
      <input type="hidden" name="locationId" value={selected?.id ?? ''} />
      {precise && (
        <>
          <input type="hidden" name="lat" value={precise.lat} />
          <input type="hidden" name="lng" value={precise.lng} />
        </>
      )}

      <div className="inline-flex w-fit rounded-full bg-surface-2 p-1" role="tablist">
        {(['barrio', 'municipio'] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm font-medium transition',
              mode === m ? 'bg-surface shadow-sm' : 'text-muted',
            )}
          >
            {m === 'barrio' ? 'Barrio de Madrid' : 'Otro municipio'}
          </button>
        ))}
      </div>

      <Field
        label={mode === 'barrio' ? 'Tu barrio' : 'Municipio'}
        htmlFor="location-search"
        error={error}
        hint="Solo guardamos la zona aproximada, nunca tu dirección."
      >
        {selected ? (
          <div className="flex h-12 items-center justify-between rounded-2xl border border-primary bg-surface px-4 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <MapPin className="size-4 text-primary" /> {selected.label}
            </span>
            <button type="button" className="font-semibold text-primary" onClick={() => setSelected(null)}>
              Cambiar
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input
              id="location-search"
              autoComplete="off"
              placeholder={mode === 'barrio' ? 'Escribe tu barrio o distrito (p. ej. Chamberí)' : 'Escribe el municipio'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.length > 0 && (
              <ul className="absolute inset-x-0 top-14 z-10 max-h-72 overflow-auto rounded-2xl bg-surface p-1 shadow-xl" role="listbox">
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm hover:bg-surface-2"
                      onClick={() => {
                        setSelected(r);
                        setQuery('');
                      }}
                    >
                      {r.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Field>

      <div className="flex flex-col gap-1">
        {precise ? (
          <p className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-emerald-600" /> Usaremos tu ubicación precisa (guardada cifrada).
            <button type="button" className="font-semibold text-primary" onClick={() => setPrecise(null)}>
              Quitar
            </button>
          </p>
        ) : (
          <button
            type="button"
            className="flex w-fit items-center gap-2 text-sm font-semibold text-primary"
            onClick={() => {
              setGeoError(null);
              if (!navigator.geolocation) return setGeoError('Tu navegador no permite obtener la ubicación');
              navigator.geolocation.getCurrentPosition(
                (pos) => setPrecise({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                () => setGeoError('No hemos podido obtener tu ubicación'),
                { enableHighAccuracy: false, timeout: 10000 },
              );
            }}
          >
            <LocateFixed className="size-4" /> Usar mi ubicación para más precisión (opcional)
          </button>
        )}
        {geoError && <p className="text-xs text-red-600">{geoError}</p>}
      </div>
    </div>
  );
}
