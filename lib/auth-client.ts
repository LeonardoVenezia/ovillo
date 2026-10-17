import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/** Cliente de Better Auth para componentes del navegador (spec §5.1). */
export const authClient = createAuthClient({
  plugins: [usernameClient()],
});
