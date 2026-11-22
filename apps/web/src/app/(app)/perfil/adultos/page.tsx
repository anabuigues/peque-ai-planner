import { Avatar } from '@/components/ui/avatar';
import { Card, SectionHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/chip';
import { PageHeader } from '@/components/ui/page-header';
import { requireAppContext } from '@/server/context';
import { listMembers, listPendingInvites } from '@/server/repos/households';
import { InviteForm } from './invite-form';
import { MemberActions, RevokeInviteButton } from './member-actions';

export const metadata = { title: 'Adultos del hogar' };

export default async function AdultsPage() {
  const { user, household } = await requireAppContext();
  const [members, invites] = await Promise.all([
    listMembers(user.uid, household.id),
    listPendingInvites(user.uid, household.id),
  ]);
  const isOwner = household.ownerUid === user.uid;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Adultos" back="/perfil" description={`Quién comparte peques y calendario en «${household.name}».`} />

      <Card className="p-2">
        {members.map((m) => (
          <div key={m.uid} className="flex items-center gap-4 px-2 py-2.5">
            <Avatar name={m.name} src={m.picture} className="size-11" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {m.name} {m.uid === user.uid && <span className="text-muted">(tú)</span>}
              </p>
              <p className="truncate text-sm text-muted">{m.email}</p>
            </div>
            {m.role === 'owner' ? <Badge tone="violet">Titular</Badge> : <Badge>Miembro</Badge>}
            {isOwner && m.role !== 'owner' && <MemberActions memberUid={m.uid} name={m.name} />}
          </div>
        ))}
      </Card>

      <section>
        <SectionHeader title="Invitar a otro adulto" />
        <Card className="p-6">
          <InviteForm />
        </Card>
      </section>

      {invites.length > 0 && (
        <section>
          <SectionHeader title="Invitaciones pendientes" />
          <Card className="p-2">
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-4 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.email}</p>
                  <p className="text-sm text-muted">Caduca el {new Date(i.expiresAt).toLocaleDateString('es-ES')}</p>
                </div>
                {(isOwner || i.invitedByUid === user.uid) && <RevokeInviteButton inviteId={i.id} />}
              </div>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
