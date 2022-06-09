import { promises } from "fs";

import { getInput, setOutput, setFailed } from "@actions/core";

import { exec } from "./action";
import { insertChangelog } from "./changelog";

const defaultChangelog =
  "# Changelog\nAll notable changes to this project will be documented in this file.\n";

const version = getInput("version") || "minor";
const date = dateOrNow(getInput("date"));
const latest = getInput("latest");
const output = getInput("output") || "CHANGELOG.md";

(async function () {
  const config = await loadJSON(getInput("config") || ".github/changelog.json");
  const changelog = await load(output);

  try {
    const result = await exec(version, date, config);
    const newChangelog = insertChangelog(
      changelog || defaultChangelog,
      result.changelog
    );

    setOutput("changelog", result.changelog);
    setOutput("version", result.version);
    setOutput("prevVersion", result.prevVersion);
    setOutput("oldChangelog", changelog);
    setOutput("newChangelog", newChangelog);
    await promises.writeFile(output, newChangelog);

    if (latest) {
      await promises.writeFile(
        typeof latest === "string" ? latest : "CHANGELOG_latest.md",
        result.changelog
      );
    }
  } catch (err) {
    if (typeof err === "object" && err) {
      setFailed((err as any).message || err);
    }
  }
})();

function dateOrNow(date: string): Date {
  let d = new Date(date);
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  return d;
}

async function load(path: string): Promise<string | undefined> {
  let data: string | undefined;
  try {
    data = await promises.readFile(path, "utf8");
  } catch (err) {
    if (!err || typeof err !== "object" || (err as any).code !== "ENOENT") {
      throw err;
    }
  }
  return data;
}

async function loadJSON(path: string): Promise<any> {
  const data = await load(path);
  return data ? JSON.parse(data) : undefined;
}
