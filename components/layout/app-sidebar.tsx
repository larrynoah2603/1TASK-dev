import type { ReactNode } from "react";

/** Presentational frame for the permission-filtered application navigation. */
export function AppSidebar({ brand, navigation, user }: { brand: ReactNode; navigation: ReactNode; user: ReactNode }) {
  return <>{brand}{navigation}{user}</>;
}
