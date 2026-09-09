'use client';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export type PracticeField = { name: string; label: string; type?: string; required?: boolean; value?: string; options?: { value: string; label: string }[] };

/** Shared accessible form presentation for practice tools; validation also runs server-side. */
export function PracticeForm({ fields, submitLabel, onSubmit, disabled = false }: { fields: PracticeField[]; submitLabel: string; onSubmit: (values: Record<string, string>) => Promise<void>; disabled?: boolean }) {
  const schema = useMemo(() => yup.object(Object.fromEntries(fields.map((field) => {
    let rule = yup.string().defined().default('');
    if (field.required) rule = rule.required(`${field.label} is required`);
    if (field.type === 'email') rule = rule.email('Enter a valid email');
    return [field.name, rule];
  }))), [fields]);
  const form = useForm<Record<string, string>>({ resolver: yupResolver(schema), defaultValues: Object.fromEntries(fields.map((field) => [field.name, field.value ?? ''])) });
  return <Form {...form}><form className="space-y-4" onSubmit={form.handleSubmit(async (values) => {
    try { await onSubmit(values); } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save'); }
  })}>
    <div className="grid gap-4 sm:grid-cols-2">{fields.map((definition) => <FormField key={definition.name} control={form.control} name={definition.name} render={({ field }) => <FormItem>
      <FormLabel>{definition.label}{definition.required ? ' *' : ''}</FormLabel>
      <FormControl>{definition.options ? <select {...field} disabled={disabled} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option value="">Select…</option>{definition.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select> : definition.type === 'textarea' ? <Textarea {...field} disabled={disabled} /> : <Input {...field} disabled={disabled} type={definition.type ?? 'text'} />}</FormControl>
      <FormMessage />
    </FormItem>} />)}</div>
    <Button type="submit" disabled={disabled || form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
  </form></Form>;
}

export async function practiceFetch<T = any>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to load');
  return data;
}

export async function practiceSend<T = any>(url: string, body: unknown, method = 'POST'): Promise<T> {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Unable to save');
  return data;
}
