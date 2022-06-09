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
  return (
    await git.log({
      from: from ? `refs/tags/${from}` : undefined,
    })
  ).all.map((l) => ({
    subject: l.message,
    hash: l.hash,
    ...getPrefixAndGroup(l.message),
  }));
}

export function getPrefixAndGroup(subject: string): {
  prefix: string | undefined;
  group: string | undefined;
} {
  const m = subject.match(/^([a-z]+?)(?:\((.+?)\))?: /);
  return { prefix: m?.[1], group: m?.[2] };
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
