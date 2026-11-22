/** Intérprete mínimo de robots.txt (grupos por User-agent, Allow/Disallow con * y $, regla más larga gana). */
interface Rule {
  allow: boolean;
  pattern: RegExp;
  length: number;
}

export const BOT_NAME = 'PequePlanBot';
export const USER_AGENT = `${BOT_NAME}/1.0 (+proyecto Peque Plan; rastreo educado de actividades infantiles)`;

function toRegex(path: string): RegExp {
  const escaped = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp('^' + (escaped.endsWith('\\$') ? escaped.slice(0, -2) + '$' : escaped));
}

export function parseRobots(txt: string, agent = BOT_NAME): (path: string) => boolean {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const value = m[2]!.trim();
    if (key === 'user-agent') {
      if (!lastWasAgent || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === 'allow' || key === 'disallow') && current) {
      lastWasAgent = false;
      if (key === 'disallow' && value === '') continue; // Disallow vacío = todo permitido
      current.rules.push({ allow: key === 'allow', pattern: toRegex(value), length: value.length });
    } else {
      lastWasAgent = false;
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== '*' && agent.toLowerCase().includes(a)));
  const rules = (mine.length ? mine : groups.filter((g) => g.agents.includes('*'))).flatMap((g) => g.rules);
  return (path: string) => {
    let best: Rule | undefined;
    for (const r of rules) {
      if (r.pattern.test(path) && (!best || r.length > best.length || (r.length === best.length && r.allow))) best = r;
    }
    return best ? best.allow : true;
  };
}
