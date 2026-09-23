import { PageLoading } from "@/components/ui/loading/page-loading";

export default function AppLoading() {
  return <div aria-busy="true" aria-live="polite"><PageLoading label="Chargement de votre périmètre autorisé" /></div>;
}
