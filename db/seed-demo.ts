import { createId } from "@paralleldrive/cuid2";
import { hashPassword } from "better-auth/crypto";
import { config } from "dotenv";
import { and, eq, inArray, isNull, like } from "drizzle-orm";
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
import {
  event,
  eventParticipant,
  group,
  groupMember,
  post,
  thread,
  type EventCraft,
  type EventStage,
  type GroupCategory,
  type JoinPolicy,
  type ThreadType,
} from "./community-schema";
import { rowCounter } from "./counter-schema";
import { yearlyGoal } from "./goal-schema";
import {
  glossaryTerm,
  type GlossaryCraft,
  type GlossaryKind,
  type GlossaryVariant,
} from "./glossary-schema";
import {
  projectTool,
  tool,
  type ToolKind,
  type ToolMaterial,
} from "./tool-schema";
import { getDb } from "./index";
import { image, projectEntry, projectPhoto } from "./media-schema";
import { profile, type ProfileLink } from "./profile-schema";
import { pattern } from "./pattern-schema";
import { project, type ProjectStatus } from "./project-schema";
import { queueItem } from "./queue-schema";
import { collection, savedItem, type SavedType } from "./saved-schema";
import { projectYarn, stashItem, type ColorFamily } from "./stash-schema";
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
  /** Lanas asignadas (spec §5.3, D-045). */
  yarns?: ProjectYarnSpec[];
  /** Herramientas usadas: índices dentro de `tools` de la misma cuenta. */
  projectTools?: number[];
};

type ProjectYarnSpec = {
  /** Índice dentro de `stash` de la misma cuenta: descuenta disponible. */
  stash?: number;
  /** `marca/slug` del catálogo: solo referencia, no descuenta (D-045). */
  yarnSlug?: string;
  skeinsUsed?: number;
  gramsUsed?: number;
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
  /** "Quiero tejer" (spec §5.8): la cola, en orden. */
  queue?: QueueSpec[];
  /** Guardados y colecciones (spec §5.8). */
  collections?: CollectionSpec[];
  /** Meta anual (spec §5.14): proyectos terminados que quiere lograr este año. */
  goalTargetProjects?: number;
  /** Grupos de la comunidad (spec §5.9) a los que se suma. */
  groups?: GroupMembershipSpec[];
  projects: ProjectSpec[];
};

type GroupMembershipSpec = {
  /** `slug` del grupo oficial (`OFFICIAL_GROUPS`). */
  slug: string;
  /** Sin rol es integrante común; el de dueña/o lo pone la creación. */
  role?: "moderador" | "miembro";
  /** Sin estado queda activa; `pendiente` simula una solicitud de ingreso. */
  status?: "activo" | "pendiente";
};

type GroupSpec = {
  slug: string;
  name: string;
  description: string;
  rules: string;
  category: GroupCategory;
  joinPolicy: JoinPolicy;
  createdDaysAgo: number;
  photo: PhotoSpec;
};

type ThreadSpec = {
  /** `slug` del grupo oficial (`OFFICIAL_GROUPS`). */
  groupSlug: string;
  /** `username` de quien abre el hilo: tiene que ser miembro activo. */
  author: string;
  type: ThreadType;
  title: string;
  body: string;
  createdDaysAgo: number;
  /** `slug` de un proyecto propio que acompaña al hilo (el "Pedir ayuda"). */
  projectSlug?: string;
  pinned?: boolean;
  locked?: boolean;
  photos?: PhotoSpec[];
  posts?: ThreadPostSpec[];
  /** Índice (0-based) dentro de `posts` de la respuesta solución. */
  solution?: number;
};

type ThreadPostSpec = {
  author: string;
  body: string;
  createdDaysAgo: number;
  photos?: PhotoSpec[];
};

type EventSpec = {
  /** `slug` del grupo oficial (`OFFICIAL_GROUPS`). */
  groupSlug: string;
  /** `username` de quien organiza: tiene que moderar el grupo. */
  organizer: string;
  name: string;
  craft: EventCraft;
  /** Fechas relativas a hoy: negativo = ya pasó, positivo = falta. */
  startsInDays: number;
  endsInDays: number;
  /** `slug` de patrones de la biblioteca (hasta 4). */
  patternSlugs: string[];
  description: string;
  stages: EventStage[];
  /** El hilo del evento se abre una semana antes de empezar. */
  posts?: ThreadPostSpec[];
  participants: {
    username: string;
    projectSlug: string;
    joinedDaysAgo: number;
  }[];
};

type GlossarySpec = {
  slug: string;
  term: string;
  abbreviation: string;
  english: string;
  variants: GlossaryVariant[];
  definition: string;
  craft: GlossaryCraft;
  kind: GlossaryKind;
};

type QueueSpec = {
  /** `slug` del patrón de la biblioteca. */
  patternSlug: string;
  /** Índice dentro de `stash` de la misma cuenta: lana planeada. */
  stash?: number;
  /** Días **desde hoy** para la fecha objetivo (opcional). */
  targetDaysFromNow?: number;
  notes?: string;
};

type CollectionSpec = {
  name: string;
  visibility: "publico" | "privado";
  items: CollectionItemSpec[];
};

type CollectionItemSpec = {
  /** Uno solo de los tres: `slug` del patrón, del proyecto propio o lana. */
  patternSlug?: string;
  projectSlug?: string;
  /** `marca/slug` del catálogo de lanas. */
  yarnSlug?: string;
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
    queue: [
      {
        patternSlug: "gorro-beanie-oso",
        stash: 1,
        targetDaysFromNow: 45,
        notes: "Para el cumple de mi sobrino.",
      },
      {
        patternSlug: "chaleco-granny-squares-team-invierno",
        stash: 0,
        notes: "Quiero probar los granny squares.",
      },
      {
        patternSlug: "oso-tono",
        stash: 3,
      },
    ],
    collections: [
      {
        name: "Para el invierno",
        visibility: "publico",
        items: [
          { patternSlug: "bufanda-facil-en-fil-piuma" },
          { yarnSlug: "katia/fil-piuma" },
          { projectSlug: "sweater-otono" },
        ],
      },
      {
        name: "Ideas para regalar",
        visibility: "privado",
        items: [
          { patternSlug: "oso-tono" },
          { patternSlug: "gorro-beanie-oso" },
          { patternSlug: "unicornio-candy" },
          { yarnSlug: "modista/diana" },
        ],
      },
    ],
    goalTargetProjects: 4,
    groups: [
      { slug: "dos-agujas", role: "moderador" },
      { slug: "sugerencias-para-ovillo", role: "moderador" },
      { slug: "ayuda-para-principiantes" },
      { slug: "charla-general" },
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
        yarns: [{ stash: 1, skeinsUsed: 3 }],
        projectTools: [1],
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
        // Referencia del catálogo: el ovillo del inventario queda disponible
        // (y la ficha de Fil Piuma muestra su galería, spec §5.6).
        yarns: [{ yarnSlug: "katia/fil-piuma", skeinsUsed: 1, gramsUsed: 150 }],
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
        yarns: [{ stash: 4, skeinsUsed: 1 }],
        projectTools: [6],
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
    queue: [
      {
        patternSlug: "estrella-a-crochet",
        stash: 2,
        notes: "Para colgar en la pieza de mi sobrina.",
      },
      {
        patternSlug: "kokeshi",
        targetDaysFromNow: 120,
      },
    ],
    collections: [
      {
        name: "Crochet para regalar",
        visibility: "publico",
        items: [
          { patternSlug: "kokeshi" },
          { patternSlug: "estrella-a-crochet" },
          { yarnSlug: "revesderecho/cotton" },
        ],
      },
    ],
    goalTargetProjects: 3,
    groups: [
      { slug: "amigurumis", role: "moderador" },
      { slug: "crochet", role: "moderador" },
      { slug: "charla-general" },
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
        yarns: [{ stash: 0, skeinsUsed: 1 }],
        projectTools: [2],
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
        yarns: [{ stash: 1, skeinsUsed: 1 }],
        projectTools: [0],
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
        // Frogueado: no descuenta, la lana ya volvió sola al disponible (D-045).
        yarns: [{ stash: 2, skeinsUsed: 1 }],
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
    queue: [
      {
        patternSlug: "pechera-dickey-liv",
        stash: 0,
        targetDaysFromNow: 30,
        notes: "Para estrenar cuando empiece el frío.",
      },
    ],
    collections: [
      {
        name: "Lanas que me enamoraron",
        visibility: "publico",
        items: [
          { yarnSlug: "katia/cotton-merino" },
          { yarnSlug: "katia/merino-seta" },
          { patternSlug: "chaleco-perla-y-silky-mohair" },
        ],
      },
    ],
    goalTargetProjects: 2,
    groups: [
      { slug: "ayuda-para-principiantes" },
      { slug: "amigurumis" },
      { slug: "dos-agujas" },
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
        yarns: [{ stash: 1, skeinsUsed: 1 }],
        projectTools: [0],
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
    groups: [
      { slug: "crochet" },
      { slug: "sugerencias-para-ovillo", status: "pendiente" },
    ],
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
    queue: [
      {
        patternSlug: "malu-hat",
        stash: 0,
        notes: "Para la feria de invierno del barrio.",
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
  {
    username: "ovillo",
    name: "Equipo Ovillo",
    country: "AR",
    location: "",
    bio: "La cuenta del equipo de Ovillo: organiza los grupos oficiales y responde las dudas de la comunidad.",
    crafts: [],
    skillLevel: "",
    links: [],
    createdDaysAgo: 220,
    projects: [],
  },
];

/**
 * Grupos oficiales (spec §5.9). Los crea la cuenta del equipo y son el punto
 * de partida de la comunidad: principiantes, técnicas, charla y sugerencias.
 * «Sugerencias para Ovillo» es con aprobación para mostrar ese flujo (Sol
 * queda con la solicitud pendiente en la siembra).
 */
const OFFICIAL_GROUPS: GroupSpec[] = [
  {
    slug: "ayuda-para-principiantes",
    name: "Ayuda para principiantes",
    description:
      "Para quien recién arranca: dudas de puntos, cómo leer un patrón, qué lana elegir. Ninguna pregunta es tonta.",
    rules:
      "Trato amable y paciencia: todas empezamos alguna vez. Si sabés la respuesta, contala con tus palabras.",
    category: "principiantes",
    joinPolicy: "abierto",
    createdDaysAgo: 210,
    photo: { alt: "Degradé de lana color cielo", colors: CIELO, aspect: "h" },
  },
  {
    slug: "dos-agujas",
    name: "Dos agujas",
    description:
      "Punto, revés y todo lo que sigue: técnicas, tips de tensión, patrones y proyectos con agujas.",
    rules:
      "Compartí tus avances y tus dudas. Si mostrás una foto, contá qué lana y qué aguja usaste.",
    category: "tecnica",
    joinPolicy: "abierto",
    createdDaysAgo: 210,
    photo: {
      alt: "Degradé de lana color mostaza",
      colors: MOSTAZA,
      aspect: "h",
    },
  },
  {
    slug: "crochet",
    name: "Crochet",
    description:
      "Desde cadenas hasta grannys: ganchillo para todos los niveles, con tips y patrones de la comunidad.",
    rules:
      "Subí tus tejidos y preguntá lo que necesites. Mencioná el hilo y el número de gancho cuando consultes.",
    category: "tecnica",
    joinPolicy: "abierto",
    createdDaysAgo: 209,
    photo: {
      alt: "Degradé de lana color terracota",
      colors: TERRACOTA,
      aspect: "h",
    },
  },
  {
    slug: "amigurumis",
    name: "Amigurumis",
    description:
      "Muñequitos, animales y todo lo que se te ocurra en crochet: patrones, relleno, ojos y terminaciones.",
    rules:
      "Sin spoilers de regalos: si es sorpresa, avisá. Y si adaptás un patrón, contá tus cambios.",
    category: "tecnica",
    joinPolicy: "abierto",
    createdDaysAgo: 208,
    photo: { alt: "Degradé de lana color rosa", colors: ROSA, aspect: "h" },
  },
  {
    slug: "charla-general",
    name: "Charla general",
    description:
      "El rincón distendido: presentate, mostrá lo que estás tejiendo y charlá de todo un poco.",
    rules:
      "Respeto y buena onda. Nada de ventas ni spam: para eso está Sugerencias.",
    category: "charla",
    joinPolicy: "abierto",
    createdDaysAgo: 207,
    photo: { alt: "Degradé de lana verde agua", colors: TEAL, aspect: "h" },
  },
  {
    slug: "sugerencias-para-ovillo",
    name: "Sugerencias para Ovillo",
    description:
      "Ideas, mejoras y reportes de errores para que Ovillo sea cada día más fácil. Leen el equipo y la comunidad.",
    rules:
      "Una idea por hilo y contá qué te gustaría lograr. Antes de reportar un error, probá recargar la página.",
    category: "charla",
    joinPolicy: "aprobacion",
    createdDaysAgo: 206,
    photo: { alt: "Degradé de lana color lila", colors: LILA, aspect: "h" },
  },
];

/** Hilos y respuestas demo (spec §5.9): cubren los cuatro tipos y los vacíos. */
const THREADS: ThreadSpec[] = [
  {
    groupSlug: "ayuda-para-principiantes",
    author: "mariaruiz",
    type: "pregunta",
    title: "¿Cómo cierro el cuello del sweater sin que quede flojo?",
    body: "Estoy terminando el Sweater Otoño y el cuello me quedó un poco abierto. ¿Cierran con una aguja más chica o rematan distinto? Adjunto el proyecto para que vean de qué hablo.",
    createdDaysAgo: 12,
    projectSlug: "sweater-otono",
    posts: [
      {
        author: "lupitateje",
        body: "A mí me resultó pasar a una aguja dos números más chica en las últimas vueltas y rematar por el revés. ¡Queda bien pegadito!",
        createdDaysAgo: 11,
      },
      {
        author: "mariaruiz",
        body: "¡Era eso! Probé con aguja más chica en las últimas dos vueltas y quedó justo. Gracias 💛",
        createdDaysAgo: 10,
      },
    ],
    solution: 0,
  },
  {
    groupSlug: "dos-agujas",
    author: "lupitateje",
    type: "muestro",
    title: "Terminé el chal de punto arroz 🧶",
    body: "Dos semanas de agujas y por fin salió. Lo tejí con una lana rústica que tenía en el inventario. ¿Cómo lo ven?",
    createdDaysAgo: 8,
    photos: [
      { alt: "Chal tejido en punto arroz", colors: CANELA, aspect: "s" },
    ],
    posts: [
      {
        author: "mariaruiz",
        body: "¡Te quedó hermoso! El punto arroz le da una textura increíble.",
        createdDaysAgo: 7,
      },
    ],
  },
  {
    groupSlug: "crochet",
    author: "solaguirre",
    type: "pregunta",
    title: "¿Cómo se hacen los puntos puff sin que se desarmen?",
    body: "Me quedan sueltos los puff del granny que estoy armando. ¿Cuántas lazadas hacen ustedes y cómo rematan el punto?",
    createdDaysAgo: 2,
  },
  {
    groupSlug: "crochet",
    author: "candelateje",
    type: "charla",
    title: "¿Qué están tejiendo a crochet esta semana?",
    body: "Yo arranqué una manta de grannys para mi sobrina y ya voy por el cuadro 12. Cuenten las suyas así nos inspiramos.",
    createdDaysAgo: 6,
    posts: [
      {
        author: "solaguirre",
        body: "Qué linda idea. Yo tengo a medias un top que no me decido a terminar…",
        createdDaysAgo: 5,
      },
    ],
  },
  {
    groupSlug: "charla-general",
    author: "ovillo",
    type: "anuncio",
    title: "¡Bienvenidas a la comunidad de Ovillo!",
    body: "Este es el rincón distendido para charlar de todo un poco. Presentate, contá qué estás tejiendo y sacate las dudas: acá nadie teje sola.",
    createdDaysAgo: 20,
    pinned: true,
    posts: [
      {
        author: "mariaruiz",
        body: "¡Qué lindo que esto esté en marcha! Yo arranco: tejo desde los 12 y ahora ando con dos agujas. 💛",
        createdDaysAgo: 19,
      },
      {
        author: "candelateje",
        body: "Hola a todas 👋 Acá, fanática del crochet y de los amigurumis. ¡Nos vamos a divertir!",
        createdDaysAgo: 18,
      },
    ],
  },
  {
    groupSlug: "ayuda-para-principiantes",
    author: "lupitateje",
    type: "pregunta",
    title: "¿Cómo leo un patrón con abreviaturas tipo «2 pj, 1 laz»?",
    body: "Estoy con mi primer patrón escrito y me pierdo con las abreviaturas. ¿Hay alguna lista confiable para arrancar?",
    createdDaysAgo: 4,
    posts: [
      {
        author: "mariaruiz",
        body: "¡Bienvenida al club de las abreviaturas! Anotá en un papelito las que más usa tu patrón y tenelas a mano; con la práctica se vuelven automáticas.",
        createdDaysAgo: 3,
      },
    ],
  },
  {
    groupSlug: "sugerencias-para-ovillo",
    author: "ovillo",
    type: "anuncio",
    title: "Contanos qué te gustaría que Ovillo tenga",
    body: "Estamos construyendo esto entre todas. Si hay algo que te falta o algo que te resulta incómodo, escribilo acá: leemos todo.",
    createdDaysAgo: 15,
    pinned: true,
    posts: [
      {
        author: "mariaruiz",
        body: "A mí me encantaría una vista de calendario para organizarme con los tejidos del año.",
        createdDaysAgo: 14,
      },
    ],
  },
];

/** KAL/CAL demo (spec §5.10): uno en curso, uno terminado y uno por empezar. */
const EVENTS: EventSpec[] = [
  {
    groupSlug: "dos-agujas",
    organizer: "mariaruiz",
    name: "KAL Sweater de otoño",
    craft: "dos-agujas",
    startsInDays: -10,
    endsInDays: 11,
    patternSlugs: ["cardigan-dreams"],
    description:
      "Nos acompañamos a tejer una prenda de abrigo: arrancamos con la muestra de tensión, seguimos por el canesú y llegamos al bloqueo con compañía. Subí tus avances y tus dudas en este hilo; en la biblioteca hay patrones que sirven de guía.",
    stages: [
      {
        title: "Muestra y montaje",
        note: "Tejer la muestra de tensión y montar los puntos de la talla elegida.",
      },
      {
        title: "Canesú y mangas",
        note: "Avanzar con el canesú, dividir las mangas y separar el cuerpo.",
      },
      {
        title: "Terminación",
        note: "Esconder las hebras, bloquear y estrenar.",
      },
    ],
    posts: [
      {
        author: "mariaruiz",
        body: "¡Bienvenidas! Yo voy por el canesú: suban sus avances y, si se traban con los aumentos, me escriben por acá que les doy una mano. 🧶",
        createdDaysAgo: 10,
      },
      {
        author: "lupitateje",
        body: "Me sumé un poco tarde pero acá estoy: voy a terminar un chal que tenía a medias y después arranco con la muestra.",
        createdDaysAgo: 7,
      },
    ],
    participants: [
      {
        username: "mariaruiz",
        projectSlug: "sweater-otono",
        joinedDaysAgo: 10,
      },
      { username: "lupitateje", projectSlug: "chal-encaje", joinedDaysAgo: 7 },
    ],
  },
  {
    groupSlug: "crochet",
    organizer: "candelateje",
    name: "CAL Manta de grannys",
    craft: "crochet",
    startsInDays: -25,
    endsInDays: -3,
    patternSlugs: ["chaleco-granny-squares-team-invierno"],
    description:
      "Un clásico: tejemos cuadros de la abuela y los unimos en una manta. La idea era hacer dos cuadros por semana y compartir combinaciones de color; el hilo quedó abierto para los que siguen sumando cuadros.",
    stages: [
      {
        title: "Cuadros y más cuadros",
        note: "Tejer los cuadros y jugar con los colores.",
      },
      {
        title: "Unión y borde",
        note: "Unir los cuadros y hacer un borde a punto cangrejo.",
      },
    ],
    posts: [
      {
        author: "candelateje",
        body: "¡Arrancamos! Dejo un tip: si van a unir los cuadros al final, guarden una aguja un número más chica para el borde, queda más prolijo.",
        createdDaysAgo: 25,
      },
      {
        author: "solaguirre",
        body: "Yo venía con la manta a medias y este CAL me dio el empujón para no abandonarla. ¡Gracias!",
        createdDaysAgo: 8,
      },
    ],
    participants: [
      {
        username: "candelateje",
        projectSlug: "manta-granny",
        joinedDaysAgo: 25,
      },
      {
        username: "solaguirre",
        projectSlug: "camperita-bebe",
        joinedDaysAgo: 15,
      },
    ],
  },
  {
    groupSlug: "amigurumis",
    organizer: "candelateje",
    name: "CAL Amigurumis de primavera",
    craft: "crochet",
    startsInDays: 6,
    endsInDays: 20,
    patternSlugs: ["oso-tono", "ranita-flor"],
    description:
      "Para el próximo CAL elegimos animalitos: hay un osito y una ranita en la biblioteca, así que cada quien teje el que más le guste. Arrancamos en unos días; mientras tanto, vayan eligiendo lana y contando a quién le van a regalar el suyo.",
    stages: [
      {
        title: "Elegir y arrancar",
        note: "Anillo mágico, puntos bajos y primeras vueltas.",
      },
      {
        title: "Cuerpo y detalles",
        note: "Relleno, orejas y carita.",
      },
      {
        title: "Fotos finales",
        note: "Compartir los animalitos terminados.",
      },
    ],
    posts: [
      {
        author: "candelateje",
        body: "¡Se viene el CAL de animalitos! Cuenten qué lana van a usar así nos inspiramos entre todas.",
        createdDaysAgo: 2,
      },
      {
        author: "lupitateje",
        body: "Yo me anoto con el osito: tengo una lana marrón en el inventario que pide a gritos ser un oso. 🐻",
        createdDaysAgo: 1,
      },
    ],
    participants: [],
  },
];

/**
 * Glosario demo (spec §5.14): el contenido base de Ovillo. Los términos están
 * ordenados a mano por bloque para leerlos cómodos; la página los ordena
 * alfabéticamente con criterio en español.
 */
const GLOSSARY: GlossarySpec[] = [
  // -------------------------------------------------------------------------
  // Dos agujas: puntos
  // -------------------------------------------------------------------------
  {
    slug: "punto-derecho",
    term: "Punto derecho",
    abbreviation: "pd",
    english: "knit (k)",
    variants: [{ country: "España", name: "punto del derecho" }],
    definition:
      "El punto base de las dos agujas: se engancha la hebra por delante de la aguja y se saca el punto nuevo del derecho. Todo tejido arranca y termina acá.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-reves",
    term: "Punto revés",
    abbreviation: "pr",
    english: "purl (p)",
    variants: [{ country: "España", name: "punto del revés" }],
    definition:
      "El hermano del derecho: la aguja pasa por delante y la hebra queda por delante de la labor. Es el que le da textura a los elásticos y al arroz.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-jersey",
    term: "Punto jersey",
    abbreviation: "",
    english: "stockinette stitch",
    variants: [
      { country: "España", name: "punto liso" },
      { country: "España", name: "punto de media" },
    ],
    definition:
      "Tejiendo plano es una hilera al derecho y una al revés; tejiendo en redondo, todas al derecho. Queda liso de un lado y con rayitas del otro.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "jersey-al-reves",
    term: "Jersey al revés",
    abbreviation: "",
    english: "reverse stockinette stitch",
    variants: [],
    definition:
      "El jersey dado vuelta: una hilera al revés y una al derecho tejiendo plano. La cara linda (la de las rayitas) queda para afuera.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-bobo",
    term: "Punto bobo",
    abbreviation: "",
    english: "garter stitch",
    variants: [{ country: "Argentina", name: "punto Santa Clara" }],
    definition:
      "Todas las hileras al derecho. No se enrosca, queda esponjoso y es el primer punto que casi todas aprendimos.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-arroz",
    term: "Punto arroz",
    abbreviation: "",
    english: "seed stitch",
    variants: [],
    definition:
      "Se alternan derecho y revés punto por punto, y en la hilera siguiente se teje al revés lo que venía al derecho. Queda una textura de puntitos pareja de los dos lados.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-elastico",
    term: "Punto elástico",
    abbreviation: "",
    english: "rib stitch",
    variants: [{ country: "México", name: "punto de costilla" }],
    definition:
      "Se repiten columnas de derecho y revés (1x1, 2x2…). Estira y vuelve, por eso se usa en puños, cinturas y cuellos.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-calado",
    term: "Punto calado",
    abbreviation: "",
    english: "lace",
    variants: [],
    definition:
      "Punto con agujeritos hechos con lazadas y disminuciones que las compensan. Es el que da ese aire liviano a chales y blusas.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "trenza",
    term: "Trenza",
    abbreviation: "",
    english: "cable",
    variants: [],
    definition:
      "Se cruzan grupos de puntos con una aguja auxiliar por delante o por detrás. Se ve difícil pero son solo cruces cada tantas hileras.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "punto-ingles",
    term: "Punto inglés",
    abbreviation: "",
    english: "brioche stitch",
    variants: [],
    definition:
      "Tejido esponjoso y grueso: en cada hilera se teje el punto de la hilera anterior junto con su lazada. Ideal para cuellos y bufandas bien abrigadas.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "dos-puntos-juntos",
    term: "Dos puntos juntos",
    abbreviation: "2 pj",
    english: "knit two together (k2tog)",
    variants: [],
    definition:
      "La disminución más simple: se tejen dos puntos como si fueran uno. Inclina el tejido hacia la derecha.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "disminucion-simple",
    term: "Disminución simple",
    abbreviation: "ss",
    english: "slip, slip, knit (ssk)",
    variants: [{ country: "España", name: "surjete simple" }],
    definition:
      "Se pasa un punto sin tejer, se teje el siguiente y se pasa el primero sobre el segundo. Es la disminución que inclina hacia la izquierda.",
    craft: "dos-agujas",
    kind: "punto",
  },
  {
    slug: "lazada",
    term: "Lazada",
    abbreviation: "laz",
    english: "yarn over (yo)",
    variants: [{ country: "España", name: "hebra" }],
    definition:
      "Se pasa la hebra por encima de la aguja sin tejer: en la hilera siguiente queda un punto de más, que es un agujerito decorativo o un aumento.",
    craft: "dos-agujas",
    kind: "punto",
  },
  // -------------------------------------------------------------------------
  // Dos agujas: técnicas
  // -------------------------------------------------------------------------
  {
    slug: "montar-puntos",
    term: "Montar puntos",
    abbreviation: "mont",
    english: "cast on (CO)",
    variants: [{ country: "México", name: "echar puntos" }],
    definition:
      "El primer paso de todo proyecto: armar los puntos iniciales sobre la aguja. El montaje simple alcanza para casi todo.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "rematar",
    term: "Rematar",
    abbreviation: "rem",
    english: "bind off (BO)",
    variants: [{ country: "España", name: "cerrar los puntos" }],
    definition:
      "Cerrar los puntos al terminar una pieza: se tejen dos, se pasa el primero sobre el segundo y se sigue hasta que no queda ninguno.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "hilera",
    term: "Hilera",
    abbreviation: "hil",
    english: "row",
    variants: [{ country: "España", name: "pasada" }],
    definition:
      "Cada línea de puntos que se teje de una punta a la otra, yendo y viniendo. En los patrones: «tejer 4 hileras al derecho».",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "muestra-de-tension",
    term: "Muestra de tensión",
    abbreviation: "",
    english: "gauge swatch",
    variants: [{ country: "España", name: "tensión del tejido" }],
    definition:
      "Un cuadradito de 10×10 cm que se teje antes de empezar: si los puntos y las hileras coinciden con los del patrón, la prenda sale de la talla.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "levantar-puntos",
    term: "Levantar puntos",
    abbreviation: "lev",
    english: "pick up stitches",
    variants: [],
    definition:
      "Recoger puntos del borde de una pieza ya tejida (por ejemplo, para un cuello o una abertura) y seguir tejiendo desde ahí.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "canesu",
    term: "Canesú",
    abbreviation: "",
    english: "yoke",
    variants: [],
    definition:
      "La parte de arriba de un sweater que une hombros, cuello y mangas antes de separar el cuerpo. Puede ser redondo o en raglán.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "raglan",
    term: "Raglán",
    abbreviation: "",
    english: "raglan",
    variants: [],
    definition:
      "Tipo de construcción con cuatro líneas de aumentos que bajan en diagonal desde el cuello hasta la axila, separando mangas y cuerpo.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "remallado",
    term: "Remallado",
    abbreviation: "",
    english: "grafting (Kitchener stitch)",
    variants: [],
    definition:
      "Unir dos bordes vivos punto por punto con una aguja de coser, imitando el tejido. Se usa en las punteras de las medias para que no se sienta la costura.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "aumento",
    term: "Aumento",
    abbreviation: "aum",
    english: "increase (inc)",
    variants: [],
    definition:
      "Sumar un punto para ensanchar el tejido: con una lazada, tejiendo dos veces el mismo punto o levantando la hebra entre dos puntos.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "sisas",
    term: "Sisas",
    abbreviation: "",
    english: "armhole",
    variants: [],
    definition:
      "La abertura donde entra la manga. En los patrones suele decir «disminuir para las sisas» justo después de terminar el canesú.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "escote",
    term: "Escote",
    abbreviation: "",
    english: "neckline",
    variants: [],
    definition:
      "La abertura del cuello. Puede ser redondo, en V o cuadrado, y casi siempre se termina con un elástico para que no se deforme.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  {
    slug: "delantero-y-espalda",
    term: "Delantero y espalda",
    abbreviation: "",
    english: "front and back",
    variants: [],
    definition:
      "Las dos piezas grandes de un sweater tejido plano: la espalda y el frente, que después se cosen en los hombros y los costados.",
    craft: "dos-agujas",
    kind: "tecnica",
  },
  // -------------------------------------------------------------------------
  // Comunes a las dos técnicas
  // -------------------------------------------------------------------------
  {
    slug: "tejer-en-redondo",
    term: "Tejer en redondo",
    abbreviation: "",
    english: "knit in the round",
    variants: [{ country: "España", name: "tejer en circular" }],
    definition:
      "Tejer en círculo con agujas circulares o de doble punta: no hay costuras y el derecho del tejido queda siempre del mismo lado.",
    craft: "ambos",
    kind: "tecnica",
  },
  {
    slug: "vuelta",
    term: "Vuelta",
    abbreviation: "vta",
    english: "round",
    variants: [],
    definition:
      "Cada línea completa cuando se teje en redondo a dos agujas o a crochet. En los patrones: «repetir la vuelta 6 veces».",
    craft: "ambos",
    kind: "tecnica",
  },
  {
    slug: "esconder-hebras",
    term: "Esconder las hebras",
    abbreviation: "",
    english: "weave in ends",
    variants: [],
    definition:
      "Pasar los hilitos que sobraron entre los puntos del revés con una aguja lanera, para que no se vean ni se suelten al lavar.",
    craft: "ambos",
    kind: "tecnica",
  },
  {
    slug: "bloqueo",
    term: "Bloqueo",
    abbreviation: "",
    english: "blocking",
    variants: [],
    definition:
      "Humectar la prenda terminada y estirarla con alfileres hasta su forma final. Asienta los puntos parejos y salva mil diferencias de tensión.",
    craft: "ambos",
    kind: "tecnica",
  },
  {
    slug: "cambio-de-color",
    term: "Cambio de color",
    abbreviation: "",
    english: "color change",
    variants: [],
    definition:
      "Introducir una lana nueva en el último paso del último punto del color viejo, para que el cambio quede prolijo y sin agujeros.",
    craft: "ambos",
    kind: "tecnica",
  },
  {
    slug: "derecho-del-tejido",
    term: "Derecho del tejido",
    abbreviation: "LD",
    english: "right side (RS)",
    variants: [],
    definition:
      "La cara de la prenda que se ve cuando la usás. Los patrones marcan si una hilera se teje por el derecho (LD) o por el revés (LR).",
    craft: "ambos",
    kind: "tecnica",
  },
  {
    slug: "reves-del-tejido",
    term: "Revés del tejido",
    abbreviation: "LR",
    english: "wrong side (WS)",
    variants: [],
    definition:
      "La cara interna, la que queda contra el cuerpo. Suelen verse las hebras y los nudos; ahí es donde se esconden los hilitos.",
    craft: "ambos",
    kind: "tecnica",
  },
  // -------------------------------------------------------------------------
  // Crochet: puntos
  // -------------------------------------------------------------------------
  {
    slug: "cadena",
    term: "Cadena",
    abbreviation: "cad",
    english: "chain (ch)",
    variants: [{ country: "España", name: "cadeneta" }],
    definition:
      "El punto más liviano: se engancha la hebra y se pasa por el bucle. Sirve para arrancar, para subir de vuelta y para calar.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "punto-enano",
    term: "Punto enano",
    abbreviation: "pe",
    english: "slip stitch (sl st)",
    variants: [{ country: "México", name: "punto raso" }],
    definition:
      "Se engancha, se saca una lazada y se pasa directo por el bucle: queda casi plano. Se usa para cerrar vueltas, unir piezas o bordes firmes.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "punto-bajo",
    term: "Punto bajo",
    abbreviation: "pb",
    english: "single crochet (sc)",
    variants: [],
    definition:
      "El punto básico del crochet: se engancha en el punto de abajo, se saca una lazada y se cierran las dos del gancho. Es el punto de los amigurumis.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "medio-punto",
    term: "Medio punto",
    abbreviation: "mp",
    english: "half double crochet (hdc)",
    variants: [],
    definition:
      "Como el punto bajo pero pasando la hebra una vez de más por el medio: queda más alto y más suelto. Justo entre el pb y el pa.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "punto-alto",
    term: "Punto alto",
    abbreviation: "pa",
    english: "double crochet (dc)",
    variants: [
      { country: "Argentina", name: "vareta" },
      { country: "Uruguay", name: "vareta" },
    ],
    definition:
      "Lleva una lazada extra al empezar y se cierra en dos pasos: por eso es más alto y avanza rápido. Es el punto estrella de las mantas.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "vareta-doble",
    term: "Vareta doble",
    abbreviation: "vd",
    english: "treble crochet (tr)",
    variants: [{ country: "España", name: "punto alto doble" }],
    definition:
      "Dos lazadas al empezar y se cierra en tres pasos; queda más alta y suelta que la vareta. Se usa en calados y puntos fantasía.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "punto-puff",
    term: "Punto puff",
    abbreviation: "",
    english: "puff stitch",
    variants: [],
    definition:
      "Se enganchan varias lazadas juntas en el mismo punto y se cierran todas de una: queda una bolita esponjosa. Si queda suelta, cerrar con tensión firme en el último paso.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "cuadro-de-la-abuela",
    term: "Cuadro de la abuela",
    abbreviation: "",
    english: "granny square",
    variants: [{ country: "España", name: "cuadrado de la abuela" }],
    definition:
      "El clásico cuadrado tejido desde el centro hacia afuera, en colores y vueltas concéntricas. Es el ladrillo de las mantas de crochet.",
    craft: "crochet",
    kind: "punto",
  },
  {
    slug: "punto-cangrejo",
    term: "Punto cangrejo",
    abbreviation: "",
    english: "crab stitch",
    variants: [],
    definition:
      "Un punto bajo tejido «para atrás», en el sentido contrario al trabajo. Da un borde firme y decorativo: el remate ideal de mantas y caminos de mesa.",
    craft: "crochet",
    kind: "punto",
  },
  // -------------------------------------------------------------------------
  // Crochet: técnicas
  // -------------------------------------------------------------------------
  {
    slug: "anillo-magico",
    term: "Anillo mágico",
    abbreviation: "am",
    english: "magic ring (MR)",
    variants: [{ country: "México", name: "aro deslizable" }],
    definition:
      "Un círculo que se cierra apretando la hebra, sin agujero en el centro. Así arrancan los amigurumis para que no quede el huequito.",
    craft: "crochet",
    kind: "tecnica",
  },
  {
    slug: "tejer-en-espiral",
    term: "Tejer en espiral",
    abbreviation: "",
    english: "continuous rounds",
    variants: [],
    definition:
      "Seguir de largo sin cerrar cada vuelta, moviendo un marcador cada vez. Deja los amigurumis sin costura visible.",
    craft: "crochet",
    kind: "tecnica",
  },
  {
    slug: "amigurumi",
    term: "Amigurumi",
    abbreviation: "",
    english: "amigurumi",
    variants: [],
    definition:
      "Muñequitos tejidos a crochet en punto bajo y en espiral, primero el cuerpo y después los detalles. Se rellenan con guata y se borda la carita.",
    craft: "crochet",
    kind: "tecnica",
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

/** Fecha de calendario relativa a hoy: negativo = ya pasó, positivo = falta. */
function dayString(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
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
  // El glosario es contenido de Ovillo (no de las cuentas demo) y hoy sale
  // entero del seed: se re-crea al volver a sembrar (D-057).
  await db.delete(glossaryTerm);
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

async function seedUser(spec: UserSpec, passwordHash: string): Promise<string> {
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
  let yarnLinkCount = 0;
  let toolLinkCount = 0;
  let queueCount = 0;
  let savedCount = 0;
  let goalCount = 0;

  try {
    // Los vínculos lana↔proyecto y herramienta↔proyecto (spec §5.3) van al
    // final: necesitan los ids de lanas y herramientas. Acá se juntan.
    const projectIds = new Map<string, string>();
    const toolIds: string[] = [];
    /** `null` si una lana se saltea (catálogo incompleto): no corre índices. */
    const stashIds: (string | null)[] = [];

    for (const projectSpec of spec.projects) {
      const projectId = createId();
      projectIds.set(projectSpec.slug, projectId);
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
      const toolId = createId();
      toolIds.push(toolId);
      await db.insert(tool).values({
        id: toolId,
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
          stashIds.push(null);
          continue;
        }
        yarnId = resolved.id;
        catalog = { meters: resolved.meters, grams: resolved.grams };
      } else if (!stashSpec.customName) {
        console.warn("  Aviso: una lana de carga libre quedó sin nombre.");
        stashIds.push(null);
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
      stashIds.push(stashId);
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

    // Lanas y herramientas de cada proyecto (spec §5.3). En el inventario la
    // lana descuenta disponible (D-045); la herramienta es informativa.
    for (const projectSpec of spec.projects) {
      const projectId = projectIds.get(projectSpec.slug);
      if (!projectId) {
        continue;
      }

      for (const yarnSpec of projectSpec.yarns ?? []) {
        let stashItemId: string | null = null;
        let yarnId: string | null = null;

        if (yarnSpec.stash !== undefined) {
          const resolved = stashIds[yarnSpec.stash] ?? null;
          if (!resolved) {
            console.warn(
              `  Aviso: falta la lana #${yarnSpec.stash} de @${spec.username}.`,
            );
            continue;
          }
          stashItemId = resolved;
        } else if (yarnSpec.yarnSlug) {
          const resolved = yarnsByPath.get(yarnSpec.yarnSlug);
          if (!resolved) {
            console.warn(
              `  Aviso: no existe la lana "${yarnSpec.yarnSlug}" para asignar (¿corriste pnpm db:seed-yarns?).`,
            );
            continue;
          }
          yarnId = resolved.id;
        } else {
          continue;
        }

        yarnLinkCount++;
        await db.insert(projectYarn).values({
          id: createId(),
          projectId,
          stashItemId,
          yarnId,
          skeinsUsed: yarnSpec.skeinsUsed ?? null,
          gramsUsed: yarnSpec.gramsUsed ?? null,
        });
      }

      for (const toolIndex of projectSpec.projectTools ?? []) {
        const toolId = toolIds[toolIndex];
        if (!toolId) {
          console.warn(
            `  Aviso: falta la herramienta #${toolIndex} de @${spec.username}.`,
          );
          continue;
        }
        toolLinkCount++;
        await db.insert(projectTool).values({
          id: createId(),
          projectId,
          toolId,
        });
      }
    }

    // "Quiero tejer" y guardados (spec §5.8): van al final, cuando ya existen
    // los ids de patrones, proyectos y lanas de la cuenta.
    for (const [index, queueSpec] of (spec.queue ?? []).entries()) {
      const patternId = patternIds.get(queueSpec.patternSlug);
      if (!patternId) {
        console.warn(
          `  Aviso: no existe el patrón "${queueSpec.patternSlug}" para la cola de @${spec.username} (¿corriste pnpm db:seed-patterns?).`,
        );
        continue;
      }

      let plannedStashItemId: string | null = null;
      if (queueSpec.stash !== undefined) {
        plannedStashItemId = stashIds[queueSpec.stash] ?? null;
        if (!plannedStashItemId) {
          console.warn(
            `  Aviso: falta la lana #${queueSpec.stash} para la cola de @${spec.username}.`,
          );
        }
      }

      queueCount++;
      await db.insert(queueItem).values({
        id: createId(),
        userId,
        patternId,
        position: index + 1,
        plannedStashItemId,
        targetDate:
          queueSpec.targetDaysFromNow === undefined
            ? null
            : dateString(-queueSpec.targetDaysFromNow),
        notes: queueSpec.notes ?? null,
        createdAt,
        updatedAt: createdAt,
      });
    }

    for (const collectionSpec of spec.collections ?? []) {
      const collectionId = createId();
      await db.insert(collection).values({
        id: collectionId,
        userId,
        name: collectionSpec.name,
        visibility: collectionSpec.visibility,
        createdAt,
        updatedAt: createdAt,
      });

      for (const item of collectionSpec.items) {
        let targetType: SavedType | null = null;
        let targetId: string | null = null;

        if (item.patternSlug) {
          targetType = "patron";
          targetId = patternIds.get(item.patternSlug) ?? null;
        } else if (item.projectSlug) {
          targetType = "proyecto";
          targetId = projectIds.get(item.projectSlug) ?? null;
        } else if (item.yarnSlug) {
          targetType = "lana";
          targetId = yarnsByPath.get(item.yarnSlug)?.id ?? null;
        }

        if (!targetType || !targetId) {
          console.warn(
            `  Aviso: no se pudo guardar un destino de la colección "${collectionSpec.name}" de @${spec.username}.`,
          );
          continue;
        }

        savedCount++;
        await db.insert(savedItem).values({
          id: createId(),
          userId,
          collectionId,
          targetType,
          targetId,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }

    // Meta anual (spec §5.14): el año sale de la fecha real de la siembra.
    if (spec.goalTargetProjects !== undefined) {
      goalCount++;
      await db.insert(yearlyGoal).values({
        id: createId(),
        userId,
        year: new Date().getFullYear(),
        targetProjects: spec.goalTargetProjects,
        createdAt,
        updatedAt: createdAt,
      });
    }
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  const projectCount = spec.projects.length;
  console.log(
    `  ✓ ${spec.username} — ${projectCount} proyecto(s), ${photoCount} foto(s), ${entryCount} entrada(s), ${counterCount} contador(es), ${toolCount} herramienta(s), ${stashCount} lana(s), ${yarnLinkCount} lana(s) asignada(s), ${toolLinkCount} vínculo(s) de herramienta(s), ${queueCount} en la cola, ${savedCount} guardado(s), ${goalCount} meta(s)`,
  );

  return userId;
}

/**
 * Grupos oficiales y membresías demo (spec §5.9). Va después de las cuentas
 * porque necesita los ids de todas: el equipo queda como dueño de cada grupo
 * y las membresías reparten a la comunidad; Sol deja una solicitud pendiente
 * para poder ver el flujo de aprobación.
 */
async function seedCommunity(users: Map<string, string>): Promise<void> {
  const db = getDb();
  const teamId = users.get("ovillo");
  if (!teamId) {
    return;
  }

  const tempDir = mkdtempSync(join(tmpdir(), "ovillo-groups-"));
  let membershipCount = 0;
  let threadCount = 0;
  let postCount = 0;
  let eventCount = 0;
  let eventParticipantCount = 0;
  let eventPostCount = 0;

  try {
    const groupIds = new Map<string, string>();

    for (const spec of OFFICIAL_GROUPS) {
      const groupId = createId();
      const createdAt = daysAgoDate(spec.createdDaysAgo);
      const imageId = await uploadPhoto(
        teamId,
        `grupos/${groupId}`,
        spec.photo,
        tempDir,
      );

      await db.insert(group).values({
        id: groupId,
        slug: spec.slug,
        name: spec.name,
        description: spec.description,
        rules: spec.rules,
        category: spec.category,
        joinPolicy: spec.joinPolicy,
        imageId,
        createdBy: teamId,
        createdAt,
        updatedAt: createdAt,
      });
      await db.insert(groupMember).values({
        groupId,
        userId: teamId,
        role: "dueno",
        status: "activo",
        createdAt,
        updatedAt: createdAt,
      });

      groupIds.set(spec.slug, groupId);
    }

    for (const spec of DEMO_USERS) {
      const userId = users.get(spec.username);
      if (!userId) {
        continue;
      }

      // Cada quien se fue sumando con el tiempo, no el día que llegó.
      const joinedAt = daysAgoDate(Math.max(5, spec.createdDaysAgo - 25));
      for (const membership of spec.groups ?? []) {
        const groupId = groupIds.get(membership.slug);
        if (!groupId) {
          console.warn(
            `  Aviso: no existe el grupo "${membership.slug}" para ${spec.username}.`,
          );
          continue;
        }

        membershipCount += 1;
        await db.insert(groupMember).values({
          groupId,
          userId,
          role: membership.role ?? "miembro",
          status: membership.status ?? "activo",
          createdAt: joinedAt,
          updatedAt: joinedAt,
        });
      }
    }

    for (const spec of THREADS) {
      const groupId = groupIds.get(spec.groupSlug);
      const authorId = users.get(spec.author);
      if (!groupId || !authorId) {
        console.warn(
          `  Aviso: no se pudo sembrar el hilo "${spec.title}" (grupo o cuenta faltante).`,
        );
        continue;
      }

      let projectId: string | null = null;
      if (spec.projectSlug) {
        const [ownProject] = await db
          .select({ id: project.id })
          .from(project)
          .where(
            and(
              eq(project.userId, authorId),
              eq(project.slug, spec.projectSlug),
              isNull(project.deletedAt),
            ),
          )
          .limit(1);
        projectId = ownProject?.id ?? null;
      }

      const threadId = createId();
      const createdAt = daysAgoDate(spec.createdDaysAgo);
      const imageIds: string[] = [];
      for (const photo of spec.photos ?? []) {
        imageIds.push(
          await uploadPhoto(authorId, `comunidad/${threadId}`, photo, tempDir),
        );
      }

      await db.insert(thread).values({
        id: threadId,
        groupId,
        authorId,
        type: spec.type,
        title: spec.title,
        body: spec.body,
        imageIds,
        projectId,
        pinned: spec.pinned ?? false,
        locked: spec.locked ?? false,
        lastActivityAt: createdAt,
        createdAt,
      });

      const postIds: string[] = [];
      let lastActivityAt = createdAt;
      for (const postSpec of spec.posts ?? []) {
        const postAuthorId = users.get(postSpec.author);
        if (!postAuthorId) {
          continue;
        }
        const postCreatedAt = daysAgoDate(postSpec.createdDaysAgo);
        const postImageIds: string[] = [];
        for (const photo of postSpec.photos ?? []) {
          postImageIds.push(
            await uploadPhoto(
              postAuthorId,
              `comunidad/${threadId}`,
              photo,
              tempDir,
            ),
          );
        }

        const [inserted] = await db
          .insert(post)
          .values({
            threadId,
            authorId: postAuthorId,
            body: postSpec.body,
            imageIds: postImageIds,
            createdAt: postCreatedAt,
          })
          .returning({ id: post.id });
        postIds.push(inserted.id);
        postCount += 1;
        if (postCreatedAt > lastActivityAt) {
          lastActivityAt = postCreatedAt;
        }
      }

      if (spec.solution !== undefined && postIds[spec.solution]) {
        await db
          .update(thread)
          .set({ solutionPostId: postIds[spec.solution] })
          .where(eq(thread.id, threadId));
      }
      await db
        .update(thread)
        .set({ lastActivityAt })
        .where(eq(thread.id, threadId));

      threadCount += 1;
    }

    const eventStats = await seedEvents(users, groupIds);
    eventCount = eventStats.events;
    eventParticipantCount = eventStats.participants;
    eventPostCount = eventStats.posts;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }

  console.log(
    `  ✓ comunidad — ${OFFICIAL_GROUPS.length} grupo(s) oficiales, ${membershipCount} membresía(s), ${threadCount} hilo(s) y ${postCount} respuesta(s)`,
  );
  console.log(
    `  ✓ KAL/CAL — ${eventCount} evento(s), ${eventParticipantCount} participación(es) y ${eventPostCount} respuesta(s)`,
  );
}

/** KAL/CAL demo: cada evento abre su hilo propio y suma participantes (D-056). */
async function seedEvents(
  users: Map<string, string>,
  groupIds: Map<string, string>,
): Promise<{ events: number; participants: number; posts: number }> {
  const db = getDb();
  let events = 0;
  let participants = 0;
  let posts = 0;

  for (const spec of EVENTS) {
    const groupId = groupIds.get(spec.groupSlug);
    const organizerId = users.get(spec.organizer);
    if (!groupId || !organizerId) {
      console.warn(
        `  Aviso: no se pudo sembrar el KAL/CAL "${spec.name}" (grupo o cuenta faltante).`,
      );
      continue;
    }

    const patternRows =
      spec.patternSlugs.length > 0
        ? await db
            .select({ id: pattern.id, slug: pattern.slug })
            .from(pattern)
            .where(inArray(pattern.slug, spec.patternSlugs))
        : [];
    const patternIds = spec.patternSlugs
      .map((slug) => patternRows.find((row) => row.slug === slug)?.id)
      .filter((id): id is string => id !== undefined);

    // El hilo se abre una semana antes de empezar (y como mínimo, ayer).
    const announcedDaysAgo = Math.max(2, 7 - spec.startsInDays);
    const createdAt = daysAgoDate(announcedDaysAgo);
    const threadId = createId();
    const eventId = createId();

    await db.insert(thread).values({
      id: threadId,
      groupId,
      authorId: organizerId,
      type: "charla",
      title: spec.name,
      body: spec.description,
      imageIds: [],
      lastActivityAt: createdAt,
      createdAt,
    });

    await db.insert(event).values({
      id: eventId,
      groupId,
      threadId,
      createdBy: organizerId,
      name: spec.name,
      craft: spec.craft,
      startsAt: dayString(spec.startsInDays),
      endsAt: dayString(spec.endsInDays),
      patternIds,
      stages: spec.stages,
      createdAt,
      updatedAt: createdAt,
    });

    let lastActivityAt = createdAt;
    for (const postSpec of spec.posts ?? []) {
      const postAuthorId = users.get(postSpec.author);
      if (!postAuthorId) {
        continue;
      }
      const postCreatedAt = daysAgoDate(postSpec.createdDaysAgo);
      await db.insert(post).values({
        threadId,
        authorId: postAuthorId,
        body: postSpec.body,
        imageIds: [],
        createdAt: postCreatedAt,
      });
      posts += 1;
      if (postCreatedAt > lastActivityAt) {
        lastActivityAt = postCreatedAt;
      }
    }
    if (lastActivityAt > createdAt) {
      await db
        .update(thread)
        .set({ lastActivityAt })
        .where(eq(thread.id, threadId));
    }

    for (const participant of spec.participants) {
      const userId = users.get(participant.username);
      if (!userId) {
        continue;
      }
      const [ownProject] = await db
        .select({ id: project.id })
        .from(project)
        .where(
          and(
            eq(project.userId, userId),
            eq(project.slug, participant.projectSlug),
            isNull(project.deletedAt),
          ),
        )
        .limit(1);
      if (!ownProject) {
        console.warn(
          `  Aviso: ${participant.username} no tiene el proyecto "${participant.projectSlug}" para el KAL/CAL "${spec.name}".`,
        );
        continue;
      }
      const joinedAt = daysAgoDate(participant.joinedDaysAgo);
      await db.insert(eventParticipant).values({
        eventId,
        userId,
        projectId: ownProject.id,
        createdAt: joinedAt,
        updatedAt: joinedAt,
      });
      participants += 1;
    }

    events += 1;
  }

  return { events, participants, posts };
}

/**
 * El glosario base (spec §5.14): es contenido de Ovillo, no de las cuentas
 * demo, así que `created_by` queda vacío. La edición por moderación llega
 * con el panel de la Fase 8 (D-057).
 */
async function seedGlossary(): Promise<void> {
  const db = getDb();
  await db.insert(glossaryTerm).values(
    GLOSSARY.map((spec) => ({
      slug: spec.slug,
      term: spec.term,
      abbreviation: spec.abbreviation,
      english: spec.english,
      variants: spec.variants,
      definition: spec.definition,
      craft: spec.craft,
      kind: spec.kind,
    })),
  );
  console.log(`  ✓ glosario — ${GLOSSARY.length} término(s)`);
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
  const userIds = new Map<string, string>();
  for (const spec of DEMO_USERS) {
    const userId = await seedUser(spec, passwordHash);
    userIds.set(spec.username, userId);
  }

  console.log("");
  console.log("Sembrando la comunidad…");
  await seedCommunity(userIds);

  console.log("");
  console.log("Sembrando el glosario…");
  await seedGlossary();

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
  console.log(
    "  Quiero tejer suma 3 patrones y Guardados, 2 colecciones; /@mariaruiz muestra la colección pública «Para el invierno».",
  );
  console.log(
    "  Mi año tejiendo: María (meta 4), Candela (3) y Lupita (2); /mi-tejido/meta y /@mariaruiz muestran progreso y resumen.",
  );
  console.log(
    "  Comunidad: /comunidad lista los 6 grupos oficiales; en /grupos/sugerencias-para-ovillo espera la solicitud de Sol y @mariaruiz modera.",
  );
  console.log(
    "  Hilos: 7 hilos y 8 respuestas (charla, muestra con foto, pregunta resuelta y una sin responder); /grupos/ayuda-para-principiantes/hilos muestra el «Pedir ayuda» con el sweater de @mariaruiz.",
  );
  console.log(
    "  KAL/CAL: 3 eventos (uno en curso con 2 participantes, uno terminado y uno por empezar); /grupos/dos-agujas/eventos muestra el KAL de otoño de @mariaruiz.",
  );
  console.log(
    "  Glosario: /glosario tiene 44 términos; probá buscar «liso» o «2 pj» y filtrar por técnica.",
  );
}

main().catch((error) => {
  console.error(
    "No se pudieron sembrar los datos demo. ¿Está todo configurado en .env.local?",
  );
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
