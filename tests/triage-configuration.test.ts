import { describe, expect, it, vi } from "vitest";
import {
  assertOperationalGlobalTriage,
  provisionDepartmentTriage,
  TriageConfigurationError,
  triageResourceCodes,
} from "@/lib/triage-configuration";

const activeConfiguration = {
  defaultTriageSla: { id: "sla-1", isActive: true, calendar: { isActive: true } },
};
const department = { id: "department-1", code: "FIN", name: "Finance", isActive: true };

function transactionMock() {
  return {
    v1Configuration: { findUnique: vi.fn().mockResolvedValue(activeConfiguration) },
    queue: {
      findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      create: vi.fn().mockResolvedValue({ id: "queue-1" }),
      update: vi.fn(),
    },
    serviceCatalogItem: {
      findUnique: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null),
      create: vi.fn().mockResolvedValue({ id: "service-1" }),
      update: vi.fn(),
    },
  };
}

describe("infrastructure TRIAGE V1", () => {
  it("crée une file et un service internes avec des codes stables indépendants du renommage", async () => {
    const tx = transactionMock();
    await provisionDepartmentTriage(tx as never, department);
    expect(triageResourceCodes(department.id)).toEqual({
      queueCode: "V1-TRIAGE-Q-department-1",
      serviceCode: "V1-TRIAGE-S-department-1",
    });
    expect(tx.queue.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      provisionedTriageDepartmentId: department.id,
      autoAssignment: false,
    }) });
    expect(tx.serviceCatalogItem.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      provisionedTriageDepartmentId: department.id,
      queueId: "queue-1",
      slaId: "sla-1",
    }) });
  });

  it("échoue avant toute création si le SLA/calendrier par défaut manque", async () => {
    const tx = transactionMock();
    tx.v1Configuration.findUnique.mockResolvedValue(null);
    await expect(provisionDepartmentTriage(tx as never, department)).rejects.toThrow(TriageConfigurationError);
    expect(tx.queue.create).not.toHaveBeenCalled();
    expect(tx.serviceCatalogItem.create).not.toHaveBeenCalled();
  });

  it("refuse de réutiliser un code réservé appartenant à une file métier", async () => {
    const tx = transactionMock();
    tx.queue.findUnique.mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "business-queue" });
    await expect(provisionDepartmentTriage(tx as never, department)).rejects.toThrow(/code réservé/);
    expect(tx.queue.create).not.toHaveBeenCalled();
  });

  it("renvoie une erreur de configuration claire sans destination globale opérationnelle", async () => {
    const tx = { v1Configuration: { findUnique: vi.fn().mockResolvedValue({ globalTriageService: null }) } };
    await expect(assertOperationalGlobalTriage(tx as never)).rejects.toThrow(/triage global V1 n’est pas configuré/);
  });
});
