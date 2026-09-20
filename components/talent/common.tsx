"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useSWR from "swr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { uploadAsset, type UploadPurposeValue } from "@/lib/client-upload";
import { talentLabel } from "@/lib/pax-labels";
import { cn } from "@/lib/utils";

export async function api(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<any> {
  const response = await fetch(
    path.startsWith("/api/") ? path : `/api/talent/${path}`,
    {
      method,
      ...(body !== undefined
        ? {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "Unable to complete this request");
  return result;
}
export const reportError = (error: unknown) =>
  toast.error(
    error instanceof Error ? error.message : "Unable to complete this request",
  );
export const splitTags = (value: unknown) =>
  String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
export const formatTalentDate = (value: string) =>
  new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
export function Panel({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        {children}
      </CardContent>
    </Card>
  );
}
export function Loading({ error }: { error?: Error }) {
  return (
    <Panel>
      <p
        role={error ? "alert" : "status"}
        className="text-sm text-muted-foreground"
      >
        {error?.message || "Loading…"}
      </p>
    </Panel>
  );
}
export function Action({
  children,
  onAction,
  variant = "outline",
  disabled = false,
}: {
  children: React.ReactNode;
  onAction: () => Promise<unknown>;
  variant?: "outline" | "default" | "ghost" | "destructive";
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant={variant}
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onAction();
        } catch (error) {
          reportError(error);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Working…" : children}
    </Button>
  );
}
export type FieldSpec = {
  name: string;
  label: string;
  type?:
    | "text"
    | "textarea"
    | "email"
    | "password"
    | "number"
    | "datetime-local"
    | "select"
    | "checkbox";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  className?: string;
};
export const options = (values: readonly string[]) =>
  values.map((value) => ({ value, label: talentLabel(value) }));
export function TalentForm({
  fields,
  defaults,
  onSave,
  submitLabel = "Save",
  children,
  layout = "form",
}: {
  fields: FieldSpec[];
  defaults: Record<string, any>;
  onSave: (values: any) => Promise<unknown>;
  submitLabel?: string;
  children?: React.ReactNode;
  layout?: "form" | "toolbar";
}) {
  const shape: Record<string, yup.AnySchema> = {};
  for (const field of fields)
    shape[field.name] =
      field.type === "checkbox"
        ? field.required
          ? yup.boolean().oneOf([true], "Please confirm").required()
          : yup.boolean()
        : field.required
          ? yup.string().required(`${field.label} is required`)
          : yup.string().nullable();
  const form = useForm<Record<string, any>>({
    defaultValues: defaults,
    resolver: yupResolver(yup.object(shape)),
  });
  return (
    <Form {...form}>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSave(values);
          } catch (error) {
            reportError(error);
          }
        })}
      >
        <div
          className={
            layout === "toolbar"
              ? "grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-12"
              : "grid gap-4 sm:grid-cols-2"
          }
        >
          {fields.map((spec) => (
            <FormField
              key={spec.name}
              control={form.control}
              name={spec.name}
              render={({ field }) => (
                <FormItem
                  className={cn(
                    spec.type === "textarea" || spec.type === "checkbox"
                      ? "sm:col-span-2"
                      : "",
                    layout === "toolbar" && "min-w-0 space-y-1",
                    spec.className,
                  )}
                >
                  <FormLabel
                    className={
                      layout === "toolbar"
                        ? "text-xs text-muted-foreground"
                        : undefined
                    }
                  >
                    {spec.label}
                  </FormLabel>
                  <FormControl>
                    {spec.type === "select" ? (
                      <select
                        {...field}
                        value={String(field.value || "")}
                        className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {spec.options?.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : spec.type === "textarea" ? (
                      <Textarea
                        {...field}
                        value={String(field.value || "")}
                        rows={4}
                      />
                    ) : spec.type === "checkbox" ? (
                      <input
                        ref={field.ref}
                        type="checkbox"
                        checked={Boolean(field.value)}
                        onChange={(e) => field.onChange(e.target.checked)}
                        className="ml-3 h-4 w-4 accent-primary"
                      />
                    ) : (
                      <Input
                        {...field}
                        value={String(field.value ?? "")}
                        type={spec.type || "text"}
                      />
                    )}
                  </FormControl>
                  {spec.hint && (
                    <p className="text-xs text-muted-foreground">{spec.hint}</p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          {layout === "toolbar" && (
            <Button
              type="submit"
              className="w-full xl:col-span-2"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Searching…" : submitLabel}
            </Button>
          )}
        </div>
        {children}
        {layout === "form" && (
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : submitLabel}
          </Button>
        )}
      </form>
    </Form>
  );
}
export function UploadPicker({
  label,
  purpose,
  value,
  onChange,
  accept,
}: {
  label: string;
  purpose: UploadPurposeValue;
  value: string | null;
  onChange: (id: string | null) => void;
  accept: string;
}) {
  const [busy, setBusy] = useState(false);
  const { data } = useSWR(value ? `assets/${value}` : null, api, {
    refreshInterval: 3000,
  });
  const asset = data?.assets?.[0];
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <label className="block text-sm font-medium">
        {label}
        <Input
          className="mt-2"
          type="file"
          accept={accept}
          disabled={busy}
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const result = await uploadAsset(file, purpose);
              onChange(result.assetId);
              toast.success(
                result.status === "CLEAN"
                  ? "Document ready"
                  : "Uploaded. Security scanning is in progress.",
              );
            } catch (error) {
              reportError(error);
            } finally {
              setBusy(false);
              event.target.value = "";
            }
          }}
        />
      </label>
      <p className="text-xs text-muted-foreground">
        {busy
          ? "Uploading…"
          : asset
            ? `${asset.originalFileName} · ${talentLabel(asset.status)}`
            : value
              ? "Checking document…"
              : "No file selected"}
      </p>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(null)}
        >
          Remove selection
        </Button>
      )}
    </div>
  );
}
export function RecordEditor({
  label,
  records,
  onChange,
  fields,
}: {
  label: string;
  records: Record<string, string>[];
  onChange: (rows: Record<string, string>[]) => void;
  fields: { key: string; label: string }[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold">{label}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...records,
              Object.fromEntries(fields.map((f) => [f.key, ""])),
            ])
          }
        >
          Add {label.toLowerCase()}
        </Button>
      </div>
      {records.map((record, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"
        >
          {fields.map((field) => (
            <label
              key={field.key}
              className={
                field.key === "description"
                  ? "text-sm sm:col-span-2"
                  : "text-sm"
              }
            >
              {field.label}
              {field.key === "description" ? (
                <Textarea
                  value={record[field.key] || ""}
                  onChange={(e) =>
                    onChange(
                      records.map((row, i) =>
                        i === index
                          ? { ...row, [field.key]: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
              ) : (
                <Input
                  value={record[field.key] || ""}
                  onChange={(e) =>
                    onChange(
                      records.map((row, i) =>
                        i === index
                          ? { ...row, [field.key]: e.target.value }
                          : row,
                      ),
                    )
                  }
                />
              )}
            </label>
          ))}
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(records.filter((_, i) => i !== index))}
          >
            Remove entry
          </Button>
        </div>
      ))}
    </section>
  );
}
