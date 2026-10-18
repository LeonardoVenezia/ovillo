import { createId } from "@paralleldrive/cuid2";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { eq, inArray, like } from "drizzle-orm";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

import { MEDIA_LIMITS } from "../features/projects/media-schemas";
import { thumbKeyFor } from "../features/projects/media-view";
import { suggestCatalogAmounts } from "../features/stash/schemas";
import { deleteObject, putObject } from "../storage";
import { account, user } from "./auth-schema";
import { rowCounter } from "./counter-schema";
import { tool, type ToolKind, type ToolMaterial } from "./tool-schema";
import { getDb } from "./index";
import { image, projectEntry, projectPhoto } from "./media-schema";
import { profile, type ProfileLink } from "./profile-schema";
import { pattern } from "./pattern-schema";
import { project, type ProjectStatus } from "./project-schema";
import { stashItem, type ColorFamily } from "./stash-schema";
import { yarn, yarnBrand, type YarnWeight } from "./yarn-schema";

/**
 * Datos de prueba ("demo") para ver la app llena antes de abrir el registro
 * (decisión D-034).
 *
 *   pnpm db:seed-demo            → borra y re-crea las cuentas demo
 *   pnpm db:seed-demo --clean    → solo las borra (base + fotos en R2)
 *
 * Todo pasa por los helpers reales (`storage/` y Drizzle): los emails son
 * `demo.*@ovillo.test` y solo se toca lo que empieza con `demo.`. Las fotos
 * se generan acá (PNG propio) y se convierten a JPEG con `sips` de macOS,
 * respetando los topes de `media-schemas.ts`.
 *
 * Igual que los scripts de `db/`, lee `.env.local` y después `.env`.
 */

config({ path: [".env.local", ".env"], quiet: true });

const DEMO_EMAIL_DOMAIN = "ovillo.test";
const DEMO_EMAIL_PATTERN = `demo.%@${DEMO_EMAIL_DOMAIN}`;
/** Contraseña compartida de las cuentas demo (no es un secreto: son descartables). */
const DEMO_PASSWORD = "ovillo-demo-2026";

// ---------------------------------------------------------------------------
// Tipos de los datos
// ---------------------------------------------------------------------------

type Aspect = "h" | "v" | "s";
type Palette = [string, string];

type PhotoSpec = {
  alt: string;
  /** Color claro y oscuro del degradé (tonos "lana"). */
  colors: Palette;
  /** h = 4:3, v = 3:4, s = cuadrada. */
  aspect?: Aspect;
};

type EntrySpec = {
  daysAgo: number;
  body: string;
  photos?: PhotoSpec[];
};

type ProjectSpec = {
  slug: string;
  name: string;
  craft: string | null;
  status: ProjectStatus;
  progress: number | null;
  createdDaysAgo: number;
  /** Última vez que "se tocó" (la lista muestra "Actualizado el…"). */
  updatedDaysAgo: number;
  startedDaysAgo?: number;
  finishedDaysAgo?: number;
  /** Slug del patrón de la biblioteca que sigue el proyecto (se resuelve acá). */
  patternSlug?: string;
  patternText?: string;
  size?: string;
  madeFor?: string;
  tags?: string[];
  notes?: string;
  visibility?: "publico" | "privado";
  /** Foto de galería que es portada (por defecto, la primera). */
  coverIndex?: number;
  photos: PhotoSpec[];
  entries?: EntrySpec[];
  /** Contadores de vueltas (spec §5.4) que quedan abiertos en el proyecto. */
  counters?: { name: string; count: number; repeatEvery?: number }[];
};

type UserSpec = {
  username: string;
  name: string;
  country: string;
  location: string;
  bio: string;
  crafts: string[];
  skillLevel: string;
  links: ProfileLink[];
  defaultVisibility?: "publico" | "privado";
  createdDaysAgo: number;
  /** false = cuenta "recién llegada", sin fila de perfil (prueba de vacíos). */
  withProfile?: boolean;
  /** Herramientas del inventario (spec §5.7) de la cuenta. */
  tools?: ToolSpec[];
  /** Lanas del inventario (spec §5.7) de la cuenta. */
  stash?: StashSpec[];
  projects: ProjectSpec[];
};

type ToolSpec = {
  kind: ToolKind;
  sizeMm: number;
  material?: ToolMaterial;
  lengthCm?: number;
  quantity?: number;
  notes?: string;
};

type StashSpec = {
  /** Lana del catálogo como `marca/slug`; sin esto, es carga libre. */
  yarnSlug?: string;
  customName?: string;
  colorway?: string;
  colorFamily?: ColorFamily;
  /** Grosor solo en cargas libres (D-046). */
  weight?: YarnWeight;
  dyeLot?: string;
  skeins?: number;
  grams?: number;
  metersTotal?: number;
  location?: string;
  notes?: string;
  photo?: PhotoSpec;
};

// ---------------------------------------------------------------------------
// Paletas "de lana" para las fotos generadas
// ---------------------------------------------------------------------------

const MOSTAZA: Palette = ["#d9a441", "#a8762a"];
const TEAL: Palette = ["#5f9a94", "#33675f"];
const TERRACOTA: Palette = ["#c9764f", "#a04c2f"];
const ROSA: Palette = ["#d19aa2", "#a36672"];
const LILA: Palette = ["#a79ac4", "#716394"];
const CREMA: Palette = ["#e8dcc4", "#c2ac89"];
const CANELA: Palette = ["#bd8c5f", "#8f6238"];
const DENIM: Palette = ["#7d9cba", "#4d6d8e"];
const CIELO: Palette = ["#a9c6dc", "#6f96b6"];
const ARENA: Palette = ["#ddcdb2", "#b3a084"];

// ---------------------------------------------------------------------------
// Contenido demo
// ---------------------------------------------------------------------------

const DEMO_USERS: UserSpec[] = [
  {
    username: "mariaruiz",
    name: "María Ruiz",
    country: "AR",
    location: "Rosario, Santa Fe",
    bio: "Tejo desde que mi abuela me enseñó a hacer cadenas. Dos agujas y crochet, siempre con lana de por acá.",
    crafts: ["dos-agujas", "crochet"],
    skillLevel: "intermediate",
    links: [{ kind: "instagram", url: "https://instagram.com/mariaruiz.teje" }],
    createdDaysAgo: 210,
    tools: [
      {
        kind: "circulares",
        sizeMm: 3.5,
        material: "madera",
        lengthCm: 80,
        notes: "Las de bambú, las que más uso.",
      },
      { kind: "circulares", sizeMm: 4, material: "madera", lengthCm: 80 },
      { kind: "circulares", sizeMm: 4.5, material: "aluminio", lengthCm: 60 },
      { kind: "rectas", sizeMm: 4, material: "aluminio", quantity: 2 },
      {
        kind: "doble-punta",
        sizeMm: 3,
        material: "acero",
        notes: "Juego de 5 para los puños.",
      },
      { kind: "gancho", sizeMm: 3.5, material: "aluminio" },
      {
        kind: "gancho",
        sizeMm: 4,
        material: "resina",
        quantity: 2,
        notes: "El de mango ergonómico y el de siempre.",
      },
    ],
    stash: [
      {
        yarnSlug: "katia/fil-piuma",
        colorway: "Verde agua",
        colorFamily: "verde",
        skeins: 1,
        location: "Caja azul del placard",
        notes: "Sobró de la bufanda de mi hermana.",
        photo: {
          alt: "Ovillo verde agua junto a la bufanda terminada",
          colors: TEAL,
          aspect: "s",
        },
      },
      {
        customName: "Merino mostaza de la feria",
        colorFamily: "amarillo",
        weight: "worsted",
        skeins: 4,
        location: "Bolsa de la feria",
        notes: "Para el sweater de otoño; me sobró un ovillo.",
        photo: {
          alt: "Ovillos mostaza sobre la mesa de madera",
          colors: MOSTAZA,
          aspect: "s",
        },
      },
      {
        yarnSlug: "hilados-lho/fidelio",
        colorway: "Terracota",
        colorFamily: "naranja",
        dyeLot: "L-2417",
        skeins: 2,
        location: "Caja azul del placard",
      },
      {
        yarnSlug: "hilos-omega/sinfonia",
        colorway: "Crudo",
        colorFamily: "blanco",
        grams: 60,
        location: "Costurero de la abuela",
        notes: "Restos del vestido de Sofía.",
      },
      {
        customName: "Lana de mi abuela",
        colorFamily: "gris",
        weight: "dk",
        skeins: 3,
        location: "Ropero",
        notes: "La guardo para un gorro de invierno.",
      },
    ],
    projects: [
      {
        slug: "sweater-otono",
        name: "Sweater de otoño",
        craft: "dos-agujas",
        status: "tejiendo",
        progress: 60,
        createdDaysAgo: 32,
        updatedDaysAgo: 2,
        startedDaysAgo: 34,
        tags: ["lana", "top-down", "otoño"],
        size: "M",
        patternText: "Patrón propio a partir de uno de PetiteKnit",
        notes:
          "Lana merino mostaza que compré en la feria. Si me sobra, tejo mitones a juego.",
        photos: [
          {
            alt: "Sweater mostaza con canesú de trenzas, extendido sobre la cama",
            colors: MOSTAZA,
            aspect: "h",
          },
          {
            alt: "Detalle del canesú con las trenzas a medio tejer",
            colors: MOSTAZA,
            aspect: "s",
          },
          {
            alt: "Ovillos de lana merino mostaza junto al sweater empezado",
            colors: ARENA,
            aspect: "v",
          },
        ],
        entries: [
          {
            daysAgo: 21,
            body: "Arranqué el canesú con las trenzas. La lana es una seda: no se me escapa ni un punto.",
            photos: [
              {
                alt: "Canesú del sweater en proceso sobre la falda",
                colors: MOSTAZA,
                aspect: "v",
              },
            ],
          },
          {
            daysAgo: 9,
            body: "Cuerpo terminado, ahora los puños. Calculé mal la lana y tuve que encargar otro ovillo igual.",
            photos: [
              {
                alt: "Cuerpo del sweater terminado sobre la mesa de madera",
                colors: MOSTAZA,
                aspect: "h",
              },
            ],
          },
          {
            daysAgo: 2,
            body: "Lo probé con alfileres y me queda. Falta bloquear y esconder hebras.",
          },
        ],
        counters: [
          { name: "Cuerpo", count: 84, repeatEvery: 6 },
          { name: "Manga izq.", count: 18 },
        ],
      },
      {
        slug: "bufanda-invierno",
        name: "Bufanda para el invierno",
        craft: "dos-agujas",
        status: "terminado",
        progress: 100,
        createdDaysAgo: 95,
        updatedDaysAgo: 40,
        startedDaysAgo: 97,
        finishedDaysAgo: 40,
        madeFor: "para mi hermana",
        tags: ["merino", "regalo"],
        patternSlug: "bufanda-facil-en-fil-piuma",
        photos: [
          {
            alt: "Bufanda de lana verde agua doblada sobre una silla",
            colors: TEAL,
            aspect: "h",
          },
          {
            alt: "Detalle del punto elástico de la bufanda verde agua",
            colors: TEAL,
            aspect: "s",
          },
        ],
        entries: [
          {
            daysAgo: 41,
            body: "Terminada, lavada y bloqueada. Se la entrego a mi hermana el fin de semana.",
            photos: [
              {
                alt: "Bufanda verde agua recién bloqueada, estirada con alfileres",
                colors: TEAL,
                aspect: "h",
              },
            ],
          },
        ],
      },
      {
        slug: "gorro-rustico",
        name: "Gorro de hilo rústico",
        craft: "crochet",
        status: "tejiendo",
        progress: 35,
        createdDaysAgo: 5,
        updatedDaysAgo: 1,
        startedDaysAgo: 6,
        tags: ["crochet", "algodón"],
        patternSlug: "malu-hat",
        photos: [
          {
            alt: "Gorro de crochet color terracota a medio tejer con el ganchillo",
            colors: TERRACOTA,
            aspect: "s",
          },
        ],
        entries: [
          {
            daysAgo: 3,
            body: "Voy por la mitad de la copa. El borde en punto cangrejo queda divino.",
          },
        ],
      },
      {
        slug: "regalo-sorpresa",
        name: "Regalo sorpresa",
        craft: "dos-agujas",
        status: "tejiendo",
        progress: 15,
        createdDaysAgo: 10,
        updatedDaysAgo: 4,
        startedDaysAgo: 11,
        visibility: "privado",
        notes:
          "Para el cumpleaños de Vicky: no quiero que lo vea hasta que esté listo.",
        photos: [
          {
            alt: "Tejido rosa empolvado a medio empezar sobre una mesa",
            colors: ROSA,
            aspect: "h",
          },
        ],
      },
    ],
  },
  {
    username: "candelateje",
    name: "Candela Ferreyra",
    country: "UY",
    location: "Montevideo",
    bio: "Aprendí crochet hace poquito y no paro: cada cuadradito es un pequeño triunfo.",
    crafts: ["crochet"],
    skillLevel: "beginner",
    links: [],
    createdDaysAgo: 120,
    tools: [
      { kind: "gancho", sizeMm: 4, material: "aluminio" },
      { kind: "gancho", sizeMm: 4.5, material: "aluminio" },
      {
        kind: "gancho",
        sizeMm: 5,
        material: "madera",
        notes: "Regalo del cumple.",
      },
    ],
    stash: [
      {
        yarnSlug: "lanas-stop/olaf",
        colorway: "Verde bosque",
        colorFamily: "verde",
        skeins: 3,
        location: "Canasto del living",
        photo: {
          alt: "Tres ovillos verde bosque apilados",
          colors: TEAL,
          aspect: "s",
        },
      },
      {
        yarnSlug: "revesderecho/cotton",
        colorway: "Crudo",
        colorFamily: "blanco",
        skeins: 2,
        location: "Canasto del living",
      },
      {
        customName: "Algodón teñido a mano",
        colorFamily: "multicolor",
        weight: "sport",
        skeins: 1,
        notes: "Lo teñí con cáscara de cebolla, ¡quedó precioso!",
      },
      {
        yarnSlug: "tamm/alpes",
        colorway: "Marrón chocolate",
        colorFamily: "marron",
        skeins: 2,
      },
    ],
    projects: [
      {
        slug: "manta-granny",
        name: "Manta granny para el living",
        craft: "crochet",
        status: "en-pausa",
        progress: 55,
        createdDaysAgo: 75,
        updatedDaysAgo: 22,
        startedDaysAgo: 80,
        tags: ["granny", "algodón", "living"],
        notes: "Voy por la mitad. En invierno retomo con más ganas.",
        photos: [
          {
            alt: "Manta granny multicolor sobre el respaldo del sofá",
            colors: LILA,
            aspect: "h",
          },
          {
            alt: "Cuadrados granny apilados y el ganchillo encima",
            colors: ROSA,
            aspect: "s",
          },
        ],
        entries: [
          {
            daysAgo: 60,
            body: "Uní 25 cuadrados. La mesa del living ya no se ve, pero vale la pena.",
            photos: [
              {
                alt: "Cuadrados granny unidos en fila sobre la mesa",
                colors: LILA,
                aspect: "h",
              },
            ],
          },
          {
            daysAgo: 22,
            body: "La dejé en pausa hasta que llegue el algodón nuevo.",
          },
        ],
        counters: [{ name: "Cuadrados", count: 25 }],
      },
      {
        slug: "amigurumi-sobrina",
        name: "Amigurumi para mi sobrina",
        craft: "crochet",
        status: "terminado",
        progress: 100,
        createdDaysAgo: 55,
        updatedDaysAgo: 25,
        startedDaysAgo: 60,
        finishedDaysAgo: 25,
        madeFor: "para mi sobrina Emilia",
        tags: ["amigurumi", "regalo"],
        patternSlug: "oso-tono",
        photos: [
          {
            alt: "Osita de amigurumi color crema con moño rosa",
            colors: CREMA,
            aspect: "s",
          },
          {
            alt: "Osita de amigurumi sentada entre hilos de algodón",
            colors: CREMA,
            aspect: "h",
          },
        ],
        entries: [
          {
            daysAgo: 24,
            body: "Le puse el moño y quedó lista. Emilia la bautizó Pepa.",
            photos: [
              {
                alt: "Osita de amigurumi con moño rosa terminada",
                colors: CREMA,
                aspect: "s",
              },
            ],
          },
        ],
      },
      {
        slug: "top-que-no-fue",
        name: "Top que no fue",
        craft: "crochet",
        status: "frogueado",
        progress: null,
        createdDaysAgo: 45,
        updatedDaysAgo: 33,
        startedDaysAgo: 50,
        notes:
          "Me quedó enorme y lo desarmé entero. Aprendí a hacer la muestra de tensión antes de arrancar.",
        photos: [],
        entries: [
          {
            daysAgo: 33,
            body: "Lo destejí completo. Antes de volver a empezar: muestra de tensión, siempre.",
          },
        ],
      },
    ],
  },
  {
    username: "lupitateje",
    name: "Lupita Herrera",
    country: "MX",
    location: "Ciudad de México",
    bio: "Tejedora de encajes y telar. Doy taller los sábados y guardo mis patrones en cuadernos.",
    crafts: ["dos-agujas", "telar"],
    skillLevel: "advanced",
    links: [
      { kind: "instagram", url: "https://instagram.com/lupitateje" },
      { kind: "pinterest", url: "https://www.pinterest.com/lupitateje" },
    ],
    createdDaysAgo: 260,
    tools: [
      {
        kind: "circulares",
        sizeMm: 2.25,
        material: "acero",
        lengthCm: 100,
        notes: "Para los encajes finos.",
      },
      { kind: "circulares", sizeMm: 2.75, material: "acero", lengthCm: 100 },
      {
        kind: "doble-punta",
        sizeMm: 2,
        material: "acero",
        quantity: 2,
        notes: "Dos juegos de 5 para mitones.",
      },
    ],
    stash: [
      {
        yarnSlug: "katia/cotton-merino",
        colorway: "Rojo coral",
        colorFamily: "rojo",
        skeins: 2,
        location: "Caja de tela",
        photo: {
          alt: "Ovillos rojo coral sobre una manta tejida",
          colors: TERRACOTA,
          aspect: "s",
        },
      },
      {
        yarnSlug: "katia/merino-seta",
        colorway: "Negro",
        colorFamily: "negro",
        skeins: 1,
        location: "Caja de tela",
      },
      {
        customName: "Restos de algodón",
        colorFamily: "multicolor",
        weight: "fingering",
        grams: 250,
        location: "Bolsa de restos",
        notes: "Para amigurumis chicos.",
      },
    ],
    projects: [
      {
        slug: "chal-encaje",
        name: "Chal de encaje otoñal",
        craft: "dos-agujas",
        status: "terminado",
        progress: 100,
        createdDaysAgo: 120,
        updatedDaysAgo: 60,
        startedDaysAgo: 125,
        finishedDaysAgo: 60,
        tags: ["encaje", "chal", "lace"],
        patternText: "Patrón Odessa (Ravelry)",
        photos: [
          {
            alt: "Chal de encaje lila bloqueado, abierto sobre el piso de madera",
            colors: LILA,
            aspect: "h",
          },
          {
            alt: "Detalle del punto de encaje del chal a contraluz",
            colors: LILA,
            aspect: "s",
          },
          {
            alt: "El chal lila doblado sobre una silla",
            colors: LILA,
            aspect: "v",
          },
        ],
        entries: [
          {
            daysAgo: 100,
            body: "Empecé el chal con hilo fino. Las primeras vueltas del gráfico siempre son las más lentas.",
            photos: [
              {
                alt: "Chal de encaje empezado sobre la mesa, con el gráfico al lado",
                colors: LILA,
                aspect: "h",
              },
            ],
          },
          {
            daysAgo: 61,
            body: "Bloqueado toda la noche. El encaje se abrió como encaje de verdad: quedó enorme y livianito.",
            photos: [
              {
                alt: "Chal lila bloqueado con alfileres sobre una manta",
                colors: LILA,
                aspect: "h",
              },
            ],
          },
        ],
      },
      {
        slug: "ruana-telar",
        name: "Ruana en telar de peine",
        craft: "telar",
        status: "tejiendo",
        progress: 45,
        createdDaysAgo: 22,
        updatedDaysAgo: 3,
        startedDaysAgo: 26,
        tags: ["telar", "invierno"],
        notes:
          "Hilo grueso color canela. Son dos tiras largas que después se unen.",
        photos: [
          {
            alt: "Tira de ruana canela todavía en el telar de peine",
            colors: CANELA,
            aspect: "v",
          },
          {
            alt: "Telar de peine con la urdimbre tensa y la trama a medio tejer",
            colors: CANELA,
            aspect: "h",
          },
        ],
        entries: [
          {
            daysAgo: 10,
            body: "Primera tira lista, ya monté la segunda en el telar.",
            photos: [
              {
                alt: "Ruana color canela a medio tejer en el telar",
                colors: CANELA,
                aspect: "v",
              },
            ],
          },
        ],
      },
      {
        slug: "sueter-fair-isle",
        name: "Suéter Fair Isle",
        craft: "dos-agujas",
        status: "tejiendo",
        progress: 20,
        createdDaysAgo: 12,
        updatedDaysAgo: 1,
        startedDaysAgo: 14,
        tags: ["fair-isle", "lana", "canesú"],
        size: "S",
        patternText: "Canesú circular con un gráfico que copié de mi abuela",
        photos: [
          {
            alt: "Canesú Fair Isle con franjas de colores a medio tejer",
            colors: DENIM,
            aspect: "h",
          },
        ],
        entries: [
          {
            daysAgo: 5,
            body: "Tejí la muestra de tensión y arranqué el canesú. El dibujo aparece recién cuando cambia el color.",
            photos: [
              {
                alt: "Muestra de tensión del suéter Fair Isle junto al gráfico",
                colors: DENIM,
                aspect: "s",
              },
            ],
          },
        ],
        counters: [{ name: "Canesú", count: 32, repeatEvery: 8 }],
      },
    ],
  },
  {
    username: "solaguirre",
    name: "Sol Aguirre",
    country: "AR",
    location: "Córdoba",
    bio: "Tejo de noche, con mate y algún podcast de fondo.",
    crafts: ["dos-agujas"],
    skillLevel: "intermediate",
    links: [],
    defaultVisibility: "privado",
    createdDaysAgo: 60,
    tools: [
      { kind: "rectas", sizeMm: 3.75, material: "aluminio" },
      { kind: "rectas", sizeMm: 4.5, material: "bambu" },
    ],
    stash: [
      {
        yarnSlug: "modista/diana",
        colorway: "Violeta profundo",
        colorFamily: "violeta",
        skeins: 3,
        location: "Placard de arriba",
      },
      {
        yarnSlug: "katia/azteca-felting-wool",
        colorway: "Gris perla",
        colorFamily: "gris",
        skeins: 2,
        location: "Placard de arriba",
        notes: "Para el bolso que quiero fieltrar.",
      },
    ],
    projects: [
      {
        slug: "camperita-bebe",
        name: "Camperita para bebé",
        craft: "dos-agujas",
        status: "tejiendo",
        progress: 70,
        createdDaysAgo: 15,
        updatedDaysAgo: 6,
        startedDaysAgo: 18,
        madeFor: "para mi sobrino que llega en marzo",
        tags: ["bebé", "algodón"],
        size: "3 meses",
        notes: "En algodón celeste, para que la pueda usar en verano.",
        photos: [
          {
            alt: "Camperita de bebé celeste a medio tejer con botones nacarados",
            colors: CIELO,
            aspect: "s",
          },
        ],
        entries: [
          {
            daysAgo: 7,
            body: "Ya están las mangas. Me falta el cuello y pegar los botones.",
          },
        ],
      },
    ],
  },
  {
    username: "tomiteje",
    name: "Tomi Pérez",
    country: "AR",
    location: "",
    bio: "",
    crafts: [],
    skillLevel: "",
    links: [],
    createdDaysAgo: 4,
    // Cuenta recién llegada: sin fila de perfil, para ver el estado vacío.
    withProfile: false,
    projects: [],
  },
];

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

function daysAgoDate(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function dateString(days: number): string {
  return daysAgoDate(days).toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Generación de fotos (PNG propio → JPEG con sips de macOS)
// ---------------------------------------------------------------------------

const ASPECTS: Record<Aspect, [number, number]> = {
  h: [1200, 900],
  v: [900, 1200],
  s: [1200, 1200],
};

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) {
    c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeData), 0);
  return Buffer.concat([length, typeData, crc]);
}

function encodePng(width: number, height: number, rgb: Buffer): Buffer {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filtro "none"
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits por canal
  header[9] = 2; // color RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value);
}

/** Ruido determinístico por píxel: da la textura de "hilo". */
function hashNoise(x: number, y: number, seed: number): number {
  let h =
    Math.imul(x, 374761393) +
    Math.imul(y, 668265263) +
    Math.imul(seed, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

/** Tejido abstracto: degradé del color claro al oscuro con "puntitos" en V. */
function renderKnit(
  width: number,
  height: number,
  light: Palette[0],
  dark: Palette[1],
  seed: number,
): Buffer {
  const lightRgb = hexToRgb(light);
  const darkRgb = hexToRgb(dark);
  const rgb = Buffer.alloc(width * height * 3);
  const band = Math.max(14, Math.round(Math.min(width, height) / 28));
  const cell = Math.round(band * 1.6);
  let offset = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const t = Math.min(1, (x / width) * 0.55 + (y / height) * 0.45);
      const rx = (x % cell) / cell;
      const v = 1 - Math.abs(rx * 2 - 1);
      const gap = Math.pow(1 - v, 3);
      const alt = Math.floor(y / band) % 2 === 0 ? 0.02 : -0.01;
      const nx = (x / width) * 2 - 1;
      const ny = (y / height) * 2 - 1;
      const vignette = (nx * nx + ny * ny) * 0.045;
      const highlight = (1 - x / width) * (1 - y / height) * 0.05;
      const noise = (hashNoise(x, y, seed) - 0.5) * 0.04;
      const k = 1 + alt - gap * 0.16 - vignette + highlight + noise;

      rgb[offset++] = clampByte(
        (lightRgb[0] + (darkRgb[0] - lightRgb[0]) * t) * k,
      );
      rgb[offset++] = clampByte(
        (lightRgb[1] + (darkRgb[1] - lightRgb[1]) * t) * k,
      );
      rgb[offset++] = clampByte(
        (lightRgb[2] + (darkRgb[2] - lightRgb[2]) * t) * k,
      );
    }
  }
  return rgb;
}

function toJpeg(sourcePng: string, target: string, maxEdge?: number): void {
  try {
    execFileSync(
      "sips",
      [
        ...(maxEdge ? ["-Z", String(maxEdge)] : []),
        "-s",
        "format",
        "jpeg",
        "-s",
        "formatOptions",
        "82",
        sourcePng,
        "--out",
        target,
      ],
      { stdio: "ignore" },
    );
  } catch {
    throw new Error(
      "No se pudo convertir la imagen con sips. Este script necesita macOS.",
    );
  }
}

// ---------------------------------------------------------------------------
// Siembra
// ---------------------------------------------------------------------------

/** Borra las cuentas demo (cascada en la base) y sus fotos en R2. */
async function removeDemoData(): Promise<void> {
  const db = getDb();
  const demoUsers = await db
    .select({ id: user.id })
    .from(user)
    .where(like(user.email, DEMO_EMAIL_PATTERN));

  if (demoUsers.length > 0) {
    const keys = await db
      .select({ r2Key: image.r2Key })
      .from(image)
      .where(
        inArray(
          image.ownerId,
          demoUsers.map((row) => row.id),
        ),
      );
    for (const { r2Key } of keys) {
      try {
        await deleteObject(r2Key);
        await deleteObject(thumbKeyFor(r2Key));
      } catch (error) {
        console.warn(
          `No se pudo borrar la foto ${r2Key} en R2 (sigo igual):`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  await db.delete(user).where(like(user.email, DEMO_EMAIL_PATTERN));
  console.log(`Cuentas demo borradas: ${demoUsers.length}.`);
}

let seedCounter = 1;

/** Genera una foto (grande + miniatura), la sube a R2 y guarda su fila. */
async function uploadPhoto(
  ownerId: string,
  prefix: string,
  spec: PhotoSpec,
  tempDir: string,
): Promise<string> {
  const [width, height] = ASPECTS[spec.aspect ?? "h"];
  const imageId = createId();
  const r2Key = `${prefix}/${imageId}.jpg`;

  const seed = seedCounter++;
  const pngPath = join(tempDir, `${imageId}.png`);
  const fullPath = join(tempDir, `${imageId}.jpg`);
  const thumbPath = join(tempDir, `${imageId}-thumb.jpg`);

  writeFileSync(
    pngPath,
    encodePng(
      width,
      height,
      renderKnit(width, height, spec.colors[0], spec.colors[1], seed),
    ),
  );
  toJpeg(pngPath, fullPath);
  toJpeg(pngPath, thumbPath, 640);

  const full = readFileSync(fullPath);
  const thumb = readFileSync(thumbPath);
  if (
    full.byteLength > MEDIA_LIMITS.fullMaxBytes ||
    thumb.byteLength > MEDIA_LIMITS.thumbMaxBytes
  ) {
    console.warn(
      `Aviso: la foto generada pesa ${full.byteLength} / ${thumb.byteLength} bytes (más que los topes reales).`,
    );
  }

  await putObject(r2Key, full, "image/jpeg");
  await putObject(thumbKeyFor(r2Key), thumb, "image/jpeg");

  const db = getDb();
  await db.insert(image).values({
    id: imageId,
    ownerId,
    r2Key,
    width,
    height,
    altText: spec.alt,
  });

  return imageId;
}

async function seedUser(spec: UserSpec, passwordHash: string): Promise<void> {
  const db = getDb();
  const userId = createId();
  const createdAt = daysAgoDate(spec.createdDaysAgo);
  const email = `demo.${spec.username}@${DEMO_EMAIL_DOMAIN}`;

  // La biblioteca se siembra aparte (`pnpm db:seed-patterns`): acá solo se
  // resuelven los slugs que los proyectos declaran con `patternSlug`.
  const patternRows = await db
    .select({ id: pattern.id, slug: pattern.slug })
    .from(pattern);
  const patternIds = new Map(patternRows.map((row) => [row.slug, row.id]));

  // Las lanas del catálogo se siembran aparte (`pnpm db:seed-yarns`): el
  // inventario demo resuelve sus vínculos por `marca/slug`.
  const yarnRows = await db
    .select({
      id: yarn.id,
      slug: yarn.slug,
      meters: yarn.meters,
      grams: yarn.grams,
      brandSlug: yarnBrand.slug,
    })
    .from(yarn)
    .innerJoin(yarnBrand, eq(yarn.brandId, yarnBrand.id));
  const yarnsByPath = new Map(
    yarnRows.map((row) => [`${row.brandSlug}/${row.slug}`, row]),
  );

  await db.insert(user).values({
    id: userId,
    name: spec.name,
    email,
    emailVerified: true,
    username: spec.username,
    displayUsername: spec.username,
    createdAt,
    updatedAt: createdAt,
  });

  // Cuenta con contraseña, creada igual que Better Auth (scrypt).
  await db.insert(account).values({
    id: createId(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: passwordHash,
    createdAt,
    updatedAt: createdAt,
  });

  if (spec.withProfile !== false) {
    await db.insert(profile).values({
      userId,
      bio: spec.bio,
      location: spec.location,
      country: spec.country,
      crafts: spec.crafts,
      skillLevel: spec.skillLevel,
      links: spec.links,
      defaultVisibility: spec.defaultVisibility ?? "publico",
      createdAt,
      updatedAt: createdAt,
    });
  }

  const tempDir = mkdtempSync(join(tmpdir(), "ovillo-seed-"));
  let photoCount = 0;
  let entryCount = 0;
  let counterCount = 0;
  let toolCount = 0;
  let stashCount = 0;

  try {
    for (const projectSpec of spec.projects) {
      const projectId = createId();
      let patternId: string | null = null;
      if (projectSpec.patternSlug) {
        patternId = patternIds.get(projectSpec.patternSlug) ?? null;
        if (!patternId) {
          console.warn(
            `  Aviso: no existe el patrón "${projectSpec.patternSlug}" para vincular (¿corriste pnpm db:seed-patterns?).`,
          );
        }
      }
      await db.insert(project).values({
        id: projectId,
        userId,
        slug: projectSpec.slug,
        name: projectSpec.name,
        craft: projectSpec.craft,
        status: projectSpec.status,
        progress: projectSpec.progress,
        patternId,
        patternText: projectSpec.patternText ?? null,
        size: projectSpec.size ?? null,
        madeFor: projectSpec.madeFor ?? null,
        startedAt:
          projectSpec.startedDaysAgo === undefined
            ? null
            : dateString(projectSpec.startedDaysAgo),
        finishedAt:
          projectSpec.finishedDaysAgo === undefined
            ? null
            : dateString(projectSpec.finishedDaysAgo),
        tags: projectSpec.tags ?? [],
        notes: projectSpec.notes ?? null,
        visibility: projectSpec.visibility ?? "publico",
        createdAt: daysAgoDate(projectSpec.createdDaysAgo),
        updatedAt: daysAgoDate(projectSpec.updatedDaysAgo),
      });

      const galleryIds: string[] = [];
      for (const [position, photo] of projectSpec.photos.entries()) {
        const imageId = await uploadPhoto(
          userId,
          `proyectos/${projectId}`,
          photo,
          tempDir,
        );
        galleryIds.push(imageId);
        photoCount++;
        await db.insert(projectPhoto).values({
          id: createId(),
          projectId,
          imageId,
          position,
        });
      }

      if (galleryIds.length > 0) {
        const coverIndex = Math.min(
          projectSpec.coverIndex ?? 0,
          galleryIds.length - 1,
        );
        await db
          .update(project)
          .set({ coverImageId: galleryIds[coverIndex] })
          .where(eq(project.id, projectId));
      }

      for (const entry of projectSpec.entries ?? []) {
        const imageIds: string[] = [];
        for (const photo of entry.photos ?? []) {
          imageIds.push(
            await uploadPhoto(userId, `proyectos/${projectId}`, photo, tempDir),
          );
          photoCount++;
        }
        entryCount++;
        await db.insert(projectEntry).values({
          id: createId(),
          projectId,
          entryDate: dateString(entry.daysAgo),
          body: entry.body,
          imageIds,
          createdAt: daysAgoDate(entry.daysAgo),
        });
      }

      for (const counter of projectSpec.counters ?? []) {
        counterCount++;
        await db.insert(rowCounter).values({
          id: createId(),
          projectId,
          name: counter.name,
          count: counter.count,
          repeatEvery: counter.repeatEvery ?? null,
          createdAt: daysAgoDate(projectSpec.createdDaysAgo),
          updatedAt: daysAgoDate(projectSpec.updatedDaysAgo),
        });
      }
    }

    for (const toolSpec of spec.tools ?? []) {
      toolCount++;
      await db.insert(tool).values({
        id: createId(),
        userId,
        kind: toolSpec.kind,
        sizeMm: toolSpec.sizeMm,
        material: toolSpec.material ?? null,
        lengthCm:
          toolSpec.kind === "circulares" ? (toolSpec.lengthCm ?? null) : null,
        quantity: toolSpec.quantity ?? 1,
        notes: toolSpec.notes ?? null,
        createdAt,
        updatedAt: createdAt,
      });
    }

    for (const stashSpec of spec.stash ?? []) {
      const stashId = createId();
      let yarnId: string | null = null;
      let catalog: { meters: number | null; grams: number | null } | null =
        null;

      if (stashSpec.yarnSlug) {
        const resolved = yarnsByPath.get(stashSpec.yarnSlug);
        if (!resolved) {
          console.warn(
            `  Aviso: no existe la lana "${stashSpec.yarnSlug}" para el inventario (¿corriste pnpm db:seed-yarns?).`,
          );
          continue;
        }
        yarnId = resolved.id;
        catalog = { meters: resolved.meters, grams: resolved.grams };
      } else if (!stashSpec.customName) {
        console.warn("  Aviso: una lana de carga libre quedó sin nombre.");
        continue;
      }

      // Mismo cálculo que la app: sin lana vinculada no se completa nada.
      const amounts = suggestCatalogAmounts({
        skeins: stashSpec.skeins ?? null,
        grams: stashSpec.grams ?? null,
        metersTotal: stashSpec.metersTotal ?? null,
        yarn: catalog,
      });

      let stashImageId: string | null = null;
      if (stashSpec.photo) {
        stashImageId = await uploadPhoto(
          userId,
          `lanas/${stashId}`,
          stashSpec.photo,
          tempDir,
        );
        photoCount++;
      }

      stashCount++;
      await db.insert(stashItem).values({
        id: stashId,
        userId,
        yarnId,
        customName: yarnId === null ? (stashSpec.customName ?? null) : null,
        colorway: stashSpec.colorway ?? null,
        colorFamily: stashSpec.colorFamily ?? null,
        weight: yarnId === null ? (stashSpec.weight ?? null) : null,
        dyeLot: stashSpec.dyeLot ?? null,
        skeins: stashSpec.skeins ?? null,
        grams: amounts.grams,
        metersTotal: amounts.metersTotal,
        location: stashSpec.location ?? null,
        notes: stashSpec.notes ?? null,
        imageId: stashImageId,
        createdAt,
        updatedAt: createdAt,
      });
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  const projectCount = spec.projects.length;
  console.log(
    `  ✓ ${spec.username} — ${projectCount} proyecto(s), ${photoCount} foto(s), ${entryCount} entrada(s), ${counterCount} contador(es), ${toolCount} herramienta(s), ${stashCount} lana(s)`,
  );
}

async function main(): Promise<void> {
  const cleanOnly = process.argv.includes("--clean");

  if (process.platform !== "darwin") {
    console.warn(
      "Aviso: las fotos demo se convierten con `sips` (macOS); en otro sistema puede fallar.",
    );
  }

  await removeDemoData();
  if (cleanOnly) {
    return;
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  console.log("Creando cuentas demo…");
  for (const spec of DEMO_USERS) {
    await seedUser(spec, passwordHash);
  }

  console.log("");
  console.log(`Listo. Cuentas demo (contraseña compartida: ${DEMO_PASSWORD}):`);
  for (const spec of DEMO_USERS) {
    console.log(`  @${spec.username} — ${spec.name}`);
  }
  console.log("");
  console.log(
    "Páginas para mirar: /@mariaruiz, /@candelateje, /@lupitateje, /@solaguirre (perfil privado) y /@tomiteje (cuenta recién llegada)",
  );
  console.log(
    "Con demo.mariaruiz@ovillo.test: /mi-tejido/lanas tiene 5 lanas (2 con foto) y /mi-tejido/herramientas, 7 herramientas.",
  );
}

main().catch((error) => {
  console.error(
    "No se pudieron sembrar los datos demo. ¿Está todo configurado en .env.local?",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
