import { describe, expect, it } from "vitest";

import { buildPasswordResetEmail, buildVerificationEmail } from "./email";

describe("buildVerificationEmail", () => {
  const url = "https://ovillo.test/api/auth/verify-email?token=abc123";

  it("incluye el enlace en html y texto", () => {
    const email = buildVerificationEmail({ name: "María", url });
    expect(email.subject).toContain("Confirmá tu email");
    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
    expect(email.text).toContain("María");
  });

  it("escapa el nombre para que no inyecte HTML", () => {
    const email = buildVerificationEmail({
      name: "<script>alert(1)</script>",
      url,
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("buildPasswordResetEmail", () => {
  const url = "https://ovillo.test/restablecer?token=xyz789";

  it("incluye el enlace de restablecimiento", () => {
    const email = buildPasswordResetEmail({ name: "Leo", url });
    expect(email.subject).toContain("contraseña");
    expect(email.html).toContain(url);
    expect(email.text).toContain(url);
  });
});
