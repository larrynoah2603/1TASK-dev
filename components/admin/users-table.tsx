import { AdminUserActions } from "@/components/admin-user-actions";

export function UsersTable({ users, options }: { users: Parameters<typeof AdminUserActions>[0]["user"][]; options: Parameters<typeof AdminUserActions>[0]["options"] }) {
  return <div className="admin-entity-table">{users.map((user) => <AdminUserActions key={user.id} user={user} options={options} />)}</div>;
}
