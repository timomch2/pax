"use client";
import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { api, Panel, Action, TalentForm } from "./common";

export function AccountSecurity({
  mfaEnabled,
  hasPassword,
}: {
  mfaEnabled: boolean;
  hasPassword: boolean;
}) {
  const [setup, setSetup] = useState<{ secret: string; uri: string } | null>(
    null,
  );
  const [codes, setCodes] = useState<string[]>([]);
  return (
    <div className="space-y-5">
      <Panel title="Account security">
        <p className="text-sm">
          Your PAX account signs you in across Talent, Practice and the main
          platform. Product access remains separate.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/forgot-password" className="text-primary underline">
            Reset password
          </Link>
          <a href="/api/privacy/export" className="text-primary underline">
            Download my account data
          </a>
        </div>
        <Action
          onAction={async () => {
            await api("/api/auth/sessions/revoke-all", "POST", {});
            await signOut({
              callbackUrl: new URL("/login", window.location.href).href,
            });
          }}
        >
          Sign out everywhere
        </Action>
        <Action
          onAction={() =>
            signOut({
              callbackUrl: new URL("/login", window.location.href).href,
            })
          }
        >
          Sign out of this browser
        </Action>
      </Panel>
      <Panel title="Two-factor authentication">
        {codes.length ? (
          <>
            <p className="text-sm">
              Save these recovery codes in a safe place. They are displayed only
              now. Existing sessions have been revoked; sign in again using your
              authenticator.
            </p>
            <div className="grid gap-2 font-mono sm:grid-cols-2">
              {codes.map((code) => (
                <span key={code}>{code}</span>
              ))}
            </div>
            <Link href="/login" className="text-primary underline">
              Sign in again
            </Link>
          </>
        ) : !hasPassword ? (
          <p className="text-sm">
            Your account uses Google sign-in. Manage two-factor authentication
            in your Google account.
          </p>
        ) : mfaEnabled ? (
          <TalentForm
            defaults={{ password: "", code: "" }}
            fields={[
              {
                name: "password",
                label: "Current password",
                type: "password",
                required: true,
              },
              {
                name: "code",
                label: "Authenticator or recovery code",
                required: true,
              },
            ]}
            submitLabel="Disable two-factor authentication"
            onSave={async (values) => {
              await api("/api/auth/mfa/disable", "POST", values);
              await signOut({
                callbackUrl: new URL("/login", window.location.href).href,
              });
            }}
          />
        ) : setup ? (
          <>
            <p className="text-sm">
              Add this setup key to your authenticator app, then enter its
              six-digit code below.
            </p>
            <Input
              readOnly
              value={setup.secret}
              aria-label="Authenticator setup key"
            />
            <TalentForm
              defaults={{ code: "" }}
              fields={[
                {
                  name: "code",
                  label: "Six-digit authenticator code",
                  required: true,
                },
              ]}
              submitLabel="Confirm two-factor authentication"
              onSave={async (values) => {
                const result = await api(
                  "/api/auth/mfa/confirm",
                  "POST",
                  values,
                );
                setCodes(result.recoveryCodes);
                setSetup(null);
              }}
            />
          </>
        ) : (
          <TalentForm
            defaults={{ password: "" }}
            fields={[
              {
                name: "password",
                label: "Confirm current password",
                type: "password",
                required: true,
              },
            ]}
            submitLabel="Set up two-factor authentication"
            onSave={async (values) =>
              setSetup(await api("/api/auth/mfa/setup", "POST", values))
            }
          />
        )}
      </Panel>
    </div>
  );
}
