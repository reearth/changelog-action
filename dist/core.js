"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bumpVersion = exports.getBumpFromCommits = exports.isValidVersion = exports.parseCommitMessage = exports.getCommits = exports.getTags = void 0;
const semver_1 = require("semver");
const simple_git_1 = __importDefault(require("simple-git"));
const git = (0, simple_git_1.default)();
async function getTags() {
    const tags = await git.tags();
    const log = tags.latest
        ? await git.log({
            from: tags.latest,
            maxCount: 1,
        })
        : undefined;
    return {
        ...tags,
        latestDate: log?.latest ? new Date(log.latest.date) : undefined,
    };
}
exports.getTags = getTags;
async function getCommits(from, since) {
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
        !l.message.startsWith("Merge branch ") &&
        !l.message.startsWith("Merge commit ") &&
        (!since || new Date(l.date) > since))
        .map((l) => ({
        body: l.body,
        hash: l.hash,
        date: new Date(l.date),
        ...parseCommitMessage(l.message),
    }));
}
exports.getCommits = getCommits;
const commitMessageReg = /^([a-z]+?)(?:\((.+?)\))?(!)?:(.*)$/;
const prReg = /#(\d+)(?:\D|$)/;
function parseCommitMessage(subject) {
    const m = subject.match(commitMessageReg);
    const s = m?.[4].trim() || subject;
    return {
        prefix: m?.[1],
        scope: m?.[2],
        breakingChange: !!m?.[3] || s.includes("BREAKING CHANGE"),
        subject: s,
        pr: s.match(prReg)?.[1],
    };
}
exports.parseCommitMessage = parseCommitMessage;
function isValidVersion(version) {
    return version === "unreleased" || !!(0, semver_1.valid)(version);
}
exports.isValidVersion = isValidVersion;
const defaultMinorPrefixes = ["feat"];
function getBumpFromCommits(commits, minorPrefixes = defaultMinorPrefixes) {
    for (const commit of commits) {
        if (commit.breakingChange)
            return "major";
        if (commit.prefix && minorPrefixes.includes(commit.prefix))
            return "minor";
    }
    return "patch";
}
exports.getBumpFromCommits = getBumpFromCommits;
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
