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
exports.mergeGroups = exports.detectMerge = exports.firstUppercase = exports.escapeRegex = exports.findVersionSection = exports.insertChangelog = exports.fixMarkdownLinkedCode = exports.hashLinks = exports.prLinks = exports.generateChangelogCommit = exports.generateChangelogPrefix = exports.generateChangelogScope = exports.generateChangelog = void 0;
const date_fns_1 = require("date-fns");
const lodash_1 = require("lodash");
const mustache = __importStar(require("mustache"));
const semver_1 = require("semver");
const render = mustache.render ?? mustache.default.render;
const defaultDateFormat = "yyyy-MM-dd";
const defaultVersionTemplate = "## {{#unreleased}}Unreleased{{/unreleased}}{{^unreleased}}{{versionWithoutPrefix}} - {{date}}{{/unreleased}}";
const defaultScopeTemplate = "### {{title}}";
const defaultPrefixTemplate = "###{{#scope}}#{{/scope}} {{title}}";
const defaultCommitTemplate = "- {{subject}}{{#shortHash}} `{{shortHash}}`{{/shortHash}}";
const defaultOmittedCommitPattern = /^v\d+\.\d+\.\d+/;
function generateChangelog(version, date, commits, options) {
    const omittedCommitPatternRegex = options?.omittedCommitPattern
        ? new RegExp(options.omittedCommitPattern)
        : options?.omittedCommitPattern === ""
            ? undefined
            : defaultOmittedCommitPattern;
    const commitScopes = mergeGroups((0, lodash_1.groupBy)(commits.filter((c) => !omittedCommitPatternRegex ||
        !omittedCommitPatternRegex.test(c.subject)), (c) => c.scope ?? ""), detectMerge(options?.scopes ?? {}));
    const scopes = Object.keys(commitScopes);
    const knownScopes = Object.keys(options?.scopes ?? []);
    const unknownScopes = scopes
        .filter((g) => g && !knownScopes.includes(g))
        .sort();
    const scopeEnabled = options?.groupByScopes ??
        (scopes.length > 1 || !!scopes[0] || !!knownScopes.length);
    const formattedDate = (0, date_fns_1.format)(date, options?.dateFormat || defaultDateFormat);
    const result = [
        renderVersionHeader(options?.versionTemplate, version, formattedDate),
        "",
        ...[
            ...Object.entries(options?.scopes ?? []),
            ...unknownScopes.map((g) => [g, g]),
            ["", ""],
        ]
            .filter(([key, g]) => g !== false && commitScopes[key]?.length)
            .flatMap(([key, scope]) => {
            const title = typeof scope === "string" ? scope : scope ? scope.title : undefined;
            return [
                generateChangelogScope({
                    commits: commitScopes[key],
                    scope: scopeEnabled,
                    scopeName: key,
                    scopeTitle: scopeEnabled ? title || key || "" : false,
                    prefixes: options?.prefixes ?? {},
                    repo: (typeof scope === "object" ? scope?.repo : null) ?? options?.repo,
                    dedupSameMessages: options?.dedupSameMessages,
                    capitalizeFirstLetter: options?.capitalizeFirstLetter,
                    linkHashes: options?.linkHashes,
                    linkPRs: options?.linkPRs,
                    scopeTemplate: options?.scopeTemplate,
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
function generateChangelogScope({ commits, scope, scopeName, scopeTitle, prefixes, repo, groupByPrefix = true, scopeTemplate = defaultScopeTemplate, ...options }) {
    if (!commits.length)
        return "";
    const commitPrefixes = !groupByPrefix
        ? {}
        : mergeGroups((0, lodash_1.groupBy)(commits, (c) => c.prefix ?? ""), detectMerge(prefixes));
    const knownPrefixes = Object.keys(prefixes);
    const unknownPrefixes = Object.keys(commitPrefixes)
        .filter((p) => !!p && !knownPrefixes.includes(p))
        .sort()
        .concat(commitPrefixes[""] ? [""] : []);
    return [
        ...(scopeTitle === false
            ? []
            : [
                render(scopeTemplate, {
                    scope,
                    name: scopeName,
                    title: scopeTitle,
                    repo,
                    commits,
                }),
                "",
            ]),
        ...(groupByPrefix
            ? [...Object.entries(prefixes), ...unknownPrefixes.map((p) => [p, p])]
            : [])
            .filter(([key, prefix]) => prefix !== false &&
            (typeof prefix !== "object" || prefix?.title !== false) &&
            commitPrefixes[key]?.length)
            .flatMap(([key, prefix]) => [
            generateChangelogPrefix({
                commits: commitPrefixes[key],
                scope,
                scopeName,
                scopeTitle,
                prefix: key,
                title: (typeof prefix === "object" ? prefix.title : prefix) || key,
                repo,
                ...options,
            }),
            "",
        ])
            .slice(0, -1),
        ...(!groupByPrefix
            ? sortCommits(commits, options.dedupSameMessages).map((commit) => [
                generateChangelogCommit({
                    commit,
                    repo,
                    scope,
                    scopeName,
                    scopeTitle,
                    template: options.commitTemplate,
                    dateFormat: options.commitDateFormat,
                    ...options,
                }),
            ])
            : []),
    ].join("\n");
}
exports.generateChangelogScope = generateChangelogScope;
function generateChangelogPrefix({ commits, prefix, title, repo, scope, scopeName, scopeTitle, dedupSameMessages, prefixTemplate = defaultPrefixTemplate, commitTemplate, commitDateFormat, ...options }) {
    if (!commits?.length)
        return "";
    const processdCommits = sortCommits(commits, dedupSameMessages);
    return [
        render(prefixTemplate, {
            scope,
            scopeName,
            scopeTitle,
            prefix,
            title,
            repo,
            commits: processdCommits,
        }),
        "",
        ...processdCommits
            .map((commit) => generateChangelogCommit({
            commit,
            repo,
            template: commitTemplate,
            scope,
            scopeName,
            scopeTitle,
            dateFormat: commitDateFormat,
            ...options,
        }))
            .filter(Boolean),
    ].join("\n");
}
exports.generateChangelogPrefix = generateChangelogPrefix;
function sortCommits(commits, dedupSameMessages = true) {
    return (dedupSameMessages ? (0, lodash_1.uniqBy)(commits, (c) => c.subject) : commits.concat()).sort((a, b) => b.date.getTime() - a.date.getTime());
}
function generateChangelogCommit({ commit, template = defaultCommitTemplate, repo, scope, scopeName, scopeTitle, dateFormat = defaultDateFormat, capitalizeFirstLetter = true, linkHashes = true, linkPRs = true, }) {
    repo = getRepoUrl(repo);
    const shortHash = commit.hash?.slice(0, 6);
    let message = render(template, {
        ...commit,
        date: (0, date_fns_1.format)(commit.date, dateFormat),
        subject: firstUppercase(commit.subject, capitalizeFirstLetter),
        shortHash,
        repo,
        scope,
        scopeName,
        scopeTitle,
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
function insertChangelog(changelog, inserting, version, template) {
    // remove unreleased section
    if (version !== "unreleased") {
        const u = findVersionSection(changelog, "unreleased", template);
        if (u) {
            changelog =
                changelog.slice(0, u[0]) + (u[1] === null ? "" : changelog.slice(u[1]));
        }
    }
    let m = findVersionSection(changelog, version, template);
    if (!m) {
        const n = version
            ? findVersionSection(changelog, undefined, template)
            : null;
        if (!n)
            return (changelog.trim() + "\n\n" + inserting).trim();
        m = n;
    }
    const [start, end] = m;
    return (changelog.slice(0, start) +
        inserting.trim() +
        "\n\n" +
        (end ? changelog.slice(end) : "")).trim();
}
exports.insertChangelog = insertChangelog;
function renderVersionHeader(template, version, formattedDate) {
    return render(template || defaultVersionTemplate, {
        version,
        versionWithPrefix: `v${version.replace(/^v/, "")}`,
        versionWithoutPrefix: version.replace(/^v/, ""),
        unreleased: version === "unreleased",
        prerelease: !!(0, semver_1.prerelease)(version),
        date: formattedDate,
    });
}
function findVersionSection(changelog, version, template) {
    const trimmedVersion = version?.replace(/^v(\d)/, "$1");
    const tmpl = renderVersionHeader(template, "{{___VERSION___}}", "{{___CHANGELOG_DATE___}}");
    if (!tmpl.includes("{{___VERSION___}}"))
        return null;
    const re = new RegExp(escapeRegex(tmpl)
        .replace("\\{\\{___VERSION___\\}\\}", "(.+)")
        .replace("\\{\\{___CHANGELOG_DATE___\\}\\}", ".+"), "gm");
    let i = null, j = null;
    if (version === "unreleased") {
        const reUnreleased = new RegExp(escapeRegex(renderVersionHeader(template, "unreleased", "{{___CHANGELOG_DATE___}}")).replace("\\{\\{___CHANGELOG_DATE___\\}\\}", ".+"), "m");
        const m = reUnreleased.exec(changelog);
        if (!m)
            return null;
        i = m.index;
    }
    for (let m; (m = re.exec(changelog));) {
        if (!version ||
            (i !== null && m.index !== i) ||
            (version !== "unreleased" &&
                trimmedVersion &&
                m[1].replace(/^v(\d)/, "$1") === trimmedVersion)) {
            if (i !== null) {
                j = m.index;
                break;
            }
            else {
                i = m.index;
                if (!version)
                    break;
            }
        }
    }
    return i !== null ? [i, version ? j : i] : null;
}
exports.findVersionSection = findVersionSection;
function escapeRegex(s) {
    return s.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
}
exports.escapeRegex = escapeRegex;
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
