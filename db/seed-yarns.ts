import { config } from "dotenv";
import { eq } from "drizzle-orm";

import type { CountryCode } from "../features/profile/countries";
import { normalizeText, slugify } from "../lib/slug";
import { getDb } from "./index";
import {
  yarn,
  yarnBrand,
  type FiberPart,
  type YarnWeight,
} from "./yarn-schema";

/**
 * Siembra del catálogo base de lanas (Fase 4, tramo 1): marcas y lanas
 * populares de Argentina, México, España, Chile y Colombia.
 *
 *   pnpm db:seed-yarns
 *
 * Los datos salen de los catálogos y fichas públicas de cada marca (octubre
 * 2026): nombre de línea, composición, gramos, metros y agujas recomendadas.
 * Son la base "aprobada" del catálogo; la comunidad ya puede proponer el
 * resto desde `/explorar/lanas/proponer`.
 *
 * Es idempotente: la marca se identifica por su slug y la lana por
 * (marca, slug), así que volver a correrlo actualiza lo sembrado sin
 * duplicar. No toca nada de lo que cargó la comunidad.
 */

config({ path: [".env.local", ".env"], quiet: true });

type YarnSeed = {
  name: string;
  weight: YarnWeight;
  fiber: FiberPart[];
  grams?: number;
  meters?: number;
  /** Uno o dos valores en mm (inicio del rango, fin opcional). */
  needles?: [number] | [number, number];
};

type BrandSeed = {
  name: string;
  slug: string;
  country: CountryCode;
  yarns: YarnSeed[];
};

const ALGODON: FiberPart = { fiber: "algodon", percent: 100 };
const ACRILICO: FiberPart = { fiber: "acrilico", percent: 100 };
const LANA: FiberPart = { fiber: "lana", percent: 100 };

const BRANDS: BrandSeed[] = [
  {
    name: "Hilados LHO",
    slug: "hilados-lho",
    country: "AR",
    yarns: [
      {
        name: "Fidelio",
        weight: "aran",
        fiber: [ACRILICO],
        grams: 100,
        meters: 150,
        needles: [4.5, 5],
      },
      {
        name: "Super Hilado",
        weight: "dk",
        fiber: [ACRILICO],
        grams: 100,
        meters: 250,
        needles: [5.5, 6],
      },
      {
        name: "Cash LHO",
        weight: "dk",
        fiber: [ACRILICO],
        grams: 40,
        meters: 96,
        needles: [5, 5.5],
      },
      {
        name: "Nevilan",
        weight: "aran",
        fiber: [
          { fiber: "acrilico", percent: 60 },
          { fiber: "lana", percent: 40 },
        ],
        grams: 100,
        meters: 150,
        needles: [4.5],
      },
      {
        name: "Sole",
        weight: "worsted",
        fiber: [ALGODON],
        grams: 100,
        meters: 230,
        needles: [4.5, 5],
      },
      {
        name: "Bio Lana",
        weight: "super-bulky",
        fiber: [LANA],
        grams: 100,
        meters: 70,
        needles: [8, 9],
      },
      {
        name: "Angorina",
        weight: "aran",
        fiber: [
          { fiber: "acrilico", percent: 75 },
          { fiber: "poliamida", percent: 25 },
        ],
        grams: 150,
        meters: 270,
        needles: [5.5, 6],
      },
      {
        name: "Chenille",
        weight: "bulky",
        fiber: [
          { fiber: "acrilico", percent: 15 },
          { fiber: "poliamida", percent: 85 },
        ],
        grams: 100,
        meters: 80,
        needles: [5.5, 6],
      },
      {
        name: "Raíces",
        weight: "super-bulky",
        fiber: [
          { fiber: "lana", percent: 70 },
          { fiber: "acrilico", percent: 30 },
        ],
        meters: 85,
      },
    ],
  },
  {
    name: "Katia",
    slug: "katia",
    country: "ES",
    yarns: [
      {
        name: "Cotton-Merino",
        weight: "worsted",
        fiber: [
          { fiber: "algodon", percent: 70 },
          { fiber: "merino", percent: 30 },
        ],
        grams: 100,
        meters: 210,
      },
      {
        name: "Cotton-Merino Paradiso",
        weight: "worsted",
        fiber: [
          { fiber: "algodon", percent: 70 },
          { fiber: "merino", percent: 30 },
        ],
        grams: 50,
        meters: 105,
      },
      {
        name: "Cotton-Merino Rainbow",
        weight: "worsted",
        fiber: [
          { fiber: "algodon", percent: 70 },
          { fiber: "merino", percent: 30 },
        ],
        grams: 50,
        meters: 105,
      },
      {
        name: "Cotton-Merino Solids",
        weight: "sport",
        fiber: [
          { fiber: "algodon", percent: 70 },
          { fiber: "merino", percent: 30 },
        ],
        grams: 200,
        meters: 600,
      },
      {
        name: "Merino Seta",
        weight: "dk",
        fiber: [
          { fiber: "lana", percent: 90 },
          { fiber: "seda", percent: 10 },
        ],
        grams: 50,
        meters: 125,
      },
      {
        name: "Alpaca Socks & More",
        weight: "fingering",
        fiber: [
          { fiber: "alpaca", percent: 70 },
          { fiber: "poliamida", percent: 30 },
        ],
        grams: 50,
        meters: 195,
      },
      {
        name: "Fil d'Aria",
        weight: "worsted",
        fiber: [
          { fiber: "alpaca", percent: 69 },
          { fiber: "lana", percent: 31 },
        ],
        grams: 100,
        meters: 220,
      },
      {
        name: "Fil Piuma",
        weight: "dk",
        fiber: [
          { fiber: "merino", percent: 75 },
          { fiber: "poliamida", percent: 25 },
        ],
        grams: 150,
        meters: 400,
      },
      {
        name: "Cashmere Hug",
        weight: "worsted",
        fiber: [
          { fiber: "lana", percent: 72 },
          { fiber: "cashmere", percent: 18 },
          { fiber: "poliamida", percent: 10 },
        ],
        grams: 50,
        meters: 98,
      },
      {
        name: "Azteca Felting Wool",
        weight: "bulky",
        fiber: [LANA],
        grams: 200,
        meters: 200,
      },
      {
        name: "Ingenua Ombré",
        weight: "sport",
        fiber: [
          { fiber: "mohair", percent: 78 },
          { fiber: "poliamida", percent: 13 },
          { fiber: "lana", percent: 9 },
        ],
        grams: 100,
        meters: 280,
      },
    ],
  },
  {
    name: "Lanas Stop",
    slug: "lanas-stop",
    country: "ES",
    yarns: [
      {
        name: "Olaf",
        weight: "bulky",
        fiber: [
          { fiber: "lana", percent: 52 },
          { fiber: "acrilico", percent: 48 },
        ],
        grams: 100,
        meters: 105,
        needles: [6, 7],
      },
    ],
  },
  {
    name: "Hilos Omega",
    slug: "hilos-omega",
    country: "MX",
    yarns: [
      {
        name: "Sinfonía",
        weight: "sport",
        fiber: [ALGODON],
        grams: 100,
        meters: 212,
        needles: [3, 3.5],
      },
      {
        name: "Sinfonía Plus",
        weight: "sport",
        fiber: [ALGODON],
        grams: 100,
        meters: 212,
        needles: [3, 3.5],
      },
      {
        name: "Hilaza Omega N.º 6",
        weight: "fingering",
        fiber: [ALGODON],
        grams: 70,
        meters: 280,
      },
    ],
  },
  {
    name: "TAMM",
    slug: "tamm",
    country: "MX",
    yarns: [
      {
        name: "Alpes",
        weight: "bulky",
        fiber: [ACRILICO],
      },
      {
        name: "Bebé Tamm",
        weight: "fingering",
        fiber: [ACRILICO],
        grams: 50,
        meters: 225,
        needles: [3],
      },
      {
        name: "Bellini",
        weight: "dk",
        fiber: [ACRILICO],
        grams: 100,
      },
    ],
  },
  {
    name: "Revesderecho",
    slug: "revesderecho",
    country: "CL",
    yarns: [
      {
        name: "Colors",
        weight: "dk",
        fiber: [ACRILICO],
      },
      {
        name: "Cotton",
        weight: "fingering",
        fiber: [ALGODON],
      },
      {
        name: "Queen",
        weight: "worsted",
        fiber: [ACRILICO],
      },
    ],
  },
  {
    name: "Modista",
    slug: "modista",
    country: "CL",
    yarns: [
      {
        name: "Diana",
        weight: "fingering",
        fiber: [ALGODON],
        grams: 100,
        meters: 535,
      },
      {
        name: "Diana Moda",
        weight: "sport",
        fiber: [ALGODON],
        grams: 100,
        meters: 295,
      },
    ],
  },
  {
    name: "Tren",
    slug: "tren",
    country: "CO",
    yarns: [
      {
        name: "Hilo Miquita",
        weight: "fingering",
        fiber: [ALGODON],
        grams: 50,
      },
      {
        name: "Hilo Fino Cable",
        weight: "sport",
        fiber: [ALGODON],
        grams: 50,
      },
      {
        name: "Hilo Mollet",
        weight: "worsted",
        fiber: [ALGODON],
        grams: 50,
      },
    ],
  },
  {
    name: "Desenlace",
    slug: "desenlace",
    country: "CO",
    yarns: [
      {
        name: "Hilaza 2 mm #12 algodón recuperado",
        weight: "dk",
        fiber: [ALGODON],
      },
      {
        name: "Hilaza 1,5 mm #8 algodón recuperado",
        weight: "sport",
        fiber: [ALGODON],
      },
      {
        name: "Hilaza 2 mm #12 algodón premium",
        weight: "dk",
        fiber: [ALGODON],
      },
    ],
  },
];

async function main() {
  const db = getDb();
  let brands = 0;
  let yarns = 0;

  for (const seed of BRANDS) {
    const [brand] = await db
      .insert(yarnBrand)
      .values({
        name: seed.name,
        slug: seed.slug,
        country: seed.country,
      })
      .onConflictDoUpdate({
        target: yarnBrand.slug,
        set: { name: seed.name, country: seed.country },
      })
      .returning({ id: yarnBrand.id, slug: yarnBrand.slug });

    if (!brand) {
      throw new Error(`No se pudo sembrar la marca ${seed.name}`);
    }
    brands += 1;

    for (const item of seed.yarns) {
      const slug = slugify(item.name, "lana");
      const [min, max] =
        item.needles === undefined
          ? [null, null]
          : item.needles.length === 1
            ? [item.needles[0], item.needles[0]]
            : item.needles;

      await db
        .insert(yarn)
        .values({
          brandId: brand.id,
          name: item.name,
          slug,
          weight: item.weight,
          fiber: item.fiber,
          grams: item.grams ?? null,
          meters: item.meters ?? null,
          needleMmMin: min,
          needleMmMax: max,
          status: "aprobada",
        })
        .onConflictDoUpdate({
          target: [yarn.brandId, yarn.slug],
          set: {
            name: item.name,
            weight: item.weight,
            fiber: item.fiber,
            grams: item.grams ?? null,
            meters: item.meters ?? null,
            needleMmMin: min,
            needleMmMax: max,
            status: "aprobada",
          },
        });
      yarns += 1;
    }

    console.log(
      `✓ ${seed.name} (${seed.country}): ${seed.yarns.length} lana(s)`,
    );
  }

  // Chequeo suave: si el nombre normalizado de una lana no coincide con su
  // slug guardado, la búsqueda y el índice único van a discrepar.
  const rows = await db
    .select({ name: yarn.name, slug: yarn.slug })
    .from(yarn)
    .where(eq(yarn.status, "aprobada"));
  const mismatched = rows.filter(
    (row) => slugify(row.name, "lana") !== row.slug,
  );
  if (mismatched.length > 0) {
    console.warn(
      "Aviso: hay lanas cuyo slug no coincide con su nombre (revisar):",
      mismatched.map((row) => `${row.slug} ← ${normalizeText(row.name)}`),
    );
  }

  console.log(`Listo: ${brands} marcas y ${yarns} lanas sembradas.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
