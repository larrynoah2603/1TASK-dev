import Image from "next/image";

function initials(name: string) { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "1T"; }
export function Avatar({ name, src, size = "md", status }: { name: string; src?: string | null; size?: "sm" | "md" | "lg"; status?: "online" | "away" | "offline" }) { const pixels = size === "sm" ? 28 : size === "lg" ? 48 : 36; return <span className={`ds-avatar ds-avatar-${size}`} title={name}>{src ? <Image src={src} alt="" width={pixels} height={pixels} unoptimized /> : initials(name)}{status ? <span className={`ds-avatar-status ds-avatar-status-${status}`} aria-label={status} /> : null}</span>; }
