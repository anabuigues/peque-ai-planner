import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
      <span className="hero-gradient flex size-9 items-center justify-center rounded-xl text-lg text-white">
        P
      </span>
      <span className="text-lg">Peque Plan</span>
    </Link>
  );
}
