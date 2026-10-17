import { describe, expect, it } from "vitest";

import {
  instagramHandleFromUrl,
  instagramUrl,
  onboardingSchema,
  profileUpdateSchema,
  websiteUrl,
} from "./schemas";

describe("instagramUrl", () => {
  it("normaliza el arroba, el usuario pelado y la URL completa", () => {
    expect(instagramUrl("@tucuenta")).toBe("https://instagram.com/tucuenta");
    expect(instagramUrl("tucuenta")).toBe("https://instagram.com/tucuenta");
    expect(instagramUrl("https://www.instagram.com/tu.cuenta_1/")).toBe(
      "https://instagram.com/tu.cuenta_1",
    );
  });

  it("rechaza lo que no puede ser un usuario", () => {
    expect(instagramUrl("")).toBeNull();
    expect(instagramUrl("@")).toBeNull();
    expect(instagramUrl("con espacio")).toBeNull();
    expect(instagramUrl("usuario!raro")).toBeNull();
  });
});

describe("instagramHandleFromUrl", () => {
  it("vuelve de la URL guardada al @usuario", () => {
    expect(instagramHandleFromUrl("https://instagram.com/tucuenta")).toBe(
      "@tucuenta",
    );
    expect(instagramHandleFromUrl("")).toBe("");
  });
});

describe("websiteUrl", () => {
  it("agrega https:// cuando falta el protocolo", () => {
    expect(websiteUrl("miblog.com.ar")).toBe("https://miblog.com.ar/");
    expect(websiteUrl("http://tejidos.example")).toBe("http://tejidos.example/");
  });

  it("rechaza textos que no son enlaces", () => {
    expect(websiteUrl("")).toBeNull();
    expect(websiteUrl("sinespacios")).toBeNull();
    expect(websiteUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("onboardingSchema", () => {
  const valid = {
    crafts: ["dos-agujas", "crochet"],
    skillLevel: "intermediate",
    country: "AR",
    location: "Rosario, Santa Fe",
  };

  it("acepta un onboarding completo", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("pide al menos una técnica", () => {
    const result = onboardingSchema.safeParse({ ...valid, crafts: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza nivel o país que no existen", () => {
    expect(
      onboardingSchema.safeParse({ ...valid, skillLevel: "experta" }).success,
    ).toBe(false);
    expect(
      onboardingSchema.safeParse({ ...valid, country: "XX" }).success,
    ).toBe(false);
  });
});

describe("profileUpdateSchema", () => {
  const valid = {
    bio: "Tejo sobre todo medias.",
    location: "Montevideo",
    country: "UY",
    crafts: ["crochet"],
    skillLevel: "beginner",
    instagram: "@tucuenta",
    website: "miblog.com.ar",
    visibility: "publico",
  };

  it("acepta un perfil completo", () => {
    expect(profileUpdateSchema.safeParse(valid).success).toBe(true);
  });

  it("permite dejar país, nivel y enlaces vacíos", () => {
    const result = profileUpdateSchema.safeParse({
      ...valid,
      country: "",
      skillLevel: "",
      instagram: "",
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("limita el largo de la bio y la ubicación", () => {
    expect(
      profileUpdateSchema.safeParse({ ...valid, bio: "a".repeat(161) }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ ...valid, location: "a".repeat(81) })
        .success,
    ).toBe(false);
  });

  it("rechaza enlaces con formato inválido", () => {
    expect(
      profileUpdateSchema.safeParse({ ...valid, instagram: "@@malo" }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ ...valid, website: "sin-punto" })
        .success,
    ).toBe(false);
  });
});
