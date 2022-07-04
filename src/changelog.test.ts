import { test, expect } from "vitest";

import {
  insertChangelog,
  generateChangelog,
  generateChangelogGroup,
  generateChangelogPrefix,
  generateChangelogCommit,
  detectMerge,
  mergeGroups,
  fixMarkdownLinkedCode,
  prLinks,
  hashLinks,
  findVersionSection,
} from "./changelog";

test("generateChangelog", () => {
  expect(
    generateChangelog(
      "1.0.0",
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
          server: { title: "Server", repo: "foo/bar" },
          web2: "web2",
          web3: { title: "web2" },
        },
      }
    )[0].split("\n")
  ).toEqual([
    "## 1.0.0 - 2021-02-01",
    "",
    "### Server",
    "",
    "#### chore",
    "",
    "- A [`xxxxxx`](https://github.com/foo/bar/commit/xxxxxx)",
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
        versionTemplate: "## {{versionWithoutPrefix}} - {{date}}",
      }
    )[0].split("\n")
  ).toEqual([
    "## 1.0.0 - 2021-02-01",
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
      "1.0.0",
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
        versionTemplate: "## {{versionWithPrefix}} - {{date}}",
      }
    )[0].split("\n")
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

  expect(generateChangelog("1.0.0", new Date(2021, 1, 1), [])).toEqual([
    "## 1.0.0 - 2021-02-01\n",
    "",
    "2021-02-01",
  ]);
});

test("generateChangelogGroup", () => {
  expect(
    generateChangelogGroup({
      commits: [
        { subject: "hoge", prefix: "feat", date: new Date(2000, 1, 1) },
        { subject: "foobar", prefix: "fix", date: new Date(2000, 1, 1) },
        { subject: "foobar", prefix: "fix", date: new Date(2000, 1, 1) },
        { subject: "a", prefix: "chore", date: new Date(2000, 1, 1) },
        { subject: "b", date: new Date(2000, 1, 1) },
        { subject: "c", prefix: "ci", date: new Date(2000, 1, 1) },
      ],
      group: true,
      groupName: "group",
      groupTitle: "Group",
      prefix: {
        feat: "Feature",
        fix: "Fix",
        ci: false,
      },
    }).split("\n")
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
  expect(
    generateChangelogGroup({
      commits: [
        { subject: "foobar", prefix: "fix", date: new Date(2000, 1, 1) },
        { subject: "foobar", prefix: "fix", date: new Date(2000, 1, 1) },
      ],
      group: true,
      groupName: "group",
      groupTitle: "Group",
      prefix: {},
      dedupSameMessages: false,
    }).split("\n")
  ).toEqual(["### Group", "", "#### fix", "", "- Foobar", "- Foobar"]);
});

test("generateChangelogPrefix", () => {
  expect(
    generateChangelogPrefix({
      commits: [
        { subject: "foobar", date: new Date(2021, 1, 1) },
        { subject: "hoge", hash: "123456", date: new Date(2021, 2, 1) },
      ],
      title: "Feature",
    })
  ).toBe(["### Feature", "", "- Hoge `123456`", "- Foobar"].join("\n"));
});

test("prLinks", () => {
  expect(prLinks("xxx #112 _", "xxx")).toBe("xxx [#112](xxx/pull/112) _");
  expect(prLinks("xxx [#112](aaa) _", "xxx")).toBe("xxx [#112](aaa) _");
});

test("hashLinks", () => {
  expect(hashLinks("xxx a23da9xxxxxxx _ a23da9", "a23da9xxxxxxx", "aaa")).toBe(
    "xxx [a23da9xxxxxxx](aaa/commit/a23da9) _ [a23da9](aaa/commit/a23da9)"
  );
});

test("fixMarkdownLinkedCode", () => {
  expect(fixMarkdownLinkedCode("xxx `[aaa](bbb)`")).toBe("xxx [`aaa`](bbb)");
});

test("generateChangelogCommit", () => {
  expect(
    generateChangelogCommit({
      commit: {
        subject: "hogehoge (#222)",
        hash: "42d7aac9d7b3da115bd11347e0e82c887d5b94e7",
        date: new Date(2021, 1, 1),
      },
      repo: "https://github.com/foo/bar/",
    })
  ).toEqual(
    "- Hogehoge ([#222](https://github.com/foo/bar/pull/222)) [`42d7aa`](https://github.com/foo/bar/commit/42d7aa)"
  );
  expect(
    generateChangelogCommit({
      commit: {
        subject: "hogehoge (#222)",
        hash: "42d7aa",
        date: new Date(2021, 1, 1),
      },
    })
  ).toEqual("- Hogehoge (#222) `42d7aa`");
  expect(
    generateChangelogCommit({
      commit: {
        subject: "hogehoge (#222)",
        date: new Date(2021, 1, 1),
      },
    })
  ).toEqual("- Hogehoge (#222)");
  expect(
    generateChangelogCommit({
      commit: { subject: "hogehoge (#222)", date: new Date(2021, 1, 1) },
      capitalizeFirstLetter: false,
    })
  ).toEqual("- hogehoge (#222)");
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
      "aaa\n\n## 1.0.0 - 2022/01/01\n\n- A\n\n## v0.1.0 - 2021/01/01",
      "B",
      "v1.0.0"
    )
  ).toBe("aaa\n\nB\n\n## v0.1.0 - 2021/01/01");
  expect(
    insertChangelog(
      "All notable changes to this project will be documented in this file.",
      "B",
      "v1.0.0"
    )
  ).toBe(
    "All notable changes to this project will be documented in this file.\n\nB"
  );
  expect(
    insertChangelog(
      "All notable changes to this project will be documented in this file.\n\n## 1.0.0 - 2022/01/01\n\n- a",
      "## Unreleased\n\n- b",
      "unreleased"
    )
  ).toBe(
    "All notable changes to this project will be documented in this file.\n\n## Unreleased\n\n- b\n\n## 1.0.0 - 2022/01/01\n\n- a"
  );
  expect(
    insertChangelog(
      "All notable changes to this project will be documented in this file.\n\n## Unreleased\n\n- b\n\n## 1.0.0 - 2022/01/01\n\n- a",
      "## Unreleased\n\n- c",
      "unreleased"
    )
  ).toBe(
    "All notable changes to this project will be documented in this file.\n\n## Unreleased\n\n- c\n\n## 1.0.0 - 2022/01/01\n\n- a"
  );
  expect(
    insertChangelog(
      "All notable changes to this project will be documented in this file.\n\n## Unreleased\n\n- b\n\n## 1.0.0 - 2022/01/01\n\n- a",
      "## 1.1.0\n\n- c",
      "1.1.0"
    )
  ).toBe(
    "All notable changes to this project will be documented in this file.\n\n## 1.1.0\n\n- c\n\n## 1.0.0 - 2022/01/01\n\n- a"
  );
});

test("findVersionSection", () => {
  expect(
    findVersionSection("# v1\n\naaa\n\n# v2\n\nbbb", undefined, "# {{version}}")
  ).toEqual([0, 0]);
  expect(findVersionSection("___\n\n## 1.0.0 - 2022/01/01\n\n- a")).toEqual([
    5, 5,
  ]);
  expect(
    findVersionSection("# v1\n\naaa\n\n# v2\n\nbbb", "1", "# {{version}}")
  ).toEqual([0, 11]);
  expect(
    findVersionSection("# v1\n\naaa\n\n# v2\n\nbbb", "v2", "# {{version}}")
  ).toEqual([11, null]);
  expect(
    findVersionSection("___\n\n## Unreleased\n\n- a", "unreleased")
  ).toEqual([5, null]);
  expect(
    findVersionSection(
      "___\n\n## Unreleased\n\n- a\n\n## v1.0.0 - 2021/01/01",
      "unreleased"
    )
  ).toEqual([5, 25]);
  expect(
    findVersionSection(
      "aaa\n\n# [Unreleased]\n\naaa\n\n# [v2]\n\nbbb",
      "unreleased",
      "# [{{#unreleased}}Unreleased{{/unreleased}}{{^unreleased}}{{version}}{{/unreleased}}]"
    )
  ).toEqual([5, 26]);
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
