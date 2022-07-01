import { test, expect } from "vitest";

import {
  bumpVersion,
  getBumpFromCommits,
  parseCommitMessage,
  trimPrefixAndGroup,
} from "./core";

test("parseCommitMessage", () => {
  expect(parseCommitMessage("feat(web): hogehoge")).toEqual({
    prefix: "feat",
    group: "web",
    breakingChange: false,
  });
  expect(parseCommitMessage("fix!: hogehoge")).toEqual({
    prefix: "fix",
    group: undefined,
    breakingChange: true,
  });
  expect(parseCommitMessage("chore: hogehoge BREAKING CHANGE")).toEqual({
    prefix: "chore",
    group: undefined,
    breakingChange: true,
  });
  expect(parseCommitMessage("perf(server)!: hogehoge")).toEqual({
    prefix: "perf",
    group: "server",
    breakingChange: true,
  });
});

test("trimPrefixAndGroup", () => {
  expect(trimPrefixAndGroup("feat(web): a")).toBe("a");
  expect(trimPrefixAndGroup("feat: a")).toBe("a");
  expect(trimPrefixAndGroup("a")).toBe("a");
});

test("getBumpFromCommits", () => {
  expect(
    getBumpFromCommits([
      { prefix: "fix", date: new Date(), subject: "foo" },
      { prefix: "chore", date: new Date(), subject: "foo" },
    ])
  ).toBe("patch");
  expect(
    getBumpFromCommits(
      [
        {
          prefix: "feat",
          date: new Date(),
          subject: "foo",
        },
      ],
      ["XXX"]
    )
  ).toBe("patch");
  expect(
    getBumpFromCommits([
      { prefix: "fix", date: new Date(), subject: "foo" },
      {
        prefix: "feat",
        date: new Date(),
        subject: "foo",
      },
    ])
  ).toBe("minor");
  expect(
    getBumpFromCommits(
      [
        {
          prefix: "XXX",
          date: new Date(),
          subject: "foo",
        },
      ],
      ["XXX"]
    )
  ).toBe("minor");
  expect(
    getBumpFromCommits([
      { prefix: "fix", date: new Date(), subject: "foo" },
      {
        prefix: "feat",
        date: new Date(),
        subject: "foo",
        breakingChange: true,
      },
    ])
  ).toBe("major");
});

test("bumpVersion", () => {
  expect(bumpVersion("1.1.1", "major")).toBe("2.0.0");
  expect(bumpVersion("v1.1.1", "minor")).toBe("v1.2.0");
  expect(bumpVersion("v1.1.1", "v1.1.2")).toBe("v1.1.2");
  expect(bumpVersion("v1.1.1", "1.1.2")).toBe("v1.1.2");
});
