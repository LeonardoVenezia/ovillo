import { describe, expect, it } from "vitest";

import {
  USERNAME_PATTERN,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

const validSignUp = {
  name: "María",
  username: "maria.teje",
  email: "maria@ejemplo.com",
  password: "tejerlindo",
  acceptTerms: true,
};

describe("USERNAME_PATTERN", () => {
  it("acepta letras, números, puntos y guiones bajos", () => {
    expect(USERNAME_PATTERN.test("maria")).toBe(true);
    expect(USERNAME_PATTERN.test("maria.teje_2")).toBe(true);
    expect(USERNAME_PATTERN.test("MariA")).toBe(true);
  });

  it("rechaza separadores al borde y caracteres raros", () => {
    expect(USERNAME_PATTERN.test("maria.")).toBe(false);
    expect(USERNAME_PATTERN.test("_maria")).toBe(false);
    expect(USERNAME_PATTERN.test("con espacio")).toBe(false);
    expect(USERNAME_PATTERN.test("maría")).toBe(false);
    expect(USERNAME_PATTERN.test("ab")).toBe(false);
    expect(USERNAME_PATTERN.test("a".repeat(31))).toBe(false);
  });
});

describe("signUpSchema", () => {
  it("acepta datos válidos", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it("rechaza emails incompletos", () => {
    expect(
      signUpSchema.safeParse({ ...validSignUp, email: "maria@" }).success,
    ).toBe(false);
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    expect(
      signUpSchema.safeParse({ ...validSignUp, password: "corta" }).success,
    ).toBe(false);
  });

  it("exige aceptar las normas", () => {
    const result = signUpSchema.safeParse({
      ...validSignUp,
      acceptTerms: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("signInSchema", () => {
  it("exige identificador y contraseña", () => {
    expect(signInSchema.safeParse({ identifier: "", password: "" }).success).toBe(
      false,
    );
    expect(
      signInSchema.safeParse({ identifier: "@maria", password: "abc" }).success,
    ).toBe(true);
  });
});

describe("resetPasswordSchema", () => {
  it("rechaza contraseñas distintas marcando el segundo campo", () => {
    const result = resetPasswordSchema.safeParse({
      password: "unanueva1",
      confirm: "otradistinta",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["confirm"]);
    }
  });

  it("acepta cuando coinciden", () => {
    expect(
      resetPasswordSchema.safeParse({
        password: "unanueva1",
        confirm: "unanueva1",
      }).success,
    ).toBe(true);
  });
});
