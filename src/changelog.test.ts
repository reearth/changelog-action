import { test, expect } from "vitest";

import {
  insertChangelog,
  formatDate,
  generateChangelog,
  generateChangelogGroup,
  generateChangelogPrefix,
  generateChangelogCommit,
  trimPrefixAndGroup,
  detectMerge,
  mergeGroups,
} from "./changelog";

test("generateChangelog", () => {
  expect(
    generateChangelog(
      "v1.0.0",
      new Date(2021, 1, 1),
      [
        { subject: "hoge", prefix: "feat", group: "web" },
        { subject: "foobar", prefix: "fix" },
        { subject: "a", prefix: "chore", hash: "xxxxxx", group: "server" },
        { subject: "c", prefix: "ci" },
      ],
      {
        prefix: {
          feat: "Feature",
          fix: "Fix",
          ci: false,
        },
        group: {
          server: { title: "Server", url: "foo/bar" },
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
    "- a `[xxxxxx](https://github.com/foo/bar/commit/xxxxxx)`",
    "",
    "### web",
    "",
    "#### Feature",
    "",
    "- hoge",
    "",
    "### ",
    "",
    "#### Fix",
    "",
    "- foobar",
  ]);

  expect(
    generateChangelog(
      "v1.0.0",
      new Date(2021, 1, 1),
      [
        { subject: "hoge", prefix: "feat" },
        { subject: "foobar", prefix: "fix" },
        { subject: "a", prefix: "chore" },
        { subject: "c", prefix: "ci" },
      ],
      {
        prefix: {
          feat: "Feature",
          fix: "Fix",
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
    "- hoge",
    "",
    "#### Fix",
    "",
    "- foobar",
    "",
    "#### chore",
    "",
    "- a",
  ]);

  expect(
    generateChangelog(
      "v1.0.0",
      new Date(2021, 1, 1),
      [
        { subject: "hoge", prefix: "feat" },
        { subject: "foobar", prefix: "fix" },
        { subject: "a", prefix: "chore" },
        { subject: "c", prefix: "ci" },
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
    "- hoge",
    "",
    "### Fix",
    "",
    "- foobar",
    "",
    "### chore",
    "",
    "- a",
  ]);
});

test("generateChangelogGroup", () => {
  expect(
    generateChangelogGroup(
      [
        { subject: "hoge", prefix: "feat" },
        { subject: "foobar", prefix: "fix" },
        { subject: "a", prefix: "chore" },
        { subject: "b" },
        { subject: "c", prefix: "ci" },
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
    "- hoge",
    "",
    "#### Fix",
    "",
    "- foobar",
    "",
    "#### chore",
    "",
    "- a",
  ]);
});

test("generateChangelogPrefix", () => {
  expect(
    generateChangelogPrefix(
      [{ subject: "hoge", hash: "123456" }, { subject: "foobar" }],
      "Feature"
    )
  ).toBe(["### Feature", "", "- hoge `123456`", "- foobar"].join("\n"));
});

test("generateChangelogCommit", () => {
  expect(
    generateChangelogCommit(
      {
        subject: "chore: hogehoge (#222)",
        hash: "42d7aac9d7b3da115bd11347e0e82c887d5b94e7",
      },
      "https://github.com/foo/bar/"
    )
  ).toBe(
    "hogehoge ([#222](https://github.com/foo/bar/pull/222)) `[42d7aa](https://github.com/foo/bar/commit/42d7aa)`"
  );
  expect(
    generateChangelogCommit(
      {
        subject: "chore(web): hogehoge (#222)",
        hash: "42d7aac9d7b3da115bd11347e0e82c887d5b94e7",
      },
      "foo/bar"
    )
  ).toBe(
    "hogehoge ([#222](https://github.com/foo/bar/pull/222)) `[42d7aa](https://github.com/foo/bar/commit/42d7aa)`"
  );
  expect(
    generateChangelogCommit({
      subject: "hogehoge (#222)",
      hash: "42d7aac9d7b3da115bd11347e0e82c887d5b94e7",
    })
  ).toBe("hogehoge (#222) `42d7aa`");
  expect(generateChangelogCommit({ subject: "hogehoge (#222)" })).toBe(
    "hogehoge (#222)"
  );
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

test("trimPrefixAndGroup", () => {
  expect(trimPrefixAndGroup("feat(web): a")).toBe("a");
  expect(trimPrefixAndGroup("feat: a")).toBe("a");
  expect(trimPrefixAndGroup("a")).toBe("a");
});

test("detectMerge", () => {
  expect(detectMerge({ a: "a", b: "b" })).toEqual({});
  expect(detectMerge({ a: "a", b: "b", c: "b" })).toEqual({ c: "b" });
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
