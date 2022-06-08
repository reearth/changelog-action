import {
  getTags,
  bumpVersion,
  createTag,
  generateChangelog,
  getCurrentTag,
  getCommits,
} from "./core";

export function exec(version: string, tag: boolean): string {
  const tags = getTags();
  const currentTag = getCurrentTag();
  const nextVersion =
    version == "patch" || version == "minor" || version == "major"
      ? bumpVersion(currentTag, version)
      : version;

  if (tags.includes(nextVersion)) {
    throw new Error("The specified tag already exists");
  }

  const commits = getCommits(currentTag);
  const result = generateChangelog(nextVersion, commits);

  if (tag) {
    createTag(nextVersion);
  }

  return result;
}

export function insertChangelog(changelog: string, inserting: string): string {
  return ""; // TODO
}
