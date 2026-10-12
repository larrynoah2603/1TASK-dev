export function PermissionMatrix({ rows }: { rows: Array<{ resource: string; read: boolean; create: boolean; update: boolean }> }) {
  return (
    <div className="admin-permission-matrix" role="region" aria-label="Matrice des permissions" tabIndex={0}>
      <table className="admin-permission-table">
        <thead>
          <tr className="admin-permission-head">
            <th scope="col">Ressource</th>
            <th scope="col">Lire</th>
            <th scope="col">Créer</th>
            <th scope="col">Modifier</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.resource}>
              <th scope="row">{row.resource}</th>
              <td aria-label={row.read ? "Autorisé" : "Refusé"}>{row.read ? "Oui" : "—"}</td>
              <td aria-label={row.create ? "Autorisé" : "Refusé"}>{row.create ? "Oui" : "—"}</td>
              <td aria-label={row.update ? "Autorisé" : "Refusé"}>{row.update ? "Oui" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
