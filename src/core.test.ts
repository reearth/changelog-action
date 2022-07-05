import { test, expect } from "vitest";

import { bumpVersion, getBumpFromCommits, parseCommitMessage } from "./core";

test("parseCommitMessage", () => {
  expect(parseCommitMessage("hogehoge")).toEqual({
    subject: "hogehoge",
    breakingChange: false,
  });
  expect(parseCommitMessage("feat(web): hogehoge")).toEqual({
    subject: "hogehoge",
    prefix: "feat",
    scope: "web",
    breakingChange: false,
  });
  expect(parseCommitMessage("fix!: hogehoge")).toEqual({
    subject: "hogehoge",
    prefix: "fix",
    scope: undefined,
    breakingChange: true,
  });
  expect(parseCommitMessage("chore: hogehoge BREAKING CHANGE")).toEqual({
    subject: "hogehoge BREAKING CHANGE",
    prefix: "chore",
    scope: undefined,
    breakingChange: true,
  });
  expect(parseCommitMessage("perf(server)!: hogehoge")).toEqual({
    subject: "hogehoge",
    prefix: "perf",
    scope: "server",
    breakingChange: true,
  });
  expect(parseCommitMessage("perf(server): hogehoge (#123)")).toEqual({
    subject: "hogehoge (#123)",
    prefix: "perf",
    scope: "server",
    pr: "123",
    breakingChange: false,
  });
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
