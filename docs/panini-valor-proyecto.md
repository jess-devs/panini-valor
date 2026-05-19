# Panini Valor — Calculadora de postales del Mundial 2026

## La idea

Una web app estática alojada en GitHub Pages que permite buscar cualquier jugador
del álbum Panini FIFA World Cup 2026 y ver cuánto vale su postal en colones
costarricenses (CRC), basado en su valor de mercado real según Transfermarkt.

**La lógica de conversión:**
- 10 millones EUR = ₡100
- Precio de la postal = `(valor_en_millones / 10) * 100` CRC
- Jugadores con valor menor a 10M EUR: precio mínimo de ₡100
- La tasa es configurable desde la propia interfaz

**Ejemplo:** Mbappé vale €180M → su postal cuesta ₡1,800

---

## Fuente de datos

Dataset público de [dcaribou/transfermarkt-datasets](https://github.com/dcaribou/transfermarkt-datasets),
actualizado semanalmente de forma automática.
Archivo de informacion en el directorio `@.structure/transfermarket/Transfermarkt-datasets-guia.md`

El navegador descarga el CSV directamente desde:

```
https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data/players.csv.gz
```

No requiere API key ni backend. Todo ocurre en el navegador.

---

## Cómo funciona

```
Navegador
  └── descarga players.csv.gz (URL pública, sin key)
  └── descomprime gzip en memoria (DecompressionStream API nativa)
  └── parsea CSV
  └── filtra las 48 selecciones del Mundial 2026
  └── índice en memoria para búsqueda por nombre
  └── muestra valor en EUR + precio en CRC
```

Solo la primera carga tarda unos segundos (el CSV pesa varios MB).
Después la búsqueda es instantánea porque todo está en memoria.

---

## Stack

| Componente | Tecnología |
|---|---|
| Hosting | GitHub Pages |
| Frontend | HTML + CSS + JS vanilla |
| Datos | CSV público de transfermarkt-datasets |
| Descompresión | DecompressionStream (API nativa del navegador) |
| Parser CSV | PapaParse (librería JS, sin instalación) |
| Sin backend | Sin servidor, sin API key, sin base de datos |

---

## Estructura del repositorio

```
panini-valor/
│
├── index.html              # App completa (UI + lógica)
├── README.md               # Descripción del proyecto
│
├── css/
│   └── style.css           # Estilos
│   └── mobile.css          # Adaptacion a Mobile
│
└── js/
    ├── app.js              # Lógica principal
    ├── data.js             # Descarga, descompresión y parseo del CSV
    ├── search.js           # Búsqueda y filtrado de jugadores
    └── converter.js        # Conversión EUR → CRC con tasa configurable
```

---

## Pantallas / vistas

### Principal
- Campo de búsqueda por nombre de jugador
- Resultado: foto (si disponible), nombre, país, posición, valor en EUR, precio en CRC
- Indicador de carga mientras descarga el CSV

### Configuración (modal o sección desplegable)
- Tasa configurable: "X millones EUR = ₡Y"
- Valores por defecto: 10M EUR = ₡100
- Se guarda en localStorage para persistir entre sesiones

---

## Selecciones del Mundial 2026 (48 equipos)

### CONMEBOL — 6 equipos
Argentina, Brasil, Colombia, Uruguay, Ecuador, Paraguay

### UEFA — 16 equipos
España, Francia, Alemania, Portugal, Países Bajos, Bélgica, Croacia,
Suiza, Noruega, Escocia, Austria, Inglaterra, Bosnia-Herzegovina,
Suecia, Turquía, Chequia

### CONCACAF — 6 equipos
Estados Unidos, México, Canadá, Haití, Panamá, Curazao

### CAF — 10 equipos
Marruecos, Egipto, Argelia, Ghana, Costa de Marfil, Túnez,
Senegal, Sudáfrica, DR Congo, Cabo Verde

### AFC — 9 equipos
Japón, Corea del Sur, Australia, Irán, Arabia Saudí,
Qatar, Uzbekistán, Jordania, Iraq

### OFC — 1 equipo
Nueva Zelanda

**Ausencias notables:** Italia (eliminada en playoffs por tercera vez consecutiva),
Costa Rica, Venezuela, Chile, Bolivia y Perú no clasificaron.

**Debutantes:** Cape Verde, Curazao, Jordania y Uzbekistán participan por primera vez.

---

## Los 12 grupos del Mundial 2026

Torneo: 11 de junio al 19 de julio de 2026 en Estados Unidos, Canadá y México.

| Grupo | Equipos |
|---|---|
| **A** | México, Corea del Sur, Sudáfrica, Chequia |
| **B** | Canadá, Bosnia-Herzegovina, Qatar, Suiza |
| **C** | Brasil, Marruecos, Haití, Escocia |
| **D** | Estados Unidos, Paraguay, Australia, Turquía |
| **E** | Alemania, Curazao, Ecuador, Costa de Marfil |
| **F** | Países Bajos, Suecia, Túnez, Japón |
| **G** | Bélgica, Egipto, Irán, Nueva Zelanda |
| **H** | España, Cabo Verde, Arabia Saudí, Uruguay |
| **I** | Francia, Senegal, Noruega, Iraq |
| **J** | Argentina, Argelia, Austria, Jordania |
| **K** | Portugal, DR Congo, Uzbekistán, Colombia |
| **L** | Inglaterra, Croacia, Ghana, Panamá |

**Grupo de la muerte:** Grupo I — Francia, Senegal, Noruega, Iraq.

---

## Roadmap

### v1.0 — MVP (lo que construimos ahora)
- [x] Descarga y parseo del CSV en el navegador
- [x] Búsqueda por nombre de jugador
- [x] Conversión a CRC con tasa configurable
- [x] Diseño mobile-first
- [x] Indicador de carga

### v2.0 — Mejoras futuras
- [ ] Ranking de las postales más caras del álbum

---

## Consideraciones técnicas

**CORS:** La URL del CSV es pública pero si el servidor R2 no permite
requests cross-origin, se necesitaría un proxy ligero (Cloudflare Worker gratuito).
Esto se verifica en la primera prueba.

**Tamaño del dataset:** ~30,000 jugadores. Solo se usan los de las 48
selecciones del mundial (~864 jugadores según el álbum Panini 2026).
El resto se descarta durante el parseo para ahorrar memoria.

**Nombres con variantes:** Los jugadores pueden aparecer con nombre completo
o nombre corto. La búsqueda debe ser tolerante: insensible a mayúsculas,
tildes y variaciones parciales.
