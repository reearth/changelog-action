import { test, expect } from "vitest";

import { bumpVersion, getPrefixAndGroup, trimPrefixAndGroup } from "./core";

test("getPrefixAndGroup", () => {
  expect(getPrefixAndGroup("feat(web): hogehoge")).toEqual({
    prefix: "feat",
    group: "web",
  });
});

test("trimPrefixAndGroup", () => {
  expect(trimPrefixAndGroup("feat(web): a")).toBe("a");
  expect(trimPrefixAndGroup("feat: a")).toBe("a");
  expect(trimPrefixAndGroup("a")).toBe("a");
});

test("bumpVersion", () => {
  expect(bumpVersion("1.1.1", "major")).toBe("2.0.0");
  expect(bumpVersion("v1.1.1", "minor")).toBe("v1.2.0");
  expect(bumpVersion("v1.1.1", "v1.1.2")).toBe("v1.1.2");
  expect(bumpVersion("v1.1.1", "1.1.2")).toBe("v1.1.2");
});
