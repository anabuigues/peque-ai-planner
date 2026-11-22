import { CalendarDays, Compass, Home, Palette, Shapes, ShieldCheck, Users } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/', label: 'Inicio', icon: Home },
  { href: '/planes', label: 'Planes', icon: Compass },
  { href: '/actividades', label: 'Actividades', icon: Shapes },
  { href: '/calendario', label: 'Calendario', icon: CalendarDays },
  { href: '/perfil', label: 'Mi familia', icon: Users },
];

export const ADMIN_NAV_ITEMS = [
  { href: '/admin', label: 'Administración', icon: ShieldCheck },
  { href: '/design', label: 'Diseño', icon: Palette },
];
