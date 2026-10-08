"use client";

import type { ButtonHTMLAttributes } from "react";
import { Icon } from "@/components/ui/icons";

type DeleteIconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "type" | "aria-label" | "title"> & {
  label: string;
};

export function DeleteIconButton({ label, className = "", ...props }: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`button-danger button-icon ${className}`.trim()}
      {...props}
    >
      <Icon name="trash" className="size-4" />
    </button>
  );
}
