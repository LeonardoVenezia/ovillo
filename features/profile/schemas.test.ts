import { describe, expect, it } from "vitest";

import {
  buildProfileLinks,
  onboardingSchema,
  profileLinkValues,
  profileUpdateSchema,
  socialDisplay,
  socialUrl,
  websiteUrl,
} from "./schemas";

describe("socialUrl", () => {
  it("normaliza @, usuario pelado y URL en cada red", () => {
    expect(socialUrl("instagram", "@tucuenta")).toBe(
      "https://instagram.com/tucuenta",
    );
    expect(socialUrl("instagram", "tucuenta")).toBe(
      "https://instagram.com/tucuenta",
    );
    expect(
      socialUrl("instagram", "https://www.instagram.com/tu.cuenta_1/"),
    ).toBe("https://instagram.com/tu.cuenta_1");
    expect(socialUrl("tiktok", "@tucuenta")).toBe(
      "https://tiktok.com/@tucuenta",
    );
    expect(
      socialUrl("tiktok", "https://www.tiktok.com/@tu.cuenta?lang=es"),
    ).toBe("https://tiktok.com/@tu.cuenta");
    expect(socialUrl("facebook", "tu.usuario")).toBe(
      "https://facebook.com/tu.usuario",
    );
    expect(socialUrl("facebook", "https://m.facebook.com/tu.usuario/")).toBe(
      "https://facebook.com/tu.usuario",
    );
    expect(socialUrl("facebook", "fb.com/tu.usuario")).toBe(
      "https://facebook.com/tu.usuario",
    );
    expect(socialUrl("pinterest", "@tucuenta")).toBe(
      "https://pinterest.com/tucuenta",
    );
    expect(socialUrl("pinterest", "https://es.pinterest.com/tucuenta/")).toBe(
      "https://pinterest.com/tucuenta",
    );
  });

  it("rechaza lo que no puede ser un usuario", () => {
    expect(socialUrl("instagram", "")).toBeNull();
    expect(socialUrl("instagram", "@")).toBeNull();
    expect(socialUrl("instagram", "con espacio")).toBeNull();
    expect(socialUrl("instagram", "instagram.com")).toBeNull();
    expect(socialUrl("tiktok", "a")).toBeNull();
    expect(socialUrl("facebook", "ab")).toBeNull();
    expect(socialUrl("facebook", "profile.php")).toBeNull();
    expect(socialUrl("pinterest", "tu.cuenta")).toBeNull();
  });

  it("no confunde enlaces de contenido con perfiles", () => {
    expect(
      socialUrl("instagram", "https://instagram.com/p/ABC123/"),
    ).toBeNull();
    expect(socialUrl("tiktok", "https://tiktok.com/video/123")).toBeNull();
    expect(socialUrl("facebook", "https://facebook.com/groups/123")).toBeNull();
    expect(socialUrl("pinterest", "https://pinterest.com/pin/123/")).toBeNull();
  });
});

describe("socialDisplay", () => {
  it("vuelve de la URL guardada al texto del formulario", () => {
    expect(socialDisplay("instagram", "https://instagram.com/tucuenta")).toBe(
      "@tucuenta",
    );
    expect(socialDisplay("tiktok", "https://tiktok.com/@tucuenta")).toBe(
      "@tucuenta",
    );
    expect(socialDisplay("facebook", "https://facebook.com/tu.usuario")).toBe(
      "tu.usuario",
    );
    expect(socialDisplay("pinterest", "https://pinterest.com/tucuenta")).toBe(
      "tucuenta",
    );
    expect(socialDisplay("instagram", "")).toBe("");
  });
});

describe("websiteUrl", () => {
  it("agrega https:// cuando falta el protocolo", () => {
    expect(websiteUrl("miblog.com.ar")).toBe("https://miblog.com.ar/");
    expect(websiteUrl("http://tejidos.example")).toBe(
      "http://tejidos.example/",
    );
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
    tiktok: "@tucuenta",
    facebook: "tu.usuario",
    pinterest: "tucuenta",
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
      tiktok: "",
      facebook: "",
      pinterest: "",
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
      profileUpdateSchema.safeParse({ ...valid, tiktok: "a" }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ ...valid, facebook: "ab" }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ ...valid, pinterest: "tu.cuenta" })
        .success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({ ...valid, website: "sin-punto" }).success,
    ).toBe(false);
  });
});

describe("buildProfileLinks y profileLinkValues", () => {
  const values = {
    instagram: "@tucuenta",
    tiktok: "",
    facebook: "tu.usuario",
    pinterest: "",
    website: "miblog.com.ar",
  };

  it("arma los enlaces en orden, salteando los vacíos", () => {
    expect(buildProfileLinks(values)).toEqual([
      { kind: "instagram", url: "https://instagram.com/tucuenta" },
      { kind: "facebook", url: "https://facebook.com/tu.usuario" },
      { kind: "web", url: "https://miblog.com.ar/" },
    ]);
  });

  it("devuelve los valores del formulario y vuelve al mismo resultado", () => {
    const links = buildProfileLinks(values);
    expect(profileLinkValues(links)).toEqual({
      ...values,
      website: "https://miblog.com.ar/",
    });
    expect(buildProfileLinks(profileLinkValues(links))).toEqual(links);
  });
});
