"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatDate = exports.insertChangelog = exports.generateChangelogCommit = exports.generateChangelogPrefix = exports.generateChangelogGroup = exports.generateChangelog = void 0;
const lodash_groupby_1 = require("lodash.groupby");
function generateChangelog(version, date, commits, options) {
    const commitGroups = (0, lodash_groupby_1.default)(commits, (c) => c.group ?? "");
    const groups = Object.keys(commitGroups);
    const knownGroups = Object.keys(options?.group ?? []);
    const unknownGroups = groups.filter((g) => g && !knownGroups.includes(g));
    const groupEnabled = groups.length > 1 || !!groups[0] || !!knownGroups.length;
    return [
        `## ${version} - ${formatDate(date)}`,
        "",
        ...[
            ...Object.entries(options?.group ?? []),
            ...unknownGroups.map((g) => [g, g]),
            ["", ""],
        ]
            .filter(([key, g]) => g !== false && commitGroups[key]?.length)
            .flatMap(([key, group]) => {
            const title = typeof group === "string" ? group : group ? group.title : undefined;
            return [
                generateChangelogGroup(commitGroups[key], groupEnabled ? title || key || "" : false, options?.prefix ?? {}, (typeof group === "object" ? group?.url : null) ?? options?.url),
                "",
            ];
        })
            .slice(0, -1),
    ].join("\n");
}
exports.generateChangelog = generateChangelog;
function generateChangelogGroup(commits, groupTitle, prefix, url, level = 3) {
    if (!commits.length)
        return "";
    const commitPrefixes = (0, lodash_groupby_1.default)(commits, (c) => c.prefix ?? "");
    const knownPrefixes = Object.keys(prefix);
    const unknownPrefixes = Object.keys(commitPrefixes).filter((p) => p && !knownPrefixes.includes(p));
    return [
        ...(groupTitle === false ? [] : [`${"#".repeat(level)} ${groupTitle}`, ""]),
        ...[...Object.entries(prefix), ...unknownPrefixes.map((p) => [p, p])]
            .filter(([key, title]) => title !== false && commitPrefixes[key]?.length)
            .flatMap(([key, title]) => [
            generateChangelogPrefix(commitPrefixes[key], title || key, url, groupTitle === false ? level : level + 1),
            "",
        ])
            .slice(0, -1),
    ].join("\n");
}
exports.generateChangelogGroup = generateChangelogGroup;
function generateChangelogPrefix(commits, title, url, level = 3) {
    if (!commits?.length)
        return "";
    return [
        ...(title ? [`${"#".repeat(level)} ${title}`, ""] : []),
        ...commits.map((c) => "- " + generateChangelogCommit(c, url)),
    ].join("\n");
}
exports.generateChangelogPrefix = generateChangelogPrefix;
function generateChangelogCommit(commit, url) {
    url = url?.startsWith("http")
        ? url.replace(/\/$/, "")
        : url
            ? `https://github.com/${url}`
            : "";
    const hash = commit.hash?.slice(0, 6);
    return url
        ? `${commit.subject.replace(/\(#([0-9]+)\)/g, `([#$1](${url}/pull/$1))`)}${hash ? ` \`[${hash}](${url}/commit/${hash})\`` : ""}`
        : `${commit.subject}${hash ? ` \`${hash}\`` : ""}`;
}
exports.generateChangelogCommit = generateChangelogCommit;
function insertChangelog(changelog, inserting) {
    const i = changelog.search(/^## v?[0-9]/im);
    if (i < 0)
        throw new Error("invalid changelog");
    return changelog.slice(0, i) + inserting.trim() + "\n\n" + changelog.slice(i);
}
exports.insertChangelog = insertChangelog;
function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
exports.formatDate = formatDate;
