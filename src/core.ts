import { inc, valid } from "semver";
import simpleGit from "simple-git";

import { type Commit } from "./changelog";

const git = simpleGit();

export async function getTags(): Promise<{
  all: string[];
  latest: string | undefined;
  latestDate: Date | undefined;
}> {
  const tags = await git.tags();
  const log = tags.latest
    ? await git.log({
        from: tags.latest + "~",
        to: tags.latest,
      })
    : undefined;
  return {
    ...tags,
    latestDate: log?.latest ? new Date(log.latest.date) : undefined,
  };
}

export async function getCommits(
  from?: string,
  since?: Date
): Promise<Commit[]> {
  if (!from) {
    from = (await git.raw(["rev-list", "--max-parents=0", "HEAD"])).trim();
    if (!from) {
      throw new Error("there are no commits in this repo");
    }
  }

  return (
    await git.log({
      from,
      to: "HEAD",
    })
  ).all
    .filter(
      (l) =>
        !l.message.startsWith("Revert ") &&
        !l.message.startsWith("Merge branch ") &&
        !l.message.startsWith("Merge commit ") &&
        !l.message.match(/^v\d+\./) &&
        (!since || new Date(l.date) > since)
    )
    .map((l) => ({
      body: l.body,
      hash: l.hash,
      date: new Date(l.date),
      ...parseCommitMessage(l.message),
    }));
}

const commitMessageReg = /^([a-z]+?)(?:\((.+?)\))?(!)?:(.*)$/;
const prReg = /#(\d+)(?:\D|$)/;

export function parseCommitMessage(subject: string): {
  prefix: string | undefined;
  scope: string | undefined;
  pr: string | undefined;
  breakingChange: boolean;
  subject: string;
} {
  const m = subject.match(commitMessageReg);
  const s = m?.[4].trim() || subject;
  return {
    prefix: m?.[1],
    scope: m?.[2],
    breakingChange: !!m?.[3] || s.includes("BREAKING CHANGE"),
    subject: s,
    pr: s.match(prReg)?.[1],
  };
}

export function isValidVersion(version: string): boolean {
  return version === "unreleased" || !!valid(version);
}

const defaultMinorPrefixes = ["feat"];

export function getBumpFromCommits(
  commits: Commit[],
  minorPrefixes = defaultMinorPrefixes
): "major" | "minor" | "patch" {
  for (const commit of commits) {
    if (commit.breakingChange) return "major";
    if (commit.prefix && minorPrefixes.includes(commit.prefix)) return "minor";
  }
  return "patch";
}

export function bumpVersion(version: string, next: string): string | null {
  if (
    next === "major" ||
    next === "premajor" ||
    next === "minor" ||
    next === "preminor" ||
    next === "patch" ||
    next === "prepatch" ||
    next === "prerelease"
  ) {
    const res = inc(version, next);
    if (!res?.startsWith("v") && version.startsWith("v")) {
      return `v${res}`;
    }
    return res;
  }

  if (!next.startsWith("v") && version.startsWith("v")) {
    return `v${next}`;
  }
  return next;
}
