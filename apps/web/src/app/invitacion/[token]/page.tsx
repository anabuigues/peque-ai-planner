import { Logo } from '@/components/shell/logo';
import { buttonClasses } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { checkInvite, getUserDoc, hasCurrentConsent } from '@/server/repos/households';
import { requireUser } from '@/server/session';
import Link from 'next/link';
import { AcceptInviteButton } from './accept-invite-button';

export const metadata = { title: 'Invitación' };

const MESSAGES = {
  invalid: ['Invitación no válida', 'El enlace no existe o ha sido revocado. Pide uno nuevo.'],
  expired: ['La invitación ha caducado', 'Las invitaciones duran 14 días. Pide que te envíen otra.'],
  used: ['Esta invitación ya se ha usado', 'Cada enlace sirve una sola vez.'],
  'wrong-email': ['Esta invitación es para otra cuenta', 'Entra con la cuenta de Google del email al que te invitaron.'],
  'already-member': ['Ya formas parte de este hogar', 'No tienes que hacer nada más.'],
} as const;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const user = await requireUser();
  const check = await checkInvite(token, user.uid, user.email);
  const needsConsent = !hasCurrentConsent(await getUserDoc(user.uid));

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-4 py-8">
      <Logo />
      <Card className="flex flex-col gap-4 p-6">
        {check.status === 'ok' ? (
          <>
            <h1 className="text-2xl font-bold tracking-tight">Únete a «{check.householdName}»</h1>
            <p className="text-muted">
              {check.invitedBy} te invita a compartir peques, planes y calendario. Entraste como <strong>{user.email}</strong>.
            </p>
            {needsConsent ? (
              <Link href="/bienvenida" className={buttonClasses('primary', 'md', 'w-fit')}>
                Antes, acepta la política de privacidad
              </Link>
            ) : (
              <AcceptInviteButton token={token} />
            )}
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold tracking-tight">{MESSAGES[check.status][0]}</h1>
            <p className="text-muted">{MESSAGES[check.status][1]}</p>
            <Link href="/" className={buttonClasses('secondary', 'md', 'w-fit')}>
              Ir a Peque Plan
            </Link>
          </>
        )}
      </Card>
    </main>
  );
}
