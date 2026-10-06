import Image from "next/image";

export default function AppLoading() {
  return (
    <div
      className="bios-loading-page"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Chargement de l'application"
    >
      <div className="bios-loading-content">
        <div className="bios-loading-logo-wrapper">
          <div className="bios-loading-glow" />

          <Image
            src="/brand/BIOS-HAUTE-QUALITE%20(1).png"
            alt="BIOS Expertise"
            width={509}
            height={218}
            priority
            sizes="(max-width: 480px) 78vw, 330px"
            className="bios-loading-logo"
          />
        </div>

        <div className="bios-loading-progress">
          <div className="bios-loading-progress-bar" />
        </div>

        <div className="bios-loading-status">
          <span className="bios-loading-dot" />
          <span>Chargement de votre espace</span>
          <span className="bios-loading-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </div>
      </div>
    </div>
  );
}
