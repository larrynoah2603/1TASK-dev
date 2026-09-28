import { ProfileMenu } from "@/components/profile-menu";

export type UserMenuProps = { name: string; email: string; image?: string | null; department: string; roles: string; admin?: boolean };

export function UserMenu(props: UserMenuProps) { return <ProfileMenu {...props} />; }
