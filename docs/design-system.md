# Design System — Mi Postal · Rediseño 2025

Sistema de diseño minimalista inspirado en la claridad de Google, con identidad Panini (navy + gold).

---

## Paleta de colores

| Token | Valor | Uso |
|-------|-------|-----|
| `--color-bg` | `#f7f7f8` | Fondo global de página |
| `--color-surface` | `#ffffff` | Fondo de cards, modales, header |
| `--color-surface-alt` | `#f2f2f4` | Fondo de filas activas, inputs |
| `--color-border` | `#e4e4e7` | Bordes principales |
| `--color-border-sub` | `#f0f0f2` | Bordes internos de tabla |
| `--color-ink` | `#111111` | Texto principal |
| `--color-ink-muted` | `#6b6b6f` | Texto secundario (subtítulos, labels) |
| `--color-ink-faint` | `#aeaeb2` | Texto terciario (placeholders, hints) |
| `--color-gold` | `#e8a020` | Precios, accento Panini, badges |
| `--color-gold-light` | `#f5c55a` | Hover del gold |
| `--color-gold-dim` | `#92580e` | Texto sobre fondo gold claro |
| `--color-gold-bg` | `#fffbf0` | Fondo de chips/badges gold |
| `--color-gold-border` | `#fde68a` | Borde de elementos gold |
| `--color-primary` | `#0e1b3d` | Navy: botones, badges, header de datos |
| `--color-primary-hover` | `#162349` | Hover del primary |
| `--color-danger` | `#ef4444` | Borrar, errores |
| `--color-focus` | `#0066ff` | Outline de foco (accesibilidad) |

---

## Tipografía

**Fuente:** Inter (Google Fonts) — variable 14..32, 100..900

### Escala fluida (clamp)

| Token | Rango | Uso |
|-------|-------|-----|
| `--text-xs` | 11px → 12px | Labels, badges, captions |
| `--text-sm` | 12.8px → 14px | Body secundario, tabla |
| `--text-base` | 14.4px → 16px | Body principal |
| `--text-lg` | 16px → 18px | Precios CRC, subtítulos |
| `--text-xl` | 18px → 22px | H1 de sección (app) |
| `--text-2xl` | 24px → 32px | Títulos de landing |
| `--text-3xl` | 32px → 48px | Headings grandes |
| `--text-hero` | 40px → 72px | Headline hero |

### Pesos usados

- `400` — body regular
- `500` — nav links, labels de form
- `600` — subtítulos, nombres de jugador
- `700` — section titles, card titles
- `800` — hero title, precios, badges
- `900` — overlay title (loading screen)

---

## Espaciado

Base: **4px**. Tokens `--sp-N` donde N = múltiplo.

```
--sp-1:  4px     --sp-2:  8px     --sp-3:  12px
--sp-4:  16px    --sp-5:  20px    --sp-6:  24px
--sp-8:  32px    --sp-10: 40px    --sp-12: 48px
--sp-16: 64px
```

---

## Radios de borde

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | `6px` | Botones, inputs, badges pequeños |
| `--radius` | `12px` | Cards de jugador |
| `--radius-lg` | `20px` | Cart section, modales, dialogs |
| `--radius-xl` | `28px` | Landing CTA banner |
| `--radius-full` | `9999px` | Pills, avatares, search bar, botones primarios |

---

## Sombras

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
--shadow-sm: 0 1px 3px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,0,0,0.03);
--shadow:    0 2px 10px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
--shadow-lg: 0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
--shadow-overlay: 0 24px 64px rgba(0,0,0,0.18);
```

Principio: **sombra + borde de 1px** en capas elevadas (modales, overlays). Las cards usan solo `--shadow-sm` y suben a `--shadow` en hover.

---

## Componentes clave

### Search bar
- `border-radius: var(--radius-full)` — estilo Google
- `border: 1.5px solid var(--color-border)`
- Focus: `border-color: var(--color-primary)` + ring `rgba(14,27,61,0.07)`

### Player card
- Fondo `--color-surface`, borde `--color-border`, `--shadow-sm`
- Hover: `translateY(-1px)` + `--shadow`
- Precio CRC en `--color-gold`, bold 800
- Botón + circular: navy en hover, gold cuando añadido

### Header (app)
- Fondo `--color-surface` (blanco), sin color de marca en el fondo
- `border-bottom: 1px solid var(--color-border)`
- Logo + texto, nav links en `--color-ink-muted`

### Cart table
- Header de columnas en `--color-ink-faint`, 0.67rem uppercase
- Filas separadas por `--color-border-sub` (muy sutil)
- Total en `--text-xl` bold, fondo `--color-bg`

### Modales / dialogs
- Backdrop: `rgba(0,0,0,0.35)` + `backdrop-filter: blur(6px)`
- Border radius `--radius-lg`
- En mobile: bottom sheet (translateY animation)

### Filter dialog
- Desktop: modal centrado
- Mobile: bottom sheet con `border-radius: var(--radius-lg) var(--radius-lg) 0 0`

---

## Animaciones

| Animación | Duración | Uso |
|-----------|----------|-----|
| `slideIn` | 200ms ease | Cards de resultado al buscar |
| `rowIn` / `rowOut` | 200ms | Filas entrando/saliendo del carrito |
| `addBtnBounce` | 280ms spring | Botón + al agregar jugador |
| `dialogIn` / `dialogOut` | 260/200ms | Apertura/cierre de modales |
| `sheetIn` / `sheetOut` | 280ms | Modales mobile (bottom sheet) |
| `filterSheetIn` | 260ms | Filter dialog en mobile |
| `shimmer` | 1.4s infinite | Skeleton loaders |
| `overlayIn` / `overlayOut` | 200ms | Config modal backdrop |
| `vt-page-out` / `vt-page-in` | 160/200ms | View transitions entre páginas |
| `header-shrink` | scroll-driven | Header landing compacto al hacer scroll |

**Accesibilidad:** Todo el sistema respeta `prefers-reduced-motion: reduce` con `0.01ms` en duración de animaciones.

---

## Arquitectura CSS

```
src/css/
├── tokens.css      — Variables CSS globales + view-transition setup
├── app.css         — Estilos desktop del app (app.html)
├── app-mobile.css  — Overrides mobile ≤640px
└── pages.css       — Estilos para about.html y como-usar.html
```

Landing page (`index.html`): CSS inline en `<style>` dentro del mismo archivo para zero-dependency load.

### Cascade
Sin `@layer` explícito (no necesario a esta escala). Especificidad controlada por orden de archivos: `tokens → app → app-mobile`.

---

## Patrones de modern-web-guidance utilizados

| Patrón | Feature | Archivo |
|--------|---------|---------|
| Cross-document view transitions | `@view-transition { navigation: auto }` | `tokens.css` |
| Shrinking header on scroll | `animation-timeline: scroll()` + `animation-range` | `index.html` |
| Scroll entry reveal | `IntersectionObserver` + CSS `opacity/translate` | `index.html` |
| `text-wrap: balance` | `text-wrap: balance` | `app.css`, `index.html` |
| Fluid typography | `clamp()` | `tokens.css` |
| Bottom sheet mobile | `translate` + `@keyframes` condicional | `app-mobile.css` |
| Backdrop blur modals | `backdrop-filter: blur()` | `app.css`, `index.html` |

---

## Estructura de archivos

```
panini-valor/
├── index.html              ← Landing page (CSS inline)
├── src/
│   ├── app.html            ← App principal
│   ├── css/
│   │   ├── tokens.css
│   │   ├── app.css
│   │   ├── app-mobile.css
│   │   └── pages.css
│   ├── js/                 ← Módulos ES (sin cambios de lógica)
│   ├── data/               ← players.csv.gz
│   ├── assets/             ← Imágenes (emblem, slider)
│   └── pages/
│       ├── about.html
│       └── como-usar.html
├── docs/
│   └── design-system.md   ← Este archivo
└── README.md
```
