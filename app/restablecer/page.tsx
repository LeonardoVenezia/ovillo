import type { Metadata } from "next";
import { Suspense } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.auth.reset.title,
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {es.auth.reset.title}
          </CardTitle>
          <CardDescription>{es.auth.reset.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* El formulario lee el token del enlace → Suspense. */}
          <Suspense fallback={<Skeleton className="h-52 w-full" />}>
            <ResetPasswordForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
