"use client";
import { useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { TalentForm, api } from "./common";

export function TalentRegister() {
  const [token, setToken] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const receiveToken = useCallback((value: string) => setToken(value), []);
  if (submitted)
    return (
      <div className="space-y-3">
        <p>
          Check your email to verify your PAX account. Then sign in to complete
          your career profile.
        </p>
        <Link
          className="text-primary underline"
          href="/login?callbackUrl=/talent/profile"
        >
          Sign in
        </Link>
      </div>
    );
  return (
    <TalentForm
      defaults={{
        name: "",
        email: "",
        password: "",
        country: "KE",
        consentGiven: false,
      }}
      fields={[
        { name: "name", label: "Full name", required: true },
        {
          name: "email",
          label: "Email address",
          type: "email",
          required: true,
        },
        {
          name: "password",
          label: "Password",
          type: "password",
          required: true,
          hint: "At least 12 characters, including upper and lower case letters, a number and a symbol.",
        },
        { name: "country", label: "Country code", required: true },
        {
          name: "consentGiven",
          label: "I agree to the PAX account terms and privacy policy.",
          type: "checkbox",
          required: true,
        },
      ]}
      submitLabel="Create PAX account"
      onSave={async (values) => {
        await api("/api/signup", "POST", {
          ...values,
          country: values.country.toUpperCase(),
          role: "MEMBER",
          additionalRoles: [],
          talentOnboarding: true,
          turnstileToken: token || null,
        });
        toast.success("Check your email for verification instructions");
        setSubmitted(true);
      }}
    >
      <p className="text-sm text-muted-foreground">
        Talent is free for the health ecosystem. You do not need a clinical
        licence or paid membership to apply for jobs.
      </p>
      <div className="flex gap-4 text-sm">
        <Link href="/terms" className="text-primary underline">
          Account terms
        </Link>
        <Link href="/privacy" className="text-primary underline">
          Privacy policy
        </Link>
      </div>
      <TurnstileWidget onToken={receiveToken} />
    </TalentForm>
  );
}
