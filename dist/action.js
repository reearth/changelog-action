"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = void 0;
const changelog_1 = require("./changelog");
const core_1 = require("./core");
const initialVersion = "v0.1.0";
async function exec(version, date, options) {
    const { all: tags, latest } = await (0, core_1.getTags)();
    const commits = await (0, core_1.getCommits)(latest);
    const nextVersion = latest
        ? (0, core_1.bumpVersion)(latest, version || (0, core_1.getBumpFromCommits)(commits, options?.minorPrefixes))
        : (0, core_1.isValidVersion)(version)
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
    const [changelog, changelogWithoutTitle, changelogDate] = (0, changelog_1.generateChangelog)(nextVersion, date, commits, options);
    return {
        changelog,
        changelogWithoutTitle,
        version: nextVersion,
        prevVersion: latest,
        date: changelogDate,
    };
}
exports.exec = exec;
