import { getSessionUser } from '@/server/session';
import { redirect } from 'next/navigation';
import { GoogleSignInButton } from './google-sign-in-button';

export const metadata = { title: 'Entrar' };

export default async function LoginPage() {
  if (await getSessionUser()) redirect('/');
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="hero-gradient flex flex-col justify-between p-8 text-white lg:p-12">
        <span className="text-lg font-bold tracking-tight">Peque Plan</span>
        <div className="max-w-md py-16">
          <h1 className="text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Menos tiempo buscando, más tiempo con tus peques.
          </h1>
          <p className="mt-4 text-lg text-white/85">
            Planes en tu ciudad y actividades para casa, adaptados a la edad y gustos de tu familia.
          </p>
        </div>
        <p className="text-sm text-white/70">Beta privada</p>
      </section>
      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-bold tracking-tight">Entra en Peque Plan</h2>
          <p className="mt-2 text-muted">Usa tu cuenta de Google. No publicamos nada en tu nombre.</p>
          <div className="mt-8">
            <GoogleSignInButton />
          </div>
          <p className="mt-6 text-xs text-muted">
            Al continuar aceptas la política de privacidad. Los datos de tus hijos se guardan cifrados y
            nunca se comparten.
          </p>
        </div>
      </section>
    </main>
  );
}
