import { test, expect } from "vitest";

import { bumpVersion, getPrefixAndGroup } from "./core";

test("getPrefixAndGroup", () => {
  expect(getPrefixAndGroup("feat(web): hogehoge")).toEqual({
    prefix: "feat",
    group: "web",
  });
});

test("bumpVersion", () => {
  expect(bumpVersion("1.1.1", "major")).toBe("2.0.0");
  expect(bumpVersion("v1.1.1", "minor")).toBe("v1.2.0");
  expect(bumpVersion("v1.1.1", "v1.1.2")).toBe("v1.1.2");
  expect(bumpVersion("v1.1.1", "1.1.2")).toBe("v1.1.2");
});
