import {describe, expect, it} from "vitest";

import {
  makeCompetitionToken,
  makeToken,
  parseCompetitionToken,
  parseToken,
  tokenEvent,
} from "./tickets";

describe("talks tokens", () => {
  it("round-trips a valid token", () => {
    const token = makeToken("s3cret", "workshops", "abc123");
    expect(parseToken("s3cret", token)).toEqual({
      route: "workshops",
      id: "abc123",
    });
  });

  it("handles IDs that contain dots, like an email address", () => {
    const token = makeToken("s3cret", "workshops", "test@email.com");
    expect(parseToken("s3cret", token)).toEqual({
      route: "workshops",
      id: "test@email.com",
    });
  });

  it("rejects tampering, wrong secrets and unknown routes", () => {
    const token = makeToken("s3cret", "workshops", "abc123");
    expect(parseToken("s3cret", token.replace("abc123", "abc124"))).toBeNull();
    expect(parseToken("other", token)).toBeNull();
    expect(parseToken("s3cret", token.replace("workshops", "contacts")))
      .toBeNull();
    expect(parseToken("s3cret", "garbage")).toBeNull();
  });
});

describe("competition tokens", () => {
  it("round-trips, including dotted IDs", () => {
    const token = makeCompetitionToken("s3cret", "test@email.com");
    expect(parseCompetitionToken("s3cret", token)).toEqual({
      id: "test@email.com",
    });
  });

  it("rejects tampering and wrong secrets", () => {
    const token = makeCompetitionToken("s3cret", "abc123");
    expect(parseCompetitionToken("s3cret", token.replace("abc123", "abc124")))
      .toBeNull();
    expect(parseCompetitionToken("other", token)).toBeNull();
  });
});

describe("the two kinds never validate as each other", () => {
  it("a talks token is not a competition token, and vice versa", () => {
    const talks = makeToken("s3cret", "competition", "abc123");
    const comp = makeCompetitionToken("s3cret", "abc123");
    expect(parseCompetitionToken("s3cret", talks)).toBeNull();
    expect(parseToken("s3cret", comp)).toBeNull();
    // Re-labelling the prefix does not help either: the scope is signed.
    expect(parseCompetitionToken("s3cret", talks.replace("QJ.competition.", "QJC.")))
      .toBeNull();
  });

  it("tells the event from the prefix", () => {
    expect(tokenEvent(makeToken("s", "workshops", "a"))).toBe("talks");
    expect(tokenEvent(makeCompetitionToken("s", "a"))).toBe("competition");
    expect(tokenEvent("nope")).toBeNull();
  });
});