import { ChildAvatar } from '@/components/profile/child-avatar';
import { ChildForm } from '@/components/profile/child-form';
import { HouseholdForm } from '@/components/profile/household-form';
import { PreferencesForm } from '@/components/profile/preferences-form';
import { Logo } from '@/components/shell/logo';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import {
  findInvitesForEmail,
  getActiveHousehold,
  getUserDoc,
  hasCurrentConsent,
  listChildren,
  listHouseholds,
} from '@/server/repos/households';
import { requireUser } from '@/server/session';
import { ageInMonths, formatAge } from '@peque/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ConsentForm } from './consent-form';
import { JoinInviteButton } from './join-invite-button';

export const metadata = { title: 'Bienvenida' };

const STEPS = ['Privacidad', 'Hogar', 'Peques', 'Preferencias'];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ paso?: string }> }) {
  const { paso } = await searchParams;
  const user = await requireUser();
  const [userDoc, households] = await Promise.all([getUserDoc(user.uid), listHouseholds(user.uid)]);

  let step: number;
  if (!hasCurrentConsent(userDoc)) step = 0;
  else if (households.length === 0) step = 1;
  else if (paso === 'peques') step = 2;
  else if (paso === 'preferencias') step = 3;
  else redirect('/');

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <ol className="flex gap-1.5" aria-label="Progreso">
          {STEPS.map((s, i) => (
            <li key={s} className={cn('h-1.5 w-8 rounded-full', i <= step ? 'bg-primary' : 'bg-border')} aria-current={i === step ? 'step' : undefined}>
              <span className="sr-only">{s}</span>
            </li>
          ))}
        </ol>
      </header>
      {step === 0 && <ConsentStep firstName={user.name.split(' ')[0]!} />}
      {step === 1 && <HouseholdStep email={user.email} />}
      {step === 2 && <ChildrenStep uid={user.uid} />}
      {step === 3 && <PreferencesStep uid={user.uid} />}
    </main>
  );
}

function Title({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">{text}</p>
    </div>
  );
}

function ConsentStep({ firstName }: { firstName: string }) {
  return (
    <>
      <Title title={`¡Hola, ${firstName}!`} text="Antes de empezar, te contamos cómo cuidamos los datos de tu familia." />
      <Card className="flex flex-col gap-4 p-6 text-sm">
        <ul className="flex list-disc flex-col gap-2 pl-5">
          <li>De tus peques solo pedimos un alias, el mes y año de nacimiento y lo que les gusta. Nada de fotos ni datos de salud.</li>
          <li>Esos datos se guardan cifrados y solo los ven los adultos de tu hogar.</li>
          <li>Tu ubicación es solo la zona (barrio o municipio); nunca pedimos tu dirección.</li>
          <li>Nada de esto se envía a la inteligencia artificial ni a terceros.</li>
          <li>Puedes descargar o borrar tus datos cuando quieras desde «Mi familia».</li>
        </ul>
        <ConsentForm />
      </Card>
    </>
  );
}

async function HouseholdStep({ email }: { email: string }) {
  const invites = await findInvitesForEmail(email);
  return (
    <>
      <Title title="Tu hogar" text="Un hogar agrupa a los adultos y peques que planifican juntos. Podrás crear más (la casa del pueblo, la de los abuelos…)." />
      {invites.length > 0 && (
        <Card className="flex flex-col gap-3 p-6">
          <h2 className="font-semibold">Te han invitado</h2>
          {invites.map((i) => (
            <div key={i.id} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-2 p-3">
              <p className="text-sm">
                <strong>{i.invitedBy}</strong> te invita a «{i.householdName}»
              </p>
              <JoinInviteButton inviteId={i.id} />
            </div>
          ))}
          <p className="text-xs text-muted">O crea tu propio hogar:</p>
        </Card>
      )}
      <Card className="p-6">
        <HouseholdForm next="/bienvenida?paso=peques" />
      </Card>
    </>
  );
}

async function ChildrenStep({ uid }: { uid: string }) {
  const household = await getActiveHousehold(uid);
  if (!household) redirect('/bienvenida');
  const children = await listChildren(uid, household.id);
  return (
    <>
      <Title title="Tus peques" text={`¿Quién viene a los planes en «${household.name}»? Puedes añadir más después.`} />
      {children.length > 0 && (
        <Card className="p-2">
          {children.map((c) => (
            <div key={c.id} className="flex items-center gap-4 px-2 py-2.5">
              <ChildAvatar alias={c.alias} color={c.color} />
              <span className="flex-1 font-medium">{c.alias}</span>
              <span className="text-sm text-muted">{formatAge(ageInMonths(c.birthYearMonth))}</span>
            </div>
          ))}
        </Card>
      )}
      <Card className="p-6">
        <ChildForm next="/bienvenida?paso=peques" submitLabel={children.length ? 'Añadir otro peque' : 'Añadir peque'} />
      </Card>
      <Link href="/bienvenida?paso=preferencias" className={buttonClasses(children.length ? 'primary' : 'ghost', 'lg', 'self-end')}>
        {children.length ? 'Continuar' : 'Lo haré luego'}
      </Link>
    </>
  );
}

async function PreferencesStep({ uid }: { uid: string }) {
  const household = await getActiveHousehold(uid);
  if (!household) redirect('/bienvenida');
  return (
    <>
      <Title title="Vuestras preferencias" text="Nos ayudan a filtrar planes. Puedes cambiarlas cuando quieras." />
      <Card className="p-6">
        <PreferencesForm prefs={household.preferences} next="/" submitLabel="Empezar" />
      </Card>
      <Link href="/" className={buttonClasses('ghost', 'md', 'self-end')}>
        Saltar
      </Link>
    </>
  );
}
