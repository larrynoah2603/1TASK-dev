"use client";

import { FormEvent, useMemo, useState } from "react";
import { Combobox } from "@/components/combobox";
import { useToast } from "@/components/toast-provider";

type Organization = { id: string; code: string; name: string; isActive: boolean };
type Holiday = { id: string; date: Date | string; name: string };
type Calendar = {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organization: Organization;
  timezone: string;
  workingDays: number[];
  workdayStartMinute: number;
  workdayEndMinute: number;
  isActive: boolean;
  holidays: Holiday[];
};

const weekdays = [
  { value: 1, label: "Lun" },
  { value: 2, label: "Mar" },
  { value: 3, label: "Mer" },
  { value: 4, label: "Jeu" },
  { value: 5, label: "Ven" },
  { value: 6, label: "Sam" },
  { value: 7, label: "Dim" },
];

function minuteToTime(value: number) {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function timeToMinute(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field-label"><span>{label}</span>{children}</label>;
}

export function AdminCalendarConfiguration({ organizations, calendars }: { organizations: Organization[]; calendars: Calendar[] }) {
  const { toast } = useToast();
  const [organizationMessage, setOrganizationMessage] = useState("");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [holidayMessage, setHolidayMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [editingCalendarId, setEditingCalendarId] = useState("");
  const [calendarOrganizationId, setCalendarOrganizationId] = useState(organizations[0]?.id ?? "");
  const [selectedHolidayCalendarId, setSelectedHolidayCalendarId] = useState(calendars[0]?.id ?? "");
  const effectiveHolidayCalendarId = selectedHolidayCalendarId || calendars[0]?.id || "";
  const selectedCalendar = useMemo(() => calendars.find((calendar) => calendar.id === effectiveHolidayCalendarId) ?? null, [calendars, effectiveHolidayCalendarId]);

  async function post(path: string, method: string, payload: Record<string, unknown>, messageSetter: (message: string) => void, success: string) {
    setBusy(path);
    messageSetter("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "La modification a été refusée.");
      messageSetter(success);
      toast(success);
      window.location.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "La modification n’a pas pu être enregistrée.";
      messageSetter(message);
      toast(message, "error");
    } finally {
      setBusy("");
    }
  }

  function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    void post("/api/admin/organizations", "POST", {
      code: String(new FormData(form).get("code") ?? ""),
      name: String(new FormData(form).get("name") ?? ""),
      isActive: true,
      reason: String(new FormData(form).get("reason") ?? ""),
    }, setOrganizationMessage, "Organisation enregistrée et auditée.");
  }

  function submitCalendar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const selectedDays = Array.from(form.querySelectorAll<HTMLInputElement>("input[name=workingDay]:checked"), (input) => Number(input.value));
    const payload = {
      code: String(data.get("code") ?? ""),
      name: String(data.get("name") ?? ""),
      organizationId: String(data.get("organizationId") ?? ""),
      timezone: String(data.get("timezone") ?? ""),
      workingDays: selectedDays,
      workdayStartMinute: timeToMinute(String(data.get("workdayStart") ?? "08:00")),
      workdayEndMinute: timeToMinute(String(data.get("workdayEnd") ?? "17:00")),
      isActive: true,
      reason: String(data.get("reason") ?? ""),
    };
    const path = editingCalendarId ? `/api/admin/calendars/${editingCalendarId}` : "/api/admin/calendars";
    void post(path, editingCalendarId ? "PATCH" : "POST", payload, setCalendarMessage, editingCalendarId ? "Calendrier mis à jour et audité." : "Calendrier enregistré et audité.");
  }

  function selectCalendar(calendarId: string, form: HTMLFormElement) {
    setEditingCalendarId(calendarId);
    const calendar = calendars.find((item) => item.id === calendarId);
    if (!calendar) {
      setCalendarOrganizationId(organizations[0]?.id ?? "");
      form.reset();
      return;
    }
    setCalendarOrganizationId(calendar.organizationId);
    for (const [name, value] of Object.entries({ code: calendar.code, name: calendar.name, timezone: calendar.timezone, workdayStart: minuteToTime(calendar.workdayStartMinute), workdayEnd: minuteToTime(calendar.workdayEndMinute) })) {
      const input = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
      if (input) input.value = String(value);
    }
    for (const checkbox of Array.from(form.querySelectorAll<HTMLInputElement>("input[name=workingDay]"))) checkbox.checked = calendar.workingDays.includes(Number(checkbox.value));
  }

  function submitHoliday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedCalendar) return;
    const data = new FormData(event.currentTarget);
    void post(`/api/admin/calendars/${selectedCalendar.id}/holidays`, "POST", {
      date: String(data.get("date") ?? ""),
      name: String(data.get("holidayName") ?? ""),
      reason: String(data.get("holidayReason") ?? ""),
    }, setHolidayMessage, "Jour férié ajouté et audité.");
  }

  return (
    <div className="calendar-admin-workspace">
      <div className="calendar-admin-intro">
        <div>
          <p className="eyebrow">Gouvernance du temps</p>
          <h3>Calendriers de service par organisation</h3>
          <p>Chaque SLA utilise un calendrier explicite. Les tickets existants conservent leurs échéances ; les nouveaux calculs tiennent compte des horaires et jours fériés actifs.</p>
        </div>
        <div className="calendar-admin-rule"><span className="calendar-admin-rule-dot" />Les changements sont journalisés</div>
      </div>

      <div className="calendar-admin-grid">
        <section className="calendar-admin-form-block">
          <div className="calendar-admin-block-heading"><span className="calendar-admin-index">01</span><div><h4>Organisation</h4><p>Définissez le périmètre de gouvernance.</p></div></div>
          <form onSubmit={submitOrganization} className="calendar-admin-form">
            <Field label="Code"><input name="code" required className="field-control" placeholder="BIOS-MADA" /></Field>
            <Field label="Nom"><input name="name" required className="field-control" placeholder="BIOS Expertise Madagascar" /></Field>
            <Field label="Motif d’audit"><input name="reason" required minLength={10} className="field-control" placeholder="Motif de création…" /></Field>
            <button disabled={busy === "/api/admin/organizations"} className="button-secondary">{busy === "/api/admin/organizations" ? "Enregistrement…" : "Ajouter l’organisation"}</button>
          </form>
          {organizationMessage ? <p className="calendar-admin-message" role="status">{organizationMessage}</p> : null}
          <div className="calendar-admin-list">{organizations.map((organization) => <div key={organization.id} className="calendar-admin-list-row"><span className="calendar-admin-code">{organization.code}</span><span>{organization.name}</span><span className={organization.isActive ? "calendar-admin-active" : "calendar-admin-inactive"}>{organization.isActive ? "Active" : "Inactive"}</span></div>)}</div>
        </section>

        <section className="calendar-admin-form-block">
          <div className="calendar-admin-block-heading"><span className="calendar-admin-index">02</span><div><h4>{editingCalendarId ? "Modifier le calendrier" : "Horaires ouvrés"}</h4><p>Un fuseau, une plage et des jours clairement affichés.</p></div></div>
          <form data-calendar-form="true" onSubmit={submitCalendar} className="calendar-admin-form">
            <Field label="Calendrier existant"><Combobox value={editingCalendarId} onChange={(value) => { const form = document.querySelector<HTMLFormElement>("form[data-calendar-form]"); if (form) selectCalendar(value, form); }} options={[{ value: "", label: "Nouveau calendrier" }, ...calendars.map((calendar) => ({ value: calendar.id, label: `${calendar.organization.code} · ${calendar.name}` }))]} /></Field>
            <div className="contents">
              <Field label="Organisation"><Combobox name="organizationId" value={calendarOrganizationId} onChange={setCalendarOrganizationId} required options={[{ value: "", label: "Sélectionner" }, ...organizations.filter((organization) => organization.isActive).map((organization) => ({ value: organization.id, label: `${organization.code} · ${organization.name}` }))]} /></Field>
              <Field label="Code"><input name="code" required className="field-control" placeholder="BIOS-MADA-OUVRE" /></Field>
              <Field label="Nom"><input name="name" required className="field-control" placeholder="Horaires ouvrés Madagascar" /></Field>
              <Field label="Fuseau horaire"><input name="timezone" required className="field-control" defaultValue="Indian/Antananarivo" /></Field>
              <Field label="Ouverture"><input name="workdayStart" required type="time" className="field-control" defaultValue="08:00" /></Field>
              <Field label="Fermeture"><input name="workdayEnd" required type="time" className="field-control" defaultValue="17:00" /></Field>
              <fieldset className="calendar-admin-days"><legend>Jours travaillés</legend><div>{weekdays.map((day) => <label key={day.value}><input type="checkbox" name="workingDay" value={day.value} defaultChecked={day.value <= 5} /><span>{day.label}</span></label>)}</div></fieldset>
              <Field label="Motif d’audit"><input name="reason" required minLength={10} className="field-control" placeholder="Motif de configuration…" /></Field>
              <button disabled={Boolean(busy)} className="button-primary">{busy ? "Enregistrement…" : editingCalendarId ? "Enregistrer le calendrier" : "Créer le calendrier"}</button>
            </div>
          </form>
          {calendarMessage ? <p className="calendar-admin-message" role="status">{calendarMessage}</p> : null}
        </section>
      </div>

      <section className="calendar-admin-holidays">
        <div className="calendar-admin-block-heading"><span className="calendar-admin-index">03</span><div><h4>Jours fériés et fermetures</h4><p>Les échéances en mode ouvré ignorent ces dates pour le calendrier sélectionné.</p></div></div>
        <div className="calendar-admin-holiday-layout">
          <div>
            <Field label="Calendrier à compléter"><Combobox value={selectedCalendar?.id ?? ""} onChange={setSelectedHolidayCalendarId} options={calendars.map((calendar) => ({ value: calendar.id, label: `${calendar.organization.code} · ${calendar.name}` }))} /></Field>
            <form onSubmit={submitHoliday} className="calendar-admin-holiday-form">
              <Field label="Date"><input name="date" required type="date" className="field-control" /></Field>
              <Field label="Libellé"><input name="holidayName" required className="field-control" placeholder="Fête nationale" /></Field>
              <Field label="Motif d’audit"><input name="holidayReason" required minLength={10} className="field-control" placeholder="Motif de fermeture…" /></Field>
              <button disabled={!selectedCalendar || Boolean(busy)} className="button-secondary">Ajouter la date</button>
            </form>
            {holidayMessage ? <p className="calendar-admin-message" role="status">{holidayMessage}</p> : null}
          </div>
          <div className="calendar-admin-holiday-list">
            <div className="calendar-admin-list-caption">{selectedCalendar ? `${selectedCalendar.name} · ${selectedCalendar.holidays.length} date(s)` : "Aucun calendrier"}</div>
            {selectedCalendar?.holidays.map((holiday) => <div key={holiday.id} className="calendar-admin-holiday-row"><time dateTime={new Date(holiday.date).toISOString().slice(0, 10)}>{formatDate(holiday.date)}</time><span>{holiday.name}</span></div>)}
            {!selectedCalendar?.holidays.length ? <p className="calendar-admin-empty">Aucune fermeture ajoutée.</p> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
