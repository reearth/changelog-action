import { readFileSync, writeFileSync } from "fs";

import { getInput } from "@actions/core";

import { exec, insertChangelog } from "./action";

try {
  const result = exec(getInput("version"), !!getInput("tag"));
  const filePath = getInput("filePath") || "CHANGELOG.md";

  let changelog = "";
  try {
    changelog = readFileSync(filePath, "utf8");
  } catch (err) {
    if (!err || typeof err !== "object" || (err as any).code !== "ENOENT") {
      throw err;
    }
  }

  writeFileSync(filePath, insertChangelog(changelog, result));

  const latest = getInput("latest");
  if (latest) {
    writeFileSync(
      typeof latest === "string" ? latest : "CHANGELOG_latest.md",
      result
    );
  }
} catch (err) {
  if (typeof err === "object" && err && "message" in err) {
    console.error((err as any).message);
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }
}
