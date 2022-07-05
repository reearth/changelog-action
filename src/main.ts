import { promises } from "fs";

import { getInput, setOutput, setFailed } from "@actions/core";
import commandLineArgs from "command-line-args";
import commandLineUsage from "command-line-usage";
import * as yaml from "js-yaml";

import { exec, type Option } from "./action";
import { insertChangelog } from "./changelog";

const githubAction = !!process.env.GITHUB_ACTIONS;
const defaultChangelog =
  "# Changelog\n\nAll notable changes to this project will be documented in this file.";

type Options = {
  version?: string;
  date?: string;
  repo?: string;
  latest?: string;
  output?: string;
  configPath?: string | string[];
  noEmit?: boolean;
};

type Config = Option & {
  versionPrefix?: string;
  defaultChangelog?: string;
};

const options: Options = {
  version: getInput("version") || process.env.CHANGELOG_VERSION,
  date: getInput("date") || process.env.CHANGELOG_DATE,
  repo: getInput("repo") || process.env.CHANGELOG_REPO,
  latest: getInput("latest") || process.env.CHANGELOG_LATEST,
  output: getInput("output") || process.env.CHANGELOG_OUTPUT,
  configPath: getInput("config") || process.env.CHANGELOG_CONFIG,
  noEmit: argToBool(getInput("noEmit") || process.env.CHANGELOG_NO_EMIT, false),
};

const argOptions = [
  { name: "version", type: String, alias: "v" },
  { name: "date", type: String, alias: "d" },
  { name: "repo", type: String, alias: "r" },
  { name: "latest", type: String, alias: "l" },
  { name: "output", type: String, alias: "o" },
  { name: "configPath", type: String, alias: "c" },
  { name: "noEmit", type: Boolean, alias: "n" },
  { name: "help", type: Boolean, alias: "h" },
];

const args = githubAction ? {} : commandLineArgs(argOptions);

if (!githubAction && args.help) {
  console.log(
    commandLineUsage([
      {
        header: "changelog",
        content: "Generate CHANGELOG.md from git commit logs",
      },
      {
        header: "Options",
        optionList: argOptions,
      },
    ])
  );
  // eslint-disable-next-line no-process-exit
  process.exit(0);
}

(async function () {
  const {
    version,
    date,
    repo,
    latest,
    output = "CHANGELOG.md",
    configPath = [
      ".github/changelog.yml",
      ".github/changelog.json",
      ".github/changelog.yaml",
    ],
    noEmit,
  } = { ...options, ...args };

  const config: Config | undefined = await loadJSON(
    ...(Array.isArray(configPath) ? configPath : [configPath])
  );
  const changelog = await load(output);

  const actualRepo = repo || config?.repo;

  const result = await exec(version, dateOrNow(date), {
    ...(config ?? {}),
    repo:
      actualRepo === "false"
        ? undefined
        : actualRepo || process.env.GITHUB_REPOSITORY,
  });

  const newChangelog = insertChangelog(
    (changelog || config?.defaultChangelog) ?? defaultChangelog,
    result.changelog,
    result.version,
    config?.versionTemplate
  );

  if (githubAction) {
    setOutput("changelog", result.changelogWithoutTitle);
    setOutput("version", result.version);
    setOutput("date", result.date);
    setOutput("prevVersion", result.prevVersion);
    setOutput("oldChangelog", changelog);
    setOutput("newChangelog", newChangelog);
  }

  if (!noEmit) {
    await promises.writeFile(output, newChangelog);
    console.log(`${githubAction ? "\n" : ""}Changelog was saved to ${output}`);

    if (latest) {
      await promises.writeFile(latest, result.changelogWithoutTitle);
      console.log(`Changelog only for the new version was saved to ${latest}`);
    }
  }
})().catch((err) => {
  if (githubAction) {
    setFailed((err as any)?.message || err);
  }
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

async function loadJSON(...paths: string[]): Promise<any> {
  for (const path of paths) {
    const data = await load(path);
    if (data) {
      return yaml.load(data);
    }
  }
  return undefined;
}

function argToBool(a: string | undefined, df: boolean): boolean {
  if (a === "true") return true;
  if (a === "false") return false;
  return df;
}
