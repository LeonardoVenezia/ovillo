import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { es } from "@/messages/es";

export const metadata: Metadata = {
  title: es.auth.forgot.title,
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md py-10">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-xl">
            {es.auth.forgot.title}
          </CardTitle>
          <CardDescription>{es.auth.forgot.subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
