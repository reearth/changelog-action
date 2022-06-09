"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const core_1 = require("@actions/core");
const action_1 = require("./action");
const changelog_1 = require("./changelog");
const defaultChangelog = "# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n";
const version = (0, core_1.getInput)("version") || process.env.CHANGELOG_VERSION || "minor";
const versionAsIs = (0, core_1.getInput)("versionAsIs") || process.env.CHANGELOG_VERSION_ASIS;
const date = dateOrNow((0, core_1.getInput)("date") || process.env.CHANGELOG_DATE);
const latest = (0, core_1.getInput)("latest") || process.env.CHANGELOG_LATEST;
const output = (0, core_1.getInput)("output") || process.env.CHANGELOG_OUTPUT || "CHANGELOG.md";
(async function () {
    const config = await loadJSON((0, core_1.getInput)("config") || ".github/changelog.json");
    const changelog = await load(output);
    const actualVersion = !versionAsIs && /^[0-9]/.test(version) ? `v${version}` : version;
    const result = await (0, action_1.exec)(actualVersion, date, config);
    const newChangelog = (0, changelog_1.insertChangelog)(changelog || defaultChangelog, result.changelog, result.version);
    (0, core_1.setOutput)("changelog", result.changelog);
    (0, core_1.setOutput)("version", result.version);
    (0, core_1.setOutput)("prevVersion", result.prevVersion);
    (0, core_1.setOutput)("oldChangelog", changelog);
    (0, core_1.setOutput)("newChangelog", newChangelog);
    await fs_1.promises.writeFile(output, newChangelog);
    if (latest) {
        await fs_1.promises.writeFile(typeof latest === "string" ? latest : "CHANGELOG_latest.md", result.changelog);
    }
})().catch((err) => {
    (0, core_1.setFailed)(err?.message || err);
});
function dateOrNow(date) {
    if (!date)
        return new Date();
    let d = new Date(date);
    if (isNaN(d.getTime())) {
        d = new Date();
    }
    return d;
}
async function load(path) {
    let data;
    try {
        data = await fs_1.promises.readFile(path, "utf8");
    }
    catch (err) {
        if (!err || typeof err !== "object" || err.code !== "ENOENT") {
            throw err;
        }
    }
    return data;
}
async function loadJSON(path) {
    const data = await load(path);
    return data ? JSON.parse(data) : undefined;
}
