import { PageLoading } from "@/components/ui/loading/page-loading";

export default function AdminLoading() {
  return <div aria-busy="true" aria-live="polite"><PageLoading label="Chargement de la console d’administration" /></div>;
}
