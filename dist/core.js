"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bumpVersion = exports.isValidVersion = exports.getPrefixAndGroup = exports.getCommits = exports.getTags = void 0;
const semver_1 = require("semver");
const simple_git_1 = require("simple-git");
const git = (0, simple_git_1.default)();
function getTags() {
    return git.tags();
}
exports.getTags = getTags;
async function getCommits(from) {
    if (!from) {
        from = (await git.raw(["rev-list", "--max-parents=0", "HEAD"])).trim();
        if (!from) {
            throw new Error("there are no commits in this repo");
        }
    }
    return (await git.log({
        from,
        to: "HEAD",
    })).all
        .filter((l) => !l.message.startsWith("Revert ") &&
        !l.message.startsWith("Merge branch "))
        .map((l) => ({
        subject: l.message,
        hash: l.hash,
        ...getPrefixAndGroup(l.message),
    }));
}
exports.getCommits = getCommits;
function getPrefixAndGroup(subject) {
    const m = subject.match(/^([a-z]+?)(?:\((.+?)\))?: /);
    return { prefix: m?.[1], group: m?.[2] };
}
exports.getPrefixAndGroup = getPrefixAndGroup;
function isValidVersion(version) {
    return !!(0, semver_1.valid)(version);
}
exports.isValidVersion = isValidVersion;
function bumpVersion(version, next) {
    if (next === "major" ||
        next === "premajor" ||
        next === "minor" ||
        next === "preminor" ||
        next === "patch" ||
        next === "prepatch" ||
        next === "prerelease") {
        const res = (0, semver_1.inc)(version, next);
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
exports.bumpVersion = bumpVersion;
