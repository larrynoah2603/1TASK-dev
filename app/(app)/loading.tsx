import { PageLoading } from "@/components/ui/loading/page-loading";

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

          <img
            src="/brand/bios-expertise.png"
            alt="BIOS Expertise"
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
