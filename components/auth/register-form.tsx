"use client";
import { useEffect, useRef, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TurnstileWidget } from "@/components/auth/turnstile-widget";
import { SERVICE_CATALOG } from "@/lib/service-navigation";
import { registrationHints, SERVICE_DESCRIPTIONS } from "@/lib/registration";

type Values = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmation: string;
  country: string;
  physicalAddress: string;
  city: string;
  postalCode: string;
  serviceKeys: string[];
  consentGiven: boolean;
};
export function RegisterForm({
  initialService,
  account,
}: {
  initialService?: string;
  account?: {
    name: string;
    email: string;
    phone: string | null;
    country: string | null;
    physicalAddress: string | null;
    city: string | null;
    postalCode: string | null;
  };
}) {
  const router = useRouter();
  const { update } = useSession();
  const params = useSearchParams();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const schema: yup.ObjectSchema<Values> = yup.object({
    name: yup
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(120)
      .required(),
    email: yup.string().email("Enter a valid email address").required(),
    phone: yup
      .string()
      .trim()
      .min(5, "Include your country code and phone number")
      .max(40)
      .required(),
    password: account
      ? yup.string().defined()
      : yup
          .string()
          .min(12, "Use at least 12 characters")
          .max(128)
          .matches(/[a-z]/, "Include a lowercase letter")
          .matches(/[A-Z]/, "Include an uppercase letter")
          .matches(/\d/, "Include a number")
          .matches(/[^A-Za-z0-9]/, "Include a symbol")
          .required(),
    confirmation: account
      ? yup.string().defined()
      : yup
          .string()
          .oneOf([yup.ref("password")], "Passwords must match")
          .required("Confirm your password"),
    country: yup
      .string()
      .trim()
      .min(2, "Enter your country")
      .max(120)
      .required(),
    physicalAddress: yup.string().max(1000).defined(),
    city: yup.string().max(120).defined(),
    postalCode: yup.string().max(40).defined(),
    serviceKeys: yup
      .array()
      .of(yup.string().required())
      .min(1, "Choose at least one service")
      .required(),
    consentGiven: yup
      .boolean()
      .oneOf([true], "Please accept the privacy policy and account terms")
      .required(),
  });
  const form = useForm<Values>({
    resolver: yupResolver(schema),
    shouldUnregister: false,
    defaultValues: {
      name: account?.name ?? "",
      email: account?.email ?? "",
      phone: account?.phone ?? "",
      password: "",
      confirmation: "",
      country: account?.country ?? "",
      physicalAddress: account?.physicalAddress ?? "",
      city: account?.city ?? "",
      postalCode: account?.postalCode ?? "",
      serviceKeys: [],
      consentGiven: false,
    },
  });
  const hintsApplied = useRef(false);
  useEffect(() => {
    if (!hintsApplied.current) {
      form.setValue(
        "serviceKeys",
        registrationHints(
          params.get("role"),
          initialService || params.get("service"),
        ),
      );
      hintsApplied.current = true;
    }
  }, [params, initialService, form]);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  const stepFields: (keyof Values)[][] = [
    [
      "name",
      "email",
      "phone",
      ...(!account ? (["password", "confirmation"] as const) : []),
    ],
    ["country", "physicalAddress", "city", "postalCode"],
    ["serviceKeys", "consentGiven"],
  ];
  const submit = async (values: Values) => {
    setBusy(true);
    setError("");
    const { confirmation, password, email, ...details } = values;
    try {
      const response = await fetch(
        account ? "/api/account/onboarding" : "/api/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            account
              ? details
              : { ...details, email, password, turnstileToken: token || null },
          ),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        setError(
          result.error || "Unable to create your account. Please try again.",
        );
        setToken("");
        setCaptchaAttempt((v) => v + 1);
        return;
      }
      if (account) {
        await update();
        window.location.assign("/account");
      } else
        router.replace("/login?verification=pending&callbackUrl=%2Faccount");
    } catch {
      setError(
        "Could not connect. Your details are still here; please try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const field = (
    name: keyof Omit<Values, "serviceKeys" | "consentGiven">,
    label: string,
    type = "text",
    autoComplete?: string,
  ) => (
    <FormField
      key={name}
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input
              {...field}
              type={type}
              autoComplete={autoComplete}
              disabled={busy || (name === "email" && !!account)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (step < 2) {
            if (await form.trigger(stepFields[step], { shouldFocus: true }))
              setStep((v) => v + 1);
          } else await form.handleSubmit(submit)();
        }}
      >
        <ol
          aria-label="Registration progress"
          className="grid grid-cols-3 gap-2 text-xs"
        >
          {["Personal details", "Physical details", "Choose services"].map(
            (label, index) => (
              <li
                key={label}
                aria-current={step === index ? "step" : undefined}
                className={`rounded-lg border p-2 ${index === step ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"}`}
              >
                <span className="block font-semibold">Step {index + 1}</span>
                {label}
              </li>
            ),
          )}
        </ol>
        <h2
          ref={heading}
          tabIndex={-1}
          className="font-display text-lg font-semibold outline-none"
        >
          {
            [
              "Your personal details",
              "Where are you based?",
              "Which services would you like to join?",
            ][step]
          }
        </h2>
        {step === 0 && (
          <div className="space-y-4">
            {field("name", "Full name", "text", "name")}
            {field("email", "Email", "email", "email")}
            {field(
              "phone",
              "Phone number (include country code)",
              "tel",
              "tel",
            )}
            {!account && (
              <>
                {field("password", "Password", "password", "new-password")}
                <p className="text-xs text-muted-foreground">
                  At least 12 characters, including uppercase, lowercase, a
                  number and a symbol.
                </p>
                {field(
                  "confirmation",
                  "Confirm password",
                  "password",
                  "new-password",
                )}
              </>
            )}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Country is required. Other address fields are optional for Basic
              members and required for Professional or Expert membership.
            </p>
            {field("country", "Country", "text", "country-name")}
            {field(
              "physicalAddress",
              "Physical address (optional)",
              "text",
              "street-address",
            )}
            {field("city", "City / town (optional)", "text", "address-level2")}
            {field(
              "postalCode",
              "Postal code (optional)",
              "text",
              "postal-code",
            )}
          </div>
        )}
        {step === 2 && (
          <>
            <FormField
              control={form.control}
              name="serviceKeys"
              render={({ field }) => (
                <FormItem>
                  <fieldset className="space-y-2">
                    <legend className="sr-only">
                      Select one or more services
                    </legend>
                    {SERVICE_CATALOG.map((service) => (
                      <label
                        key={service.id}
                        className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3"
                      >
                        <input
                          type="checkbox"
                          className="mt-1 h-4 w-4 accent-primary"
                          checked={field.value.includes(service.id)}
                          disabled={busy}
                          onChange={(e) =>
                            field.onChange(
                              e.target.checked
                                ? [...field.value, service.id]
                                : field.value.filter((v) => v !== service.id),
                            )
                          }
                        />
                        <span>
                          <span className="block text-sm font-semibold">
                            {service.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {SERVICE_DESCRIPTIONS[service.id]}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              You can change these choices in Accounts. Each service has its own
              setup and access requirements.
            </p>
            <FormField
              control={form.control}
              name="consentGiven"
              render={({ field }) => (
                <FormItem>
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-primary"
                      ref={field.ref}
                      aria-invalid={!!form.formState.errors.consentGiven}
                      checked={field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={busy}
                    />
                    <span>
                      I have read and accept the{" "}
                      <Link
                        href="/terms"
                        target="_blank"
                        className="text-primary underline"
                      >
                        Account Terms
                      </Link>{" "}
                      and{" "}
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="text-primary underline"
                      >
                        Privacy Policy
                      </Link>
                      , and consent to the processing described there.
                    </span>
                  </label>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!account && (
              <TurnstileWidget key={captchaAttempt} onToken={setToken} />
            )}
          </>
        )}
        {stepFields[step].some((name) => form.formState.errors[name]) && (
          <p role="alert" className="text-sm text-destructive">
            Please correct the highlighted fields before continuing.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setStep((v) => v - 1)}
            >
              Back
            </Button>
          )}
          <Button className="flex-1" type="submit" disabled={busy}>
            {busy
              ? "Saving…"
              : step < 2
                ? "Next"
                : account
                  ? "Continue to Accounts"
                  : "Create account"}
          </Button>
        </div>
        {!account &&
          step === 0 &&
          process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true" && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={busy}
              onClick={() => void signIn("google", { callbackUrl: "/hub" })}
            >
              Continue with Google
            </Button>
          )}
        {!account && (
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary underline">
              Sign in
            </Link>
          </p>
        )}
      </form>
    </Form>
  );
}
