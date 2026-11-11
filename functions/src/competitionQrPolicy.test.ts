import {describe, expect, it} from "vitest";

import {competitionQrBlock, surelyNotSent} from "./competitionQrPolicy";

const approved = {status: "accepted", teamId: "qubits"};

describe("competitionQrBlock", () => {
  it("lets an accepted signup with a team through", () => {
    expect(competitionQrBlock(approved, false)).toBeNull();
  });

  it("blocks anyone not exactly accepted, even on resend", () => {
    const statuses =
      [undefined, "", "pending", "Accepted", "approved", "rejected"];
    for (const status of statuses) {
      const data = {...approved, status};
      expect(competitionQrBlock(data, false)).toBe("notApproved");
      expect(competitionQrBlock(data, true)).toBe("notApproved");
    }
  });

  it("blocks a signup without a team, even on resend", () => {
    for (const teamId of [undefined, null, "", "  "]) {
      const data = {...approved, teamId};
      expect(competitionQrBlock(data, false)).toBe("noTeam");
      expect(competitionQrBlock(data, true)).toBe("noTeam");
    }
  });

  it("never sends twice on its own", () => {
    const sent = {...approved, competitionQrSentAt: "2026-11-11T10:00:00Z"};
    const claimed = {
      ...approved,
      competitionQrClaimedAt: "2026-11-11T10:00:00Z",
    };
    expect(competitionQrBlock(sent, false)).toBe("alreadySent");
    expect(competitionQrBlock(claimed, false)).toBe("inProgress");
  });

  it("allows an explicit resend", () => {
    const both = {
      ...approved,
      competitionQrSentAt: "2026-11-11T10:00:00Z",
      competitionQrClaimedAt: "2026-11-11T10:00:00Z",
    };
    expect(competitionQrBlock(both, true)).toBeNull();
  });
});

describe("surelyNotSent", () => {
  it("is true only when the email certainly did not go out", () => {
    expect(surelyNotSent({responseCode: 550})).toBe(true);
    expect(surelyNotSent({responseCode: 421})).toBe(true);
    expect(surelyNotSent({code: "EAUTH"})).toBe(true);
    expect(surelyNotSent({code: "ETIMEDOUT"})).toBe(false);
    expect(surelyNotSent({code: "ECONNECTION"})).toBe(false);
    expect(surelyNotSent(new Error("boom"))).toBe(false);
    expect(surelyNotSent(undefined)).toBe(false);
  });
});
