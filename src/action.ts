import { generateChangelog, type Option } from "./changelog";
import { bumpVersion, getCommits, getTags, isValidVersion } from "./core";

export async function exec(
  version: string,
  date: Date,
  options?: Option
): Promise<{
  changelog: string;
  version: string;
  prevVersion: string | undefined;
}> {
  const { all: tags, latest } = await getTags();
  const nextVersion = latest
    ? bumpVersion(latest, version)
    : isValidVersion(version)
    ? version
    : !latest
    ? "v0.1.0"
    : undefined;
  if (!nextVersion) {
    throw new Error(`invalid version: ${version}`);
  }

  if (tags.includes(nextVersion)) {
    throw new Error("The specified tag already exists");
  }

  const commits = await getCommits(latest);
  const result = generateChangelog(nextVersion, date, commits, options);

  return { changelog: result, version: nextVersion, prevVersion: latest };
}
