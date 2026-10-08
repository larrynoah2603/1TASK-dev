"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type ComboboxOption = { value: string; label: string };

type ComboboxProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: ComboboxOption[];
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onChange?: (value: string) => void;
};

export function Combobox({
  id,
  name,
  value,
  defaultValue = "",
  options,
  placeholder = "Sélectionner…",
  className = "",
  required = false,
  disabled = false,
  ariaLabel,
  onChange,
}: ComboboxProps) {
  const generatedId = useId();
  const triggerId = id ?? `combobox-${generatedId.replace(/:/g, "")}`;
  const listboxId = `${triggerId}-listbox`;
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const selectedValue = isControlled ? value : internalValue;
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(() => Math.max(0, options.findIndex((option) => option.value === selectedValue)));
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = useMemo(() => options.find((option) => option.value === selectedValue), [options, selectedValue]);

  useEffect(() => {
    if (isControlled) return;
    const form = wrapperRef.current?.closest("form");
    if (!form) return;
    const resetValue = () => setInternalValue(defaultValue);
    form.addEventListener("reset", resetValue);
    return () => form.removeEventListener("reset", resetValue);
  }, [defaultValue, isControlled]);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(option: ComboboxOption) {
    if (!isControlled) setInternalValue(option.value);
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function openAndHighlight(nextIndex?: number) {
    if (disabled) return;
    setOpen(true);
    setHighlightedIndex(nextIndex ?? Math.max(0, options.findIndex((option) => option.value === selectedValue)));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const current = Math.max(0, options.findIndex((option) => option.value === selectedValue));
      openAndHighlight(open ? Math.min(options.length - 1, highlightedIndex + 1) : current);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      const current = Math.max(0, options.findIndex((option) => option.value === selectedValue));
      openAndHighlight(open ? Math.max(0, highlightedIndex - 1) : current);
    } else if (event.key === "Home") {
      event.preventDefault();
      openAndHighlight(0);
    } else if (event.key === "End") {
      event.preventDefault();
      openAndHighlight(Math.max(0, options.length - 1));
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      const option = options[highlightedIndex];
      if (option) choose(option);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openAndHighlight();
    }
  }

  return (
    <div ref={wrapperRef} className={`combobox ${className}`} data-open={open ? "true" : "false"}>
      {name ? <input className="combobox-value-input" type="text" name={name} value={selectedValue} readOnly required={required} tabIndex={-1} aria-hidden="true" /> : null}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        className="combobox-trigger field-control"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={open && options[highlightedIndex] ? `${listboxId}-option-${highlightedIndex}` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openAndHighlight()}
        onKeyDown={handleKeyDown}
      >
        <span className={selectedOption ? "combobox-value" : "combobox-placeholder"}>{selectedOption?.label ?? placeholder}</span>
        <svg className="combobox-chevron" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" /></svg>
      </button>
      {open ? (
        <div id={listboxId} className="combobox-listbox" role="listbox" aria-label={ariaLabel ?? placeholder}>
          {options.map((option, index) => (
            <button
              key={option.value || `empty-${index}`}
              id={`${listboxId}-option-${index}`}
              type="button"
              role="option"
              aria-selected={option.value === selectedValue}
              className={`combobox-option ${index === highlightedIndex ? "combobox-option-highlighted" : ""} ${option.value === selectedValue ? "combobox-option-selected" : ""}`}
              onMouseEnter={() => setHighlightedIndex(index)}
              onClick={() => choose(option)}
            >
              <span>{option.label}</span>
              {option.value === selectedValue ? <span className="combobox-check" aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
