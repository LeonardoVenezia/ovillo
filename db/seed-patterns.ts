import { config } from "dotenv";

import type { Craft } from "@/features/profile/constants";

import { getDb } from "./index";
import {
  pattern,
  type PatternCategory,
  type PatternLanguage,
} from "./pattern-schema";
import type { YarnWeight } from "./yarn-schema";

/**
 * Siembra de la biblioteca de patrones (spec §5.5): patrones gratuitos y
 * reales, publicados por marcas que ya están en el catálogo de lanas.
 *
 * Reglas de esta siembra (D-040):
 * - Solo se enlaza a donde el patrón está publicado: nunca se resube un
 *   archivo de terceros.
 * - Solo se cargan datos verificados en la fuente (nombre, técnica, nivel
 *   cuando la marca lo publica). Si un dato no consta, va en `null`: mejor
 *   poco dato que dato inventado.
 * - El nivel de cada marca se traduce a la escala 1–5 de Ovillo: principiante
 *   o fácil → 2; intermedio → 3; avanzado o experto → 4.
 *
 * Es idempotente: se puede correr las veces que haga falta (`upsert` por
 * slug). `pnpm db:seed-patterns`.
 */

config({ path: [".env.local", ".env"], quiet: true });

type PatternSeed = {
  name: string;
  /** Slug fijo y estable: la URL pública es `/patrones/slug`. */
  slug: string;
  /** Como lo acredita la fuente: marca, estudio o @usuario. */
  designer: string;
  /** `null` cuando la fuente no lo dice con claridad. */
  craft: Craft | null;
  category: PatternCategory;
  /** 1–5 según la traducción de niveles; `null` = sin decir. */
  difficulty: number | null;
  weight?: YarnWeight | null;
  yardageMin?: number | null;
  yardageMax?: number | null;
  needleSizes?: string | null;
  gauge?: string | null;
  sizes?: string | null;
  language?: PatternLanguage;
  sourceUrl: string;
};

const PATTERNS: PatternSeed[] = [
  // ─── Revesderecho (Chile) ────────────────────────────────────────────────
  {
    name: "Kimono Vintage",
    slug: "kimono-vintage",
    designer: "@laclauypunto",
    craft: "crochet",
    category: "prendas",
    difficulty: 2, // "ideal para principiantes en crochet"
    sourceUrl: "https://www.revesderecho.com/products/patron-kinomo-vintage",
  },
  {
    name: "Cardigan Dreams",
    slug: "cardigan-dreams",
    designer: "@piesdelana",
    craft: "dos-agujas", // "tejido con dos agujas en talla estándar"
    category: "prendas",
    difficulty: 2, // "instrucciones simples aptas para tod@s"
    sourceUrl: "https://www.revesderecho.com/products/cardigan-dreams",
  },
  {
    name: "Scrunchie",
    slug: "scrunchie",
    designer: "@quisca",
    craft: "crochet",
    category: "accesorios",
    difficulty: 1, // proyecto para empezar en crochet, con puntos básicos
    sourceUrl: "https://www.revesderecho.com/products/patron-scrunchie",
  },
  {
    name: "Malu Hat",
    slug: "malu-hat",
    designer: "Malulu Knit",
    craft: "crochet",
    category: "accesorios",
    difficulty: 3, // nivel intermedio (etiqueta de la tienda)
    sourceUrl: "https://www.revesderecho.com/products/patron-malu-hat",
  },
  {
    name: "Bucket Hat",
    slug: "bucket-hat",
    designer: "Creaciones Ananda",
    craft: "crochet",
    category: "accesorios",
    difficulty: 3, // nivel intermedio (etiqueta de la tienda)
    sourceUrl: "https://www.revesderecho.com/products/patron-bucket-hat",
  },
  {
    name: "Botties",
    slug: "botties",
    designer: "Amelia la Tejedora",
    craft: "crochet",
    category: "bebes",
    difficulty: 1, // nivel principiante (etiqueta de la tienda)
    sourceUrl: "https://www.revesderecho.com/products/patron-botties",
  },
  {
    name: "Linen Vest",
    slug: "linen-vest",
    designer: "Doctora Palillos",
    craft: "dos-agujas",
    category: "prendas",
    difficulty: 4, // nivel avanzado (etiqueta de la tienda)
    sourceUrl: "https://www.revesderecho.com/products/patron-linen-vest",
  },
  {
    name: "Bandana Amigo Fiel",
    slug: "bandana-amigo-fiel",
    designer: "Corazón de Camelia",
    craft: "dos-agujas",
    category: "mascotas",
    difficulty: null,
    sourceUrl: "https://www.revesderecho.com/products/bandana-amigo-fiel",
  },
  {
    name: "Un Pequeño Mandala",
    slug: "un-pequeno-mandala",
    designer: "Creaciones Ananda",
    craft: "crochet",
    category: "hogar",
    difficulty: 3, // nivel intermedio (etiqueta de la tienda)
    sourceUrl:
      "https://www.revesderecho.com/products/patron-un-pequenio-mandala",
  },
  {
    name: "Ranita Flor",
    slug: "ranita-flor",
    designer: "Arte Crochet Valdivia",
    craft: "crochet",
    category: "amigurumi",
    difficulty: 1, // "si eres principiante… este patrón es perfecto"
    sourceUrl:
      "https://www.revesderecho.com/products/patron-ranita-flor-regalo-navidad",
  },
  {
    name: "Oso Toño",
    slug: "oso-tono",
    designer: "La Delfina",
    craft: "crochet",
    category: "amigurumi",
    difficulty: null,
    sourceUrl: "https://www.revesderecho.com/products/oso-tono-regalo-navidad",
  },
  {
    name: "Unicornio Candy",
    slug: "unicornio-candy",
    designer: "Príncipe del Crochet",
    craft: "crochet",
    category: "amigurumi",
    difficulty: null,
    sourceUrl: "https://www.revesderecho.com/products/patron-unicornio-candy",
  },

  // ─── Katia (España) ──────────────────────────────────────────────────────
  {
    name: "Gorro Beanie Oso",
    slug: "gorro-beanie-oso",
    designer: "Katia",
    craft: "dos-agujas", // "gorro de punto"
    category: "accesorios",
    difficulty: 2, // "fácil" (etiqueta de la tienda)
    sourceUrl:
      "https://www.katia.com/ES/patrones-lanas-estambres-otoño-invierno-mujer-gorro-8044-378.html",
  },
  {
    name: "Bufanda fácil en Fil Piuma",
    slug: "bufanda-facil-en-fil-piuma",
    designer: "Katia",
    craft: "dos-agujas", // "patrón de punto"
    category: "accesorios",
    difficulty: 2, // "fácil" (está en el propio nombre del patrón)
    sourceUrl:
      "https://www.katia.com/ES/patrones-lanas-estambres-otoño-invierno-mujer-bufanda-8044-382.html",
  },
  {
    name: "Pechera Dickey Liv",
    slug: "pechera-dickey-liv",
    designer: "Santa Pazienzia",
    craft: "crochet", // "patrón de crochet pechera Dickey Liv"
    category: "prendas",
    difficulty: null,
    sourceUrl:
      "https://www.katia.com/ES/patrones-lanas-estambres-otoño-invierno-mujer-chaleco-8044-396.html",
  },
  {
    name: "Chaleco Granny Squares Team Invierno",
    slug: "chaleco-granny-squares-team-invierno",
    designer: "Katia",
    craft: "crochet", // granny squares
    category: "prendas",
    difficulty: null,
    sourceUrl:
      "https://www.katia.com/ES/patrones-lanas-estambres-otoño-invierno-mujer-chaleco-8044-362b.html",
  },
  {
    name: "Chaleco de punto en Perla y Silky Mohair",
    slug: "chaleco-perla-y-silky-mohair",
    designer: "Katia",
    craft: "dos-agujas",
    category: "prendas",
    difficulty: 2, // "nivel de dificultad (1)" en la ficha de Katia
    needleSizes: "5,5 mm",
    sizes: "M a XXL",
    sourceUrl:
      "https://www.katia.com/ES/patrones-lanas-estambres-otoño-invierno-mujer-chaleco-7627-1.html",
  },

  // ─── LHO (Argentina) ─────────────────────────────────────────────────────
  // Las fichas de estas recetas no se pudieron abrir al armar la siembra
  // (el sitio bloquea las visitas automáticas): se cargan el nombre y el
  // enlace del sitemap, y la técnica queda en `null` salvo cuando el propio
  // nombre la dice.
  {
    name: "Kokeshi",
    slug: "kokeshi",
    designer: "LHO",
    craft: "crochet", // muñeco amigurumi, tejido a crochet
    category: "amigurumi",
    difficulty: null,
    sourceUrl: "https://www.hiladoslho.com.ar/hilados_recetas/kokeshi/",
  },
  {
    name: "Estrella a crochet",
    slug: "estrella-a-crochet",
    designer: "LHO",
    craft: "crochet",
    category: "hogar",
    difficulty: null,
    sourceUrl:
      "https://www.hiladoslho.com.ar/hilados_recetas/crochet-tejido-estrella/",
  },
  {
    name: "Chaleco XL",
    slug: "chaleco-xl",
    designer: "LHO",
    craft: null,
    category: "prendas",
    difficulty: null,
    sourceUrl: "https://www.hiladoslho.com.ar/hilados_recetas/chaleco-xl/",
  },
];

async function main() {
  const db = getDb();

  // Los slugs de la siembra son fijos; si dos se repiten, el upsert los
  // pisaría en silencio (mejor avisar fuerte).
  const seedSlugs = new Set(PATTERNS.map((seed) => seed.slug));
  if (seedSlugs.size !== PATTERNS.length) {
    throw new Error("La siembra tiene slugs repetidos: revisar PATTERNS.");
  }

  for (const seed of PATTERNS) {
    const values = {
      name: seed.name,
      slug: seed.slug,
      designerName: seed.designer,
      craft: seed.craft,
      category: seed.category,
      difficulty: seed.difficulty,
      yarnWeight: seed.weight ?? null,
      yardageMin: seed.yardageMin ?? null,
      yardageMax: seed.yardageMax ?? null,
      needleSizes: seed.needleSizes ?? null,
      gauge: seed.gauge ?? null,
      sizes: seed.sizes ?? null,
      language: seed.language ?? "es",
      sourceUrl: seed.sourceUrl,
      status: "aprobada" as const,
    };

    await db
      .insert(pattern)
      .values(values)
      .onConflictDoUpdate({ target: pattern.slug, set: values });

    console.log(`✓ ${seed.name} (${seed.designer})`);
  }

  console.log(`Listo: ${PATTERNS.length} patrones base sembrados.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
