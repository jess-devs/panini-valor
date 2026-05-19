# transfermarkt-datasets — Guía para Panini Valor

Repo: https://github.com/dcaribou/transfermarkt-datasets  
Licencia: CC0-1.0 (dominio público, sin restricciones de uso)  
Actualización: automática, cada semana via GitHub Actions

---

## Qué es

Un dataset de fútbol construido con scraping de Transfermarkt, limpiado,
estructurado y publicado automáticamente. No requiere API key. Los archivos
CSV están disponibles públicamente en una URL de Cloudflare R2.

---

## URL pública del CSV de jugadores

```
https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz
```

Archivo comprimido con gzip. El navegador puede descargarlo y descomprimirlo
usando la `DecompressionStream` API nativa (sin librerías externas).

---

## Tablas disponibles

| Tabla | Descripción | Filas aprox. |
|---|---|---|
| `players` | Perfiles, posición, valor de mercado | 30,000+ |
| `player_valuations` | Historial de valores por jugador | 450,000+ |
| `clubs` | Datos de clubes, valor del plantel | 400+ |
| `competitions` | Ligas y torneos | 40+ |
| `games` | Resultados de partidos | 68,000+ |
| `appearances` | Una fila por jugador por partido | 1,500,000+ |
| `transfers` | Traspasos entre clubes | -- |
| `game_events` | Goles, tarjetas, sustituciones | 950,000+ |
| `game_lineups` | Onces titulares y suplentes | 81,000+ |
| `club_games` | Vista por club de cada partido | 136,000+ |

Para Panini Valor solo se necesita la tabla `players`.

---

## Campos de la tabla `players`

| Campo | Tipo | Descripción |
|---|---|---|
| `player_id` | integer | ID único del jugador en Transfermarkt |
| `first_name` | string | Primer nombre |
| `last_name` | string | Apellido |
| `name` | string | Nombre completo o nombre de juego |
| `last_season` | integer | Última temporada con actividad registrada |
| `current_club_id` | integer | ID del club actual |
| `player_code` | string | Slug de URL en Transfermarkt (ej: `kylian-mbappe`) |
| `country_of_birth` | string | País de nacimiento |
| `city_of_birth` | string | Ciudad de nacimiento |
| `country_of_citizenship` | string | Nacionalidad |
| `date_of_birth` | date | Fecha de nacimiento |
| `sub_position` | string | Posición específica (ej: `Centre-Forward`) |
| `position` | string | Posición general: `Attack`, `Midfield`, `Defender`, `Goalkeeper` |
| `foot` | string | Pie dominante: `right`, `left`, `both` |
| `height_in_cm` | integer | Altura en centímetros |
| `market_value_in_eur` | integer | Valor de mercado actual en euros |
| `highest_market_value_in_eur` | integer | Valor histórico máximo en euros |
| `contract_expiration_date` | date | Fecha de vencimiento del contrato |
| `agent_name` | string | Nombre del representante |
| `image_url` | string | URL de la foto del jugador en Transfermarkt |
| `url` | string | URL completa del perfil en Transfermarkt |
| `current_club_domestic_competition_id` | string | ID de la liga del club actual |
| `current_club_name` | string | Nombre del club actual |
| `current_national_team_id` | integer | ID de la selección nacional actual |

El campo más importante para Panini Valor es `market_value_in_eur`.  
Para filtrar por selección del mundial se usa `current_national_team_id`.

---

## Ejemplo de fila (Mbappé)

```
player_id: 342229
name: Kylian Mbappé
position: Attack
sub_position: Centre-Forward
country_of_citizenship: France
date_of_birth: 1998-12-20
height_in_cm: 178
foot: right
market_value_in_eur: 180000000
highest_market_value_in_eur: 200000000
current_club_name: Real Madrid CF
image_url: https://img.a.transfermarkt.technology/portrait/medium/342229-...
```

---

## Relación entre tablas relevantes

```
players ──── player_id ────> player_valuations  (historial de valores)
players ──── current_club_id ──> clubs          (datos del club)
players ──── current_national_team_id ──> ?     (no hay tabla nacional directa,
                                                  se filtra por ID numérico)
```

---

## Los 48 equipos del Mundial 2026

Lista completa con los IDs de selección tal como aparecen en Transfermarkt.
El campo `current_national_team_id` en `players.csv` usa estos IDs.

### CONMEBOL — 6 equipos

| Selección | Transfermarkt ID |
|---|---|
| Argentina | 3512 |
| Brasil | 3439 |
| Colombia | 3516 |
| Uruguay | 3515 |
| Ecuador | 3518 |
| Paraguay | 3517 |

### UEFA — 16 equipos

| Selección | Transfermarkt ID |
|---|---|
| España | 3375 |
| Francia | 3377 |
| Alemania | 3376 |
| Portugal | 3380 |
| Países Bajos | 3379 |
| Bélgica | 3382 |
| Croacia | 3553 |
| Suiza | 3384 |
| Noruega | 3383 |
| Escocia | 3396 |
| Austria | 3385 |
| Inglaterra | 3378 |
| Bosnia-Herzegovina | 3561 |
| Suecia | 3395 |
| Turquía | 3388 |
| Chequia | 3387 |

### CONCACAF — 6 equipos

| Selección | Transfermarkt ID |
|---|---|
| Estados Unidos | 3505 |
| México | 3508 |
| Canadá | 3506 |
| Haití | 3525 |
| Panamá | 3526 |
| Curazao | 14297 |

### CAF — 10 equipos

| Selección | Transfermarkt ID |
|---|---|
| Marruecos | 3428 |
| Egipto | 3432 |
| Argelia | 3429 |
| Ghana | 3430 |
| Costa de Marfil | 3434 |
| Túnez | 3427 |
| Senegal | 3433 |
| Sudáfrica | 3436 |
| DR Congo | 3435 |
| Cabo Verde | 11336 |

### AFC — 9 equipos

| Selección | Transfermarkt ID |
|---|---|
| Japón | 3462 |
| Corea del Sur | 3460 |
| Australia | 3447 |
| Irán | 3463 |
| Arabia Saudí | 3465 |
| Qatar | 3475 |
| Uzbekistán | 3471 |
| Jordania | 3469 |
| Iraq | 3464 |

### OFC — 1 equipo

| Selección | Transfermarkt ID |
|---|---|
| Nueva Zelanda | 3489 |

---

## Nota sobre los IDs de Transfermarkt

Los IDs de arriba son aproximados, basados en los valores habituales del dataset.
Al filtrar el CSV, verificar que el campo `current_national_team_id` coincide
con los jugadores esperados (ej: buscar a Mbappé y confirmar que su ID es el
de Francia).

Si algún ID no coincide, la URL del perfil de Transfermarkt incluye el ID numérico:
```
https://www.transfermarkt.com/kylian-mbappe/profil/spieler/342229
                                                              ^^^^^^
                                                              player_id
```
Para selecciones es igual:
```
https://www.transfermarkt.com/frankreich/startseite/verein/3377
                                                            ^^^^
                                                            national_team_id
```

---

## Cómo se usa en el navegador (flujo técnico)

```javascript
// 1. Descargar el CSV comprimido
const response = await fetch(
  'https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz'
);

// 2. Descomprimir gzip con API nativa del navegador
const ds = new DecompressionStream('gzip');
const stream = response.body.pipeThrough(ds);
const text = await new Response(stream).text();

// 3. Parsear CSV con PapaParse
const { data } = Papa.parse(text, { header: true, dynamicTyping: true });

// 4. Filtrar las 48 selecciones del mundial
const WORLD_CUP_TEAM_IDS = [3512, 3439, 3516, /* ... todos los IDs ... */];
const players = data.filter(p =>
  WORLD_CUP_TEAM_IDS.includes(p.current_national_team_id)
  && p.market_value_in_eur > 0
);

// 5. Resultado: ~864 jugadores listos para buscar
```

---

## Posible problema: CORS

Si Cloudflare R2 no tiene configurados los headers CORS para permitir requests
desde GitHub Pages, el navegador bloqueará la descarga. En ese caso la solución
es un Cloudflare Worker gratuito (100k requests/día) que actúe como proxy:

```
GitHub Pages → Cloudflare Worker → R2 (con CORS correcto) → respuesta al browser
```

Esto se verifica en la primera prueba. Si el fetch funciona directo, no se
necesita el Worker.
