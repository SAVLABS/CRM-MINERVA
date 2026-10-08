'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({
  children,
  pendingText = 'Procesando…',
}: {
  children: React.ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-minerva-red px-4 py-2.5 text-sm font-semibold text-minerva-white transition-colors hover:bg-minerva-red-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-minerva-red disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: { error?: string; ok?: string } }) {
  if (!state.error && !state.ok) return null;
  const isError = Boolean(state.error);
  return (
    <div
      role="alert"
      className={`rounded-md border px-3 py-2 text-sm ${
        isError
          ? 'border-minerva-red bg-red-50 text-minerva-red-dark'
          : 'border-neutral-300 bg-neutral-50 text-neutral-800'
      }`}
    >
      {state.error ?? state.ok}
    </div>
  );
}

const control =
  'w-full rounded-md border border-neutral-300 bg-minerva-white px-3 py-2 text-sm text-minerva-black outline-none transition-colors placeholder:text-neutral-400 focus:border-minerva-red focus:ring-2 focus:ring-minerva-red/20 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500';

const labelClass = 'mb-1.5 block text-sm font-medium text-neutral-800';

export function Field({
  label,
  name,
  type = 'text',
  autoComplete,
  required = true,
  defaultValue,
  placeholder,
  disabled = false,
  hint,
  options,
  maxLength,
  inputMode,
  value,
  onChange,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  /** Sugerencias mostradas al desplegar; el valor escrito siempre se acepta. */
  options?: string[];
  maxLength?: number;
  /** `numeric`/`decimal` en teclado móvil para precios e impuestos. */
  inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email' | 'url';
  /** Con `value` el input queda controlado; sirve para valores dependientes. */
  value?: string;
  onChange?: (value: string) => void;
}) {
  const listId = options ? `${name}-sugerencias` : undefined;
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        list={listId}
        maxLength={maxLength}
        inputMode={inputMode}
        autoComplete={autoComplete}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        placeholder={placeholder}
        disabled={disabled}
        className={control}
      />
      {options && (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>
      )}
      {hint && <span className="mt-1 block text-xs text-minerva-muted">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  required = true,
  disabled = false,
  hint,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  /** Con `value` el select queda controlado; sirve para opciones dependientes. */
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <select
        name={name}
        required={required}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        disabled={disabled}
        className={control}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-minerva-muted">{hint}</span>}
    </label>
  );
}

export function TextareaField({
  label,
  name,
  defaultValue,
  rows = 3,
  disabled = false,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea
        name={name}
        rows={rows}
        defaultValue={defaultValue}
        disabled={disabled}
        className={control}
      />
      {hint && <span className="mt-1 block text-xs text-minerva-muted">{hint}</span>}
    </label>
  );
}

/**
 * Casilla de confirmación destructiva. No usa el checkbox nativo porque el
 * usuario tiene que leer qué está a punto de pasar.
 */
export function DangerCheck({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border border-minerva-red bg-red-50 p-3">
      <input
        type="checkbox"
        name="confirm"
        required
        className="mt-0.5 h-4 w-4 shrink-0 accent-minerva-red"
      />
      <span>
        <span className="block text-sm font-semibold text-minerva-red-dark">{label}</span>
        <span className="block text-xs text-neutral-700">{description}</span>
      </span>
    </label>
  );
}

export function Button({
  children,
  variant = 'secondary',
  type = 'button',
  className = '',
  name,
  value,
  disabled = false,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  type?: 'button' | 'submit';
  className?: string;
  /** `name`/`value` permiten varios botones submit con distinto valor. */
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const variants = {
    primary:
      'bg-minerva-red text-minerva-white hover:bg-minerva-red-dark border-transparent',
    secondary:
      'bg-minerva-white text-neutral-800 hover:border-minerva-red hover:text-minerva-red border-minerva-border',
    danger:
      'bg-minerva-white text-minerva-red hover:bg-minerva-red hover:text-minerva-white border-minerva-red',
  };
  return (
    <button
      type={type}
      name={name}
      value={value}
      disabled={disabled}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-minerva-red disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
