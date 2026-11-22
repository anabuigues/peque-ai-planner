# Peque Plan

Aplicación web para descubrir planes y actividades para hacer con niños, y organizarlos en el calendario de la familia.

- **Planes** en tu ciudad (piloto: Madrid) filtrados por edad, precio y distancia.
- **Actividades** para casa por categorías (vida práctica, motricidad, sensorial, mesa de luz…) con paso a paso.
- **Mi planificación**: calendario compartido entre los adultos del hogar.

## Arrancar en local

Requisitos: Node 22 y JDK 21 (emuladores de Firebase; en macOS `brew install openjdk@21`). No hace falta cuenta de GCP.

```bash
npm install
cp .env.example .env.local     # y pon tu email en ADMIN_EMAILS
npm run emulators              # terminal 1 — UI de emuladores en http://localhost:4000
npm run seed                   # terminal 2 — datos de ejemplo
npm run dev                    # http://localhost:3000
```

En local el login con Google usa el emulador de Auth: aparece una ventana para crear una cuenta de prueba con el email que quieras.

## Documentación

- [`CLAUDE.md`](CLAUDE.md) — normas del proyecto
- [`docs/specs/`](docs/specs/README.md) — especificaciones por módulo
- [`docs/adr/`](docs/adr/README.md) — decisiones de arquitectura

## Estado

Fase 0 (cimientos locales) completada. Próxima: Fase 1 — Mi perfil.
