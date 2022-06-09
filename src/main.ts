import { promises } from "fs";

import { getInput, setOutput, setFailed } from "@actions/core";

import { exec } from "./action";
import { insertChangelog } from "./changelog";

const defaultChangelog =
  "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";

const version = getInput("version") || process.env.CHANGELOG_VERSION || "minor";
const versionAsIs =
  getInput("versionAsIs") || process.env.CHANGELOG_VERSION_ASIS;
const date = dateOrNow(getInput("date") || process.env.CHANGELOG_DATE);
const repo = getInput("repo") || process.env.CHANGELOG_REPO;
const latest = getInput("latest") || process.env.CHANGELOG_LATEST;
const output =
  getInput("output") || process.env.CHANGELOG_OUTPUT || "CHANGELOG.md";

(async function () {
  const config = await loadJSON(getInput("config") || ".github/changelog.json");
  const changelog = await load(output);

  const actualVersion =
    !versionAsIs && /^[0-9]/.test(version) ? `v${version}` : version;
  const result = await exec(actualVersion, date, {
    ...(config ?? {}),
    repo: repo || config?.repo,
  });
  const newChangelog = insertChangelog(
    changelog || defaultChangelog,
    result.changelog,
    result.version
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
})().catch((err) => {
  setFailed((err as any)?.message || err);
});

function dateOrNow(date?: string): Date {
  if (!date) return new Date();
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
