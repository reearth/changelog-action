"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeGroups = exports.detectMerge = exports.firstUppercase = exports.formatDate = exports.insertChangelog = exports.generateChangelogCommit = exports.generateChangelogPrefix = exports.generateChangelogGroup = exports.generateChangelog = void 0;
const lodash_1 = require("lodash");
function generateChangelog(version, date, commits, options) {
    const commitGroups = mergeGroups((0, lodash_1.groupBy)(commits, (c) => c.group ?? ""), detectMerge(options?.group ?? {}));
    const groups = Object.keys(commitGroups);
    const knownGroups = Object.keys(options?.group ?? []);
    const unknownGroups = groups
        .filter((g) => g && !knownGroups.includes(g))
        .sort();
    const groupEnabled = groups.length > 1 || !!groups[0] || !!knownGroups.length;
    if (options?.titleVersionPrefix == "add" &&
        version &&
        !version.startsWith("v")) {
        version = `v${version}`;
    }
    else if (options?.titleVersionPrefix === "remove" &&
        version?.startsWith("v")) {
        version = version.slice(1);
    }
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
                generateChangelogGroup(commitGroups[key], groupEnabled ? title || key || "" : false, options?.prefix ?? {}, (typeof group === "object" ? group?.url : null) ?? options?.repo, !options?.disableFirstLetterCapitalization),
                "",
            ];
        })
            .slice(0, -1),
    ].join("\n");
}
exports.generateChangelog = generateChangelog;
function generateChangelogGroup(commits, groupTitle, prefix, repo, capitalizeFirstLetter = true, level = 3) {
    if (!commits.length)
        return "";
    const commitPrefixes = mergeGroups((0, lodash_1.groupBy)(commits, (c) => c.prefix ?? ""), detectMerge(prefix));
    const knownPrefixes = Object.keys(prefix);
    const unknownPrefixes = Object.keys(commitPrefixes)
        .filter((p) => p && !knownPrefixes.includes(p))
        .sort();
    return [
        ...(groupTitle === false ? [] : [`${"#".repeat(level)} ${groupTitle}`, ""]),
        ...[...Object.entries(prefix), ...unknownPrefixes.map((p) => [p, p])]
            .filter(([key, prefix]) => prefix !== false &&
            (typeof prefix !== "object" || prefix?.title !== false) &&
            commitPrefixes[key]?.length)
            .flatMap(([key, prefix]) => [
            generateChangelogPrefix(commitPrefixes[key], (typeof prefix === "object" ? prefix.title : prefix) || key, repo, capitalizeFirstLetter, groupTitle === false ? level : level + 1),
            "",
        ])
            .slice(0, -1),
    ].join("\n");
}
exports.generateChangelogGroup = generateChangelogGroup;
function generateChangelogPrefix(commits, title, repo, capitalizeFirstLetter = true, level = 3) {
    if (!commits?.length)
        return "";
    return [
        ...(title ? [`${"#".repeat(level)} ${title}`, ""] : []),
        ...commits
            .concat()
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((c) => "- " + generateChangelogCommit(c, repo, capitalizeFirstLetter)),
    ].join("\n");
}
exports.generateChangelogPrefix = generateChangelogPrefix;
function generateChangelogCommit(commit, repo, capitalizeFirstLetter = true) {
    repo = getRepoUrl(repo);
    const hash = commit.hash?.slice(0, 6);
    const subject = firstUppercase(commit.subject, capitalizeFirstLetter);
    return repo
        ? `${subject.replace(/\(#([0-9]+)\)/g, `([#$1](${repo}/pull/$1))`)}${hash ? ` \`[${hash}](${repo}/commit/${hash})\`` : ""}`
        : `${subject}${hash ? ` \`${hash}\`` : ""}`;
}
exports.generateChangelogCommit = generateChangelogCommit;
function getRepoUrl(repo) {
    return repo?.startsWith("http")
        ? repo.replace(/\/$/, "")
        : repo
            ? `https://github.com/${repo}`
            : "";
}
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
function firstUppercase(subject, enabled) {
    return enabled ? subject.charAt(0).toUpperCase() + subject.slice(1) : subject;
}
exports.firstUppercase = firstUppercase;
function detectMerge(o) {
    const m = new Map(Object.entries(o)
        .map(([k, v]) => {
        const t = getTitle(v);
        return t ? [t, k] : null;
    })
        .filter((e) => !!e)
        .reverse());
    return Object.entries(o).reduce((a, [k, v]) => {
        const t = getTitle(v);
        if (!t)
            return a;
        const l = m.get(t);
        if (!l || l === k)
            return a;
        return {
            ...a,
            [k]: l,
        };
    }, {});
    function getTitle(e) {
        return typeof e === "string"
            ? e
            : typeof e === "object" &&
                e &&
                "title" in e &&
                typeof e.title === "string"
                ? e.title
                : "";
    }
}
exports.detectMerge = detectMerge;
function mergeGroups(o, m) {
    return Object.entries(o).reduce((a, [k, v]) => m[k]
        ? {
            ...a,
            [m[k]]: [...(a[m[k]] ?? []), ...v],
        }
        : { ...a, [k]: v }, {});
}
exports.mergeGroups = mergeGroups;
