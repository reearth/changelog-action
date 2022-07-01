import { generateChangelog, type Option as BaseOption } from "./changelog";
import {
  bumpVersion,
  getBumpFromCommits,
  getCommits,
  getTags,
  isValidVersion,
} from "./core";

const initialVersion = "v0.1.0";

export type Option = BaseOption & {
  minorPrefixes?: string[];
  initialVersion?: string;
};

export async function exec(
  version: string | undefined,
  date: Date,
  options?: Option
): Promise<{
  changelog: string;
  changelogWithoutTitle: string;
  date: string;
  version: string;
  prevVersion: string | undefined;
}> {
  const { all: tags, latest } = await getTags();
  const commits = await getCommits(latest);

  const nextVersion = latest
    ? bumpVersion(
        latest,
        version || getBumpFromCommits(commits, options?.minorPrefixes)
      )
    : isValidVersion(version || "")
    ? version
    : !latest
    ? options?.initialVersion || initialVersion
    : undefined;
  if (!nextVersion) {
    throw new Error(`invalid version: ${version}`);
  }

  if (tags.includes(nextVersion)) {
    throw new Error(`The next version already exists in tags: ${nextVersion}`);
  }

  const [changelog, changelogWithoutTitle, changelogDate] = generateChangelog(
    nextVersion,
    date,
    commits,
    options
  );

  return {
    changelog,
    changelogWithoutTitle,
    version: nextVersion,
    prevVersion: latest,
    date: changelogDate,
  };
}
