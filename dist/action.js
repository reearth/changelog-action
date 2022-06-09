"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exec = void 0;
const changelog_1 = require("./changelog");
const core_1 = require("./core");
async function exec(version, date, options) {
    const { all: tags, latest } = await (0, core_1.getTags)();
    const nextVersion = latest
        ? (0, core_1.bumpVersion)(latest, version)
        : (0, core_1.isValidVersion)(version)
            ? version
            : (!latest ? "v0.1.0" : undefined);
    if (!nextVersion) {
        throw new Error(`invalid version: ${version}`);
    }
    if (tags.includes(nextVersion)) {
        throw new Error("The specified tag already exists");
    }
    const commits = await (0, core_1.getCommits)(latest);
    const result = (0, changelog_1.generateChangelog)(nextVersion, date, commits, options);
    return { changelog: result, version: nextVersion, prevVersion: latest };
}
exports.exec = exec;
