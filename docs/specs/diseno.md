# Spec: Sistema de diseño

- **Estado**: Aprobada (2026-11-22)
- **Fase**: 0
- **ADRs relacionados**: ADR-0008

## Objetivo
Una interfaz web limpia y moderna, inspirada en el estilo de Revolut (sin usar su marca), que transmita orden y rapidez a padres con poco tiempo.

## Principios
1. **Lo importante, grande**: cabecera con un dato protagonista ("3 planes este finde").
2. **Acciones rápidas** en botones circulares con icono y etiqueta debajo.
3. **Tarjetas** blancas muy redondeadas sobre fondo gris claro.
4. **Listas tipo movimientos**: icono en círculo de color, título, subtítulo y dato a la derecha.
5. **Color con intención**: un acento principal y colores por categoría.

## Tokens
| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--background` | `#F2F3F7` | `#0B0B0F` | Fondo de página |
| `--surface` | `#FFFFFF` | `#17171C` | Tarjetas |
| `--foreground` | `#0B0B0F` | `#F5F5F7` | Texto principal |
| `--muted` | `#6B6F80` | `#9A9DAC` | Texto secundario |
| `--primary` | `#4F46E5` | `#7C74FF` | Acento, botones principales |
| `--border` | `#E4E6EE` | `#2A2A32` | Separadores |
| Radios | tarjeta 24px, botón píldora 999px, icono circular | | |
| Tipografía | Inter; titulares 600–700, cifras grandes 40–48px | | |
| Degradado cabecera | `#4F46E5 → #8B5CF6 → #EC4899` | | Hero de inicio |

Colores por categoría de actividad (chips e iconos): Vida práctica ámbar, Motricidad gruesa naranja, Motricidad fina rosa, Cognición violeta, Lenguaje azul, Sensorial verde azulado, Mesa de luz amarillo, Luz negra índigo oscuro.

## Layout
- Escritorio (≥1024px): barra lateral fija de 248px (logo Peque Plan, navegación, usuario abajo); contenido centrado máx. 1080px.
- Móvil (<1024px): barra superior con logo y menú desplegable; mismas tarjetas a ancho completo.
- Navegación: Inicio, Planes, Actividades, Calendario, Perfil; "Admin" solo visible con claim admin.

## Componentes iniciales
Button (primary, secondary, ghost; píldora), QuickAction (círculo + etiqueta), Card, ListItem (icono circular + textos + valor), Chip/FilterPill, Avatar, Badge, SectionHeader, EmptyState.

## Datos personales y cifrado
No aplica (solo presentación).

## Criterios de aceptación
- [ ] `/design` muestra todos los tokens y componentes en claro y oscuro.
- [ ] Inicio usa la cabecera con degradado, acciones rápidas y una lista tipo movimientos.
- [ ] Contraste AA en texto principal y secundario.
