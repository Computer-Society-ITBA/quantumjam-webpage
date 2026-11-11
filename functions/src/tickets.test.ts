import {describe, expect, it} from "vitest";

import {makeCompetitionToken, parseCompetitionToken} from "./tickets";

describe("competition tokens", () => {
  it("round-trips, including dotted IDs", () => {
    const token = makeCompetitionToken("s3cret", "test@email.com");
    expect(parseCompetitionToken("s3cret", token)).toEqual({
      id: "test@email.com",
    });
  });

  it("rejects tampering, wrong secrets and other formats", () => {
    const token = makeCompetitionToken("s3cret", "abc123");
    expect(parseCompetitionToken("s3cret", token.replace("abc123", "abc124")))
      .toBeNull();
    expect(parseCompetitionToken("other", token)).toBeNull();
    expect(parseCompetitionToken("s3cret", "garbage")).toBeNull();
    expect(parseCompetitionToken("s3cret", "QJ.competition.abc123.sig"))
      .toBeNull();
  });
});
