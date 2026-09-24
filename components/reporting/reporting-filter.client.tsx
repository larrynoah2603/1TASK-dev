"use client";

import { useState } from "react";

const periods = ["Aujourd’hui", "7 jours", "30 jours", "Personnalisé"];

export function ReportingFilterClient() {
  const [period, setPeriod] = useState("30 jours");
  const [department, setDepartment] = useState("Tous les départements");
  const [team, setTeam] = useState("Toutes les équipes");
  const [service, setService] = useState("Tous les services");

  return (
    <div className="reporting-filter-client" aria-label="Filtres du reporting">
      <label><span>Période</span><select value={period} onChange={(event) => setPeriod(event.target.value)}>{periods.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label><span>Département</span><select value={department} onChange={(event) => setDepartment(event.target.value)}><option>Tous les départements</option></select></label>
      <label><span>Équipe</span><select value={team} onChange={(event) => setTeam(event.target.value)}><option>Toutes les équipes</option></select></label>
      <label><span>Service</span><select value={service} onChange={(event) => setService(event.target.value)}><option>Tous les services</option></select></label>
    </div>
  );
}
