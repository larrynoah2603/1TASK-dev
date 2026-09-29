import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`kit-input ${className}`.trim()} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`kit-input ${className}`.trim()} {...props} />;
}

/** Libellé + champ + aide, alignés selon l'échelle d'espacement. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="kit-field">
      <span className="kit-label">{label}</span>
      {children}
      {hint ? <span className="kit-hint">{hint}</span> : null}
    </label>
  );
}
