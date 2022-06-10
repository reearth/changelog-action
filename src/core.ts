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
      ...getPrefixAndGroup(l.message),
    }));
}

const prefixAndGroupReg = /^([a-z]+?)(?:\((.+?)\))?: /;

export function getPrefixAndGroup(subject: string): {
  prefix: string | undefined;
  group: string | undefined;
} {
  const m = subject.match(prefixAndGroupReg);
  return { prefix: m?.[1], group: m?.[2] };
}

export function trimPrefixAndGroup(subject: string): string {
  return subject.replace(prefixAndGroupReg, "");
}

export function isValidVersion(version: string): boolean {
  return !!valid(version);
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
