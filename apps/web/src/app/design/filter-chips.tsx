'use client';

import { Chip } from '@/components/ui/chip';
import { useState } from 'react';

const FILTERS = ['Este finde', 'Gratis', 'Interior', '< 5 km', '3–6 años'];

export function FilterChips() {
  const [active, setActive] = useState<string[]>(['Este finde']);
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl bg-background p-2">
      {FILTERS.map((f) => (
        <Chip
          key={f}
          active={active.includes(f)}
          onClick={() => setActive((a) => (a.includes(f) ? a.filter((x) => x !== f) : [...a, f]))}
        >
          {f}
        </Chip>
      ))}
    </div>
  );
}
