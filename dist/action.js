import { generateChangelog } from "./changelog";
import { bumpVersion, getCommits, getTags, isValidVersion } from "./core";
export async function exec(version, date, options) {
    const { all: tags, latest } = await getTags();
    const nextVersion = latest
        ? bumpVersion(latest, version)
        : isValidVersion(version)
            ? version
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
