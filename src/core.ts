import { inc, valid } from "semver";
import simpleGit from "simple-git";

import { type Commit } from "./changelog";

const git = simpleGit();

export function getTags(): Promise<{
  all: string[];
  latest: string | undefined;
}> {
  return git.tags();
}

export async function getCommits(from?: string): Promise<Commit[]> {
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
        !l.message.startsWith("Merge branch ")
    )
    .map((l) => ({
      subject: trimPrefixAndGroup(l.message),
      hash: l.hash,
      date: new Date(l.date),
      ...parseCommitMessage(l.message),
    }));
}

const commitMessageReg = /^([a-z]+?)(?:\((.+?)\))?(!)?: /;

export function parseCommitMessage(subject: string): {
  prefix: string | undefined;
  group: string | undefined;
  breakingChange: boolean;
} {
  const m = subject.match(commitMessageReg);
  return {
    prefix: m?.[1],
    group: m?.[2],
    breakingChange: !!m?.[3] || subject.includes("BREAKING CHANGE"),
  };
}

export function trimPrefixAndGroup(subject: string): string {
  return subject.replace(commitMessageReg, "");
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
