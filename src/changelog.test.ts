import { test, expect } from "vitest";

import {
  insertChangelog,
  formatDate,
  generateChangelog,
  generateChangelogGroup,
  generateChangelogPrefix,
  generateChangelogCommit,
  detectMerge,
  mergeGroups,
} from "./changelog";

test("generateChangelog", () => {
  expect(
    generateChangelog(
      "v1.0.0",
      new Date(2021, 1, 1),
      [
        {
          subject: "hoge",
          prefix: "feat",
          group: "web",
          date: new Date(2021, 1, 1),
        },
        {
          subject: "hoge2",
          prefix: "feat",
          group: "web2",
          date: new Date(2021, 1, 1),
        },
        {
          subject: "hoge3",
          prefix: "feat",
          group: "web3",
          date: new Date(2021, 1, 1),
        },
        { subject: "foobar", prefix: "fix", date: new Date() },
        {
          subject: "a",
          prefix: "chore",
          hash: "xxxxxx",
          group: "server",
          date: new Date(2021, 1, 1),
        },
        { subject: "c", prefix: "ci", date: new Date(2021, 1, 1) },
      ],
      {
        prefix: {
          feat: "Feature",
          fix: "Fix",
          ci: false,
        },
        group: {
          server: { title: "Server", url: "foo/bar" },
          web2: "web2",
          web3: { title: "web2" },
        },
      }
    ).split("\n")
  ).toEqual([
    "## v1.0.0 - 2021-02-01",
    "",
    "### Server",
    "",
    "#### chore",
    "",
    "- A `[xxxxxx](https://github.com/foo/bar/commit/xxxxxx)`",
    "",
    "### web2",
    "",
    "#### Feature",
    "",
    "- Hoge2",
    "- Hoge3",
    "",
    "### web",
    "",
    "#### Feature",
    "",
    "- Hoge",
    "",
    "### ",
    "",
    "#### Fix",
    "",
    "- Foobar",
  ]);

  expect(
    generateChangelog(
      "v1.0.0",
      new Date(2021, 1, 1),
      [
        { subject: "hoge", prefix: "feat", date: new Date(2021, 1, 1) },
        { subject: "foobar", prefix: "fix", date: new Date(2021, 1, 1) },
        { subject: "foobar2", prefix: "fix2", date: new Date(2021, 1, 1) },
        { subject: "a", prefix: "chore", date: new Date(2021, 1, 1) },
        { subject: "c", prefix: "ci", date: new Date(2021, 1, 1) },
      ],
      {
        prefix: {
          feat: "Feature",
          fix: { title: "Fix" },
          fix2: "Fix",
          ci: false,
        },
        group: {
          server: "Server",
        },
      }
    ).split("\n")
  ).toEqual([
    "## v1.0.0 - 2021-02-01",
    "",
    "### ",
    "",
    "#### Feature",
    "",
    "- Hoge",
    "",
    "#### Fix",
    "",
    "- Foobar",
    "- Foobar2",
    "",
    "#### chore",
    "",
    "- A",
  ]);

  expect(
    generateChangelog(
      "v1.0.0",
      new Date(2021, 1, 1),
      [
        { subject: "hoge", prefix: "feat", date: new Date(2021, 1, 1) },
        { subject: "foobar", prefix: "fix", date: new Date(2021, 1, 1) },
        { subject: "a", prefix: "chore", date: new Date(2021, 1, 1) },
        { subject: "c", prefix: "ci", date: new Date(2021, 1, 1) },
      ],
      {
        prefix: {
          feat: "Feature",
          fix: "Fix",
          ci: false,
        },
      }
    ).split("\n")
  ).toEqual([
    "## v1.0.0 - 2021-02-01",
    "",
    "### Feature",
    "",
    "- Hoge",
    "",
    "### Fix",
    "",
    "- Foobar",
    "",
    "### chore",
    "",
    "- A",
  ]);
});

test("generateChangelogGroup", () => {
  expect(
    generateChangelogGroup(
      [
        { subject: "hoge", prefix: "feat", date: new Date(2000, 1, 1) },
        { subject: "foobar", prefix: "fix", date: new Date(2000, 1, 1) },
        { subject: "a", prefix: "chore", date: new Date(2000, 1, 1) },
        { subject: "b", date: new Date(2000, 1, 1) },
        { subject: "c", prefix: "ci", date: new Date(2000, 1, 1) },
      ],
      "Group",
      {
        feat: "Feature",
        fix: "Fix",
        ci: false,
      }
    ).split("\n")
  ).toEqual([
    "### Group",
    "",
    "#### Feature",
    "",
    "- Hoge",
    "",
    "#### Fix",
    "",
    "- Foobar",
    "",
    "#### chore",
    "",
    "- A",
  ]);
});

test("generateChangelogPrefix", () => {
  expect(
    generateChangelogPrefix(
      [
        { subject: "foobar", date: new Date(2021, 1, 1) },
        { subject: "hoge", hash: "123456", date: new Date(2021, 2, 1) },
      ],
      "Feature"
    )
  ).toBe(["### Feature", "", "- Hoge `123456`", "- Foobar"].join("\n"));
});

test("generateChangelogCommit", () => {
  expect(
    generateChangelogCommit(
      {
        subject: "hogehoge (#222)",
        hash: "42d7aac9d7b3da115bd11347e0e82c887d5b94e7",
        date: new Date(2021, 1, 1),
      },
      "https://github.com/foo/bar/"
    )
  ).toBe(
    "Hogehoge ([#222](https://github.com/foo/bar/pull/222)) `[42d7aa](https://github.com/foo/bar/commit/42d7aa)`"
  );
  expect(
    generateChangelogCommit({
      subject: "hogehoge (#222)",
      hash: "42d7aa",
      date: new Date(2021, 1, 1),
    })
  ).toBe("Hogehoge (#222) `42d7aa`");
  expect(
    generateChangelogCommit({
      subject: "hogehoge (#222)",
      date: new Date(2021, 1, 1),
    })
  ).toBe("Hogehoge (#222)");
  expect(
    generateChangelogCommit(
      { subject: "hogehoge (#222)", date: new Date(2021, 1, 1) },
      undefined,
      false
    )
  ).toBe("hogehoge (#222)");
});

test("insertChangelog", () => {
  const changelog = `# Changelog

## v1.0.0 - 2022/01/01

- hogehoge

## v0.1.0 - 2021/12/01

- foobar`;
  const inserting = `## v1.1.0 - 2022/02/01

- new version`;
  const want = `# Changelog

## v1.1.0 - 2022/02/01

- new version

## v1.0.0 - 2022/01/01

- hogehoge

## v0.1.0 - 2021/12/01

- foobar`;

  expect(insertChangelog(changelog, inserting)).toBe(want);
  expect(insertChangelog("", "B")).toBe("B");
  expect(insertChangelog("## v1.0.0 - 2022/01/01\n\n-A", "B", "v1.0.0")).toBe(
    "B"
  );
  expect(
    insertChangelog(
      "aaa\n\n## v1.0.0 - 2022/01/01\n\n-A\n\n## v0.1.0",
      "B",
      "v1.0.0"
    )
  ).toBe("aaa\n\nB\n\n## v0.1.0");
});

test("formatDate", () => {
  expect(formatDate(new Date(2021, 5, 1, 1, 0, 1, 0))).toBe("2021-06-01");
  expect(formatDate(new Date(2021, 11, 10))).toBe("2021-12-10");
});

test("detectMerge", () => {
  expect(detectMerge({ a: "a", b: "b" })).toEqual({});
  expect(detectMerge({ a: "a", b: "b", c: "b" })).toEqual({ c: "b" });
  expect(detectMerge({ a: "a", b: "b", c: { title: "b" } })).toEqual({
    c: "b",
  });
  expect(detectMerge({ a: "a", b: "b", c: "b", d: "b" })).toEqual({
    c: "b",
    d: "b",
  });
});

test("mergeGroups", () => {
  expect(mergeGroups({ a: ["a"], b: ["b"] }, { b: "a" })).toEqual({
    a: ["a", "b"],
  });
  expect(mergeGroups({ a: ["a"], b: ["b"] }, { b: "c" })).toEqual({
    a: ["a"],
    c: ["b"],
  });
  expect(mergeGroups({ a: ["a"], b: ["b"] }, {})).toEqual({
    a: ["a"],
    b: ["b"],
  });
});
