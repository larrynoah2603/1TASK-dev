"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "1T";
}

export function ProfileMenu({ name, email, image, department, roles, admin }: { name: string; email: string; image?: string | null; department: string; roles: string; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (open && ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="profile-trigger" aria-expanded={open} aria-haspopup="menu">
        <span className="profile-avatar-wrap"><span className="profile-avatar">{image ? <img src={image} alt="" className="profile-avatar-image" /> : initials(name)}</span><span className="profile-status-dot" aria-hidden="true" /></span>
        <span className="profile-compact-label hidden min-w-0 text-left xl:block"><span className="block max-w-[150px] truncate text-xs font-semibold text-slate-800">{name}</span><span className="mt-0.5 block max-w-[180px] truncate text-[10px] text-slate-500">{department}</span></span>
        <span aria-hidden="true" className="profile-chevron hidden text-slate-400 sm:block"><svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5" /></svg></span>
      </button>
      {open ? (
        <div className="popover-panel right-0 w-72" role="menu">
          <div className="border-b border-slate-100 pb-3"><p className="text-sm font-bold text-slate-900">{name}</p><p className="mt-1 break-all text-xs text-slate-500">{email}</p><p className="mt-1 text-[11px] text-slate-400">{roles}</p></div>
          <div className="mt-3 grid gap-1">
            <Link href="/profile" onClick={() => setOpen(false)} className="menu-link" role="menuitem">Mon profil</Link>
            {admin ? <Link href="/admin" onClick={() => setOpen(false)} className="menu-link" role="menuitem">Console d’administration</Link> : null}
            <Link href="/api/auth/signout" className="menu-link menu-link-danger" role="menuitem">Se déconnecter</Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
