import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ secret: "" }));

vi.mock("@/lib/env", () => ({
  readServerEnvironment: () => ({ CRON_SECRET: state.secret }),
}));

import { getJobAuthorizationFailure } from "@/lib/job-auth";

describe("authentification des jobs planifiés", () => {
  beforeEach(() => {
    state.secret = "scheduler-secret-for-tests";
  });

  it("refuse l’exécution lorsque le secret serveur est absent", () => {
    state.secret = "";
    expect(getJobAuthorizationFailure(new Request("http://localhost/job"))).toMatchObject({
      status: 503,
    });
  });

  it("distingue header absent, schéma invalide et bearer incorrect", () => {
    expect(getJobAuthorizationFailure(new Request("http://localhost/job"))).toMatchObject({
      status: 401,
    });
    expect(getJobAuthorizationFailure(new Request("http://localhost/job", {
      headers: { authorization: "Basic scheduler-secret-for-tests" },
    }))).toMatchObject({ status: 403 });
    expect(getJobAuthorizationFailure(new Request("http://localhost/job", {
      headers: { authorization: "Bearer wrong-secret" },
    }))).toMatchObject({ status: 403 });
  });

  it("accepte uniquement le bearer exact", () => {
    expect(getJobAuthorizationFailure(new Request("http://localhost/job", {
      headers: { authorization: "Bearer scheduler-secret-for-tests" },
    }))).toBeNull();
  });
});
