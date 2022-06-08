export type Commit = {};

export function getTags(): string[] {
  throw "unimplemnted";
}

export function getCurrentTag(): string {
  throw "unimplemnted";
}

export function bumpVersion(
  _version: string,
  _bump: "patch" | "minor" | "major"
): string {
  throw "unimplemnted";
}

export function createTag(_tag: string) {
  throw "unimplemnted";
}

export function getCommits(_since: string): Commit[] {
  throw "unimplemnted";
}

export function generateChangelog(
  _version: string,
  _commits: Commit[],
  _options?: {}
): string {
  throw "unimplemnted";
}
