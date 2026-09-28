import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={`ds-input ${className}`.trim()} {...props} />; }
export function SearchInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) { return <label className={`ds-search-input ${className}`.trim()}><Search aria-hidden="true" className="size-4" /><input type="search" {...props} /></label>; }
