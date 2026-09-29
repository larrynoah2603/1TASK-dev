import Image from "next/image";

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "1T";
}

/** Avatar rond : photo si disponible, sinon initiales. `status` ajoute un point de présence. */
export function Avatar({ name, image, size = "md", status = false, className = "" }: { name: string; image?: string | null; size?: "sm" | "md" | "lg"; status?: boolean; className?: string }) {
  const sizeClass = size === "sm" ? " kit-avatar-sm" : size === "lg" ? " kit-avatar-lg" : "";
  const px = size === "sm" ? 24 : size === "lg" ? 40 : 32;
  return (
    <span className={`kit-avatar${sizeClass}${status ? " kit-avatar-status" : ""} ${className}`.trim()} title={name}>
      {image ? <Image src={image} alt="" width={px} height={px} unoptimized /> : initials(name)}
    </span>
  );
}
