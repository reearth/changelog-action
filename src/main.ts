import { promises } from "fs";

import { getInput, setOutput, setFailed } from "@actions/core";

import { exec, type Option } from "./action";
import { insertChangelog } from "./changelog";

const githubAction = !!process.env.GITHUB_ACTIONS;
const defaultChangelog =
  "# Changelog\n\nAll notable changes to this project will be documented in this file.";

const version = getInput("version") || process.env.CHANGELOG_VERSION || "minor";
const date = dateOrNow(getInput("date") || process.env.CHANGELOG_DATE);
const repo = getInput("repo") || process.env.CHANGELOG_REPO;
const latest = getInput("latest") || process.env.CHANGELOG_LATEST;
const output =
  getInput("output") || process.env.CHANGELOG_OUTPUT || "CHANGELOG.md";
const configPath =
  getInput("config") ||
  process.env.CHANGELOG_CONFIG ||
  ".github/changelog.json";
const noEmit = getInput("noEmit") || process.env.CHANGELOG_NO_EMIT;

export type Config = Option & {
  versionPrefix?: string;
  titleVersionPrefix?: string;
  defaultChangelog?: string;
};

(async function () {
  const config: Config | undefined = await loadJSON(configPath);
  const changelog = await load(output);

  const actualVersion =
    config?.versionPrefix === "add" && /^[0-9]/.test(version)
      ? `v${version}`
      : config?.versionPrefix === "remove" && /^v[0-9]/.test(version)
      ? version.slice(1)
      : version;
  const actualRepo = repo || config?.repo;

  const result = await exec(actualVersion, date, {
    ...(config ?? {}),
    repo:
      actualRepo === "false"
        ? undefined
        : actualRepo || process.env.GITHUB_REPOSITORY,
  });

  const newChangelog = insertChangelog(
    (changelog || config?.defaultChangelog) ?? defaultChangelog,
    result.changelog,
    result.version
  );

  if (githubAction) {
    setOutput("changelog", result.changelogWithoutTitle);
    setOutput("version", result.version);
    setOutput("date", result.date);
    setOutput("prevVersion", result.prevVersion);
    setOutput("oldChangelog", changelog);
    setOutput("newChangelog", newChangelog);
  }

  if (!noEmit || noEmit !== "false") {
    await promises.writeFile(output, newChangelog);
    console.log(`${githubAction ? "\n" : ""}Changelog was saved to ${output}`);

    if (latest) {
      await promises.writeFile(latest, result.changelogWithoutTitle);
      console.log(`Changelog only for the new version was saved to ${latest}`);
    }
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
