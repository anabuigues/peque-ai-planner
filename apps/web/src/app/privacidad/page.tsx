import { Logo } from '@/components/shell/logo';
import { Card } from '@/components/ui/card';
import { PRIVACY_POLICY_VERSION } from '@peque/shared';

export const metadata = { title: 'Política de privacidad' };

/** Versión publicada de docs/legal/politica-privacidad.md (mantener sincronizadas). */
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
      <Logo />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Política de privacidad</h1>
        <p className="mt-1 text-sm text-muted">Versión {PRIVACY_POLICY_VERSION} · Beta privada</p>
      </div>
      <Card className="prose-sm flex flex-col gap-4 p-6 text-sm leading-relaxed [&_h2]:mt-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
        <h2>Qué datos tratamos</h2>
        <ul>
          <li>Tu email, nombre y foto de Google, para darte acceso.</li>
          <li>De cada hogar: su nombre, la zona (barrio o municipio), la ubicación precisa si decides darla y vuestras preferencias.</li>
          <li>De cada peque: un alias, el mes y año de nacimiento, sus intereses y notas opcionales. Nunca fotos ni datos de salud.</li>
          <li>El email de las personas que invitas, para comprobar que acepta quien debe.</li>
        </ul>
        <h2>Cómo los protegemos</h2>
        <ul>
          <li>Los datos de los peques, el nombre del hogar, la ubicación precisa y los emails de invitación se guardan cifrados con una clave propia de cada hogar.</li>
          <li>Solo los adultos de cada hogar ven sus datos. El equipo de Peque Plan no tiene acceso a ellos desde la aplicación.</li>
          <li>No enviamos datos de tu familia a la inteligencia artificial ni los cedemos a terceros.</li>
        </ul>
        <h2>Dónde y cuánto tiempo</h2>
        <p>
          Usamos Google Cloud / Firebase como proveedor, con los datos en Madrid. Se conservan mientras uses el servicio; al borrarlos
          desaparecen al momento y de las copias de seguridad en un máximo de 7 días. Las invitaciones caducan a los 14 días.
        </p>
        <h2>Tus derechos</h2>
        <p>
          Desde «Mi familia» puedes descargar tus datos, corregirlos, salir de un hogar, borrarlo o borrar tu cuenta. Para cualquier otra
          petición escríbenos. Puedes reclamar ante la Agencia Española de Protección de Datos.
        </p>
        <h2>Menores</h2>
        <p>
          Peque Plan es para personas adultas. Los datos de menores solo los introduce su madre, padre, tutor legal o alguien con su
          autorización.
        </p>
      </Card>
    </main>
  );
}
