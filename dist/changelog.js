"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeGroups = exports.detectMerge = exports.firstUppercase = exports.insertChangelog = exports.fixMarkdownLinkedCode = exports.hashLinks = exports.prLinks = exports.generateChangelogCommit = exports.generateChangelogPrefix = exports.generateChangelogGroup = exports.generateChangelog = void 0;
const date_fns_1 = require("date-fns");
const lodash_1 = require("lodash");
const mustache = __importStar(require("mustache"));
const render = mustache.render ?? mustache.default.render;
const defaultDateFormat = "yyyy-MM-dd";
const defaultVersionTemplate = "## {{versionWithoutPrefix}} - {{date}}";
const defaultGroupTemplate = "### {{title}}";
const defaultPrefixTemplate = "###{{#group}}#{{/group}} {{title}}";
const defaultCommitTemplate = "- {{subject}}{{#shortHash}} `{{shortHash}}`{{/shortHash}}";
function generateChangelog(version, date, commits, options) {
    const commitGroups = mergeGroups((0, lodash_1.groupBy)(commits, (c) => c.group ?? ""), detectMerge(options?.group ?? {}));
    const groups = Object.keys(commitGroups);
    const knownGroups = Object.keys(options?.group ?? []);
    const unknownGroups = groups
        .filter((g) => g && !knownGroups.includes(g))
        .sort();
    const groupEnabled = groups.length > 1 || !!groups[0] || !!knownGroups.length;
    const formattedDate = (0, date_fns_1.format)(date, options?.dateFormat || defaultDateFormat);
    const result = [
        render(options?.versionTemplate || defaultVersionTemplate, {
            version,
            versionWithPrefix: `v${version.replace(/^v/, "")}`,
            versionWithoutPrefix: version.replace(/^v/, ""),
            date: formattedDate,
        }),
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
                generateChangelogGroup({
                    commits: commitGroups[key],
                    group: groupEnabled,
                    groupName: key,
                    groupTitle: groupEnabled ? title || key || "" : false,
                    prefix: options?.prefix ?? {},
                    repo: (typeof group === "object" ? group?.repo : null) ?? options?.repo,
                    dedupSameMessages: options?.dedupSameMessages,
                    capitalizeFirstLetter: options?.capitalizeFirstLetter,
                    linkHashes: options?.linkHashes,
                    linkPRs: options?.linkPRs,
                    groupTemplate: options?.groupTemplate,
                    prefixTemplate: options?.prefixTemplate,
                    commitTemplate: options?.commitTemplate,
                }),
                "",
            ];
        })
            .slice(0, -1),
    ];
    return [result.join("\n"), result.slice(2).join("\n"), formattedDate];
}
exports.generateChangelog = generateChangelog;
function generateChangelogGroup({ commits, group, groupName, groupTitle, prefix, repo, groupTemplate = defaultGroupTemplate, ...options }) {
    if (!commits.length)
        return "";
    const commitPrefixes = mergeGroups((0, lodash_1.groupBy)(commits, (c) => c.prefix ?? ""), detectMerge(prefix));
    const knownPrefixes = Object.keys(prefix);
    const unknownPrefixes = Object.keys(commitPrefixes)
        .filter((p) => p && !knownPrefixes.includes(p))
        .sort();
    return [
        ...(groupTitle === false
            ? []
            : [
                render(groupTemplate, {
                    group,
                    name: groupName,
                    title: groupTitle,
                    repo,
                    commits,
                }),
                "",
            ]),
        ...[...Object.entries(prefix), ...unknownPrefixes.map((p) => [p, p])]
            .filter(([key, prefix]) => prefix !== false &&
            (typeof prefix !== "object" || prefix?.title !== false) &&
            commitPrefixes[key]?.length)
            .flatMap(([key, prefix]) => [
            generateChangelogPrefix({
                commits: commitPrefixes[key],
                group,
                groupName,
                groupTitle,
                title: (typeof prefix === "object" ? prefix.title : prefix) || key,
                repo,
                ...options,
            }),
            "",
        ])
            .slice(0, -1),
    ].join("\n");
}
exports.generateChangelogGroup = generateChangelogGroup;
function generateChangelogPrefix({ commits, title, repo, group, groupName, groupTitle, dedupSameMessages = true, prefixTemplate = defaultPrefixTemplate, commitTemplate, ...options }) {
    if (!commits?.length)
        return "";
    const processdCommits = (dedupSameMessages ? (0, lodash_1.uniqBy)(commits, (c) => c.subject) : commits.concat()).sort((a, b) => b.date.getTime() - a.date.getTime());
    return [
        ...(title
            ? [
                render(prefixTemplate, {
                    group,
                    groupName,
                    groupTitle,
                    title,
                    repo,
                    commits: processdCommits,
                }),
                "",
            ]
            : []),
        ...processdCommits.map((c) => generateChangelogCommit({
            commit: c,
            repo,
            template: commitTemplate,
            ...options,
        })),
    ].join("\n");
}
exports.generateChangelogPrefix = generateChangelogPrefix;
function generateChangelogCommit({ commit, template = defaultCommitTemplate, repo, capitalizeFirstLetter = true, linkHashes = true, linkPRs = true, }) {
    repo = getRepoUrl(repo);
    const shortHash = commit.hash?.slice(0, 6);
    let message = render(template, {
        ...commit,
        subject: firstUppercase(commit.subject, capitalizeFirstLetter),
        shortHash,
        repo,
    });
    if (linkPRs) {
        message = prLinks(message, repo);
    }
    if (linkHashes && repo && commit.hash) {
        message = hashLinks(message, commit.hash, repo);
    }
    return fixMarkdownLinkedCode(message);
}
exports.generateChangelogCommit = generateChangelogCommit;
function prLinks(md, repo) {
    return repo
        ? md.replace(/(^|[^[])#(\d+?)(\D|$)/g, `$1[#$2](${repo}/pull/$2)$3`)
        : md;
}
exports.prLinks = prLinks;
function hashLinks(md, hash, repo) {
    hash = hash.replace(/[^0-9a-z]/g, "");
    const shortHash = hash.slice(0, 6);
    return repo
        ? md.replace(new RegExp(`${hash}|${shortHash}`, "g"), `[$&](${repo}/commit/${shortHash})`)
        : md;
}
exports.hashLinks = hashLinks;
function fixMarkdownLinkedCode(md) {
    return md.replace(/`\[(.+?)\]\((.+?)\)`/g, "[`$1`]($2)");
}
exports.fixMarkdownLinkedCode = fixMarkdownLinkedCode;
function getRepoUrl(repo) {
    return repo?.startsWith("http")
        ? repo.replace(/\/$/, "")
        : repo
            ? `https://github.com/${repo}`
            : "";
}
function insertChangelog(changelog, inserting, version) {
    changelog = changelog.trim();
    const r = /^## v?([0-9].+?)(?: |$)/im;
    const m = r.exec(changelog);
    if (!m || m.index < 0)
        return (changelog + "\n\n" + inserting).trim();
    if (version && version.replace(/^v/, "") == m[1]) {
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
