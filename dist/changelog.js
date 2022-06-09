"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimPrefixAndGroup = exports.formatDate = exports.insertChangelog = exports.generateChangelogCommit = exports.generateChangelogPrefix = exports.generateChangelogGroup = exports.generateChangelog = void 0;
const lodash_1 = require("lodash");
function generateChangelog(version, date, commits, options) {
    const commitGroups = (0, lodash_1.groupBy)(commits, (c) => c.group ?? "");
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
    const commitPrefixes = (0, lodash_1.groupBy)(commits, (c) => c.prefix ?? "");
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
    const subject = trimPrefixAndGroup(commit.subject);
    return url
        ? `${subject.replace(/\(#([0-9]+)\)/g, `([#$1](${url}/pull/$1))`)}${hash ? ` \`[${hash}](${url}/commit/${hash})\`` : ""}`
        : `${subject}${hash ? ` \`${hash}\`` : ""}`;
}
exports.generateChangelogCommit = generateChangelogCommit;
function insertChangelog(changelog, inserting, version) {
    changelog = changelog.trim();
    const r = /^## (v?[0-9].+?)(?: - |$)/im;
    const m = r.exec(changelog);
    if (!m || m.index < 0)
        return (changelog + "\n" + inserting).trim();
    if (version && version == m[1]) {
        const n = r.exec(changelog.slice(m.index + m[0].length));
        if (!n || n.index < 0) {
            return (changelog.slice(0, m.index) + inserting).trim();
        }
        return (changelog.slice(0, m.index) +
            inserting +
            "\n\n" +
            changelog.slice(m.index + m[0].length + n.index)).trim();
    }
    return (changelog.slice(0, m.index) +
        inserting +
        "\n\n" +
        changelog.slice(m.index)).trim();
}
exports.insertChangelog = insertChangelog;
function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
exports.formatDate = formatDate;
function trimPrefixAndGroup(subject) {
    return subject.replace(/^([a-z]+?)(?:\((.+?)\))?: /, "");
}
exports.trimPrefixAndGroup = trimPrefixAndGroup;
