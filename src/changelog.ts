import { format } from "date-fns";
import { groupBy, uniqBy } from "lodash";
import * as mustache from "mustache";
import { prerelease } from "semver";

const render = mustache.render ?? (mustache as any).default.render;

export type Commit = {
  prefix?: string;
  scope?: string;
  subject: string;
  hash?: string;
  body?: string;
  date: Date;
  breakingChange?: boolean;
  pr?: string;
};

export type Option = {
  repo?: string;
  prefixes?: { [name: string]: { title?: string | false } | string | false };
  scopes?: {
    [name: string]: { title?: string; repo?: string } | string | false;
  };
  capitalizeFirstLetter?: boolean;
  dedupSameMessages?: boolean;
  omittedCommitPattern?: string;
  groupByScopes?: boolean;
  groupByPrefix?: boolean;
  linkPRs?: boolean;
  linkHashes?: boolean;
  dateFormat?: string;
  commitDateFormat?: string;
  versionTemplate?: string;
  scopeTemplate?: string;
  prefixTemplate?: string;
  commitTemplate?: string;
};

const defaultDateFormat = "yyyy-MM-dd";
const defaultVersionTemplate =
  "## {{#unreleased}}Unreleased{{/unreleased}}{{^unreleased}}{{versionWithoutPrefix}} - {{date}}{{/unreleased}}";
const defaultScopeTemplate = "### {{title}}";
const defaultPrefixTemplate = "###{{#scope}}#{{/scope}} {{title}}";
const defaultCommitTemplate =
  "- {{subject}}{{#shortHash}} `{{shortHash}}`{{/shortHash}}";
const defaultOmittedCommitPattern = /^v\d+\.\d+\.\d+/;

export function generateChangelog(
  version: string,
  date: Date,
  commits: Commit[],
  options?: Option
): [string, string, string] {
  const omittedCommitPatternRegex = options?.omittedCommitPattern
    ? new RegExp(options.omittedCommitPattern)
    : options?.omittedCommitPattern === ""
    ? undefined
    : defaultOmittedCommitPattern;

  const commitScopes = mergeGroups(
    groupBy(
      commits.filter(
        (c) =>
          !omittedCommitPatternRegex ||
          !omittedCommitPatternRegex.test(c.subject)
      ),
      (c) => c.scope ?? ""
    ),
    detectMerge(options?.scopes ?? {})
  );

  const scopes = Object.keys(commitScopes);
  const knownScopes = Object.keys(options?.scopes ?? []);
  const unknownScopes = scopes
    .filter((g) => g && !knownScopes.includes(g))
    .sort();
  const scopeEnabled =
    options?.groupByScopes ??
    (scopes.length > 1 || !!scopes[0] || !!knownScopes.length);

  const formattedDate = format(date, options?.dateFormat || defaultDateFormat);
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
        const title =
          typeof scope === "string" ? scope : scope ? scope.title : undefined;
        return [
          generateChangelogScope({
            commits: commitScopes[key],
            scope: scopeEnabled,
            scopeName: key,
            scopeTitle: scopeEnabled ? title || key || "" : false,
            prefixes: options?.prefixes ?? {},
            repo:
              (typeof scope === "object" ? scope?.repo : null) ?? options?.repo,
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

export function generateChangelogScope({
  commits,
  scope,
  scopeName,
  scopeTitle,
  prefixes,
  repo,
  groupByPrefix = true,
  scopeTemplate = defaultScopeTemplate,
  ...options
}: {
  commits: Commit[];
  scope?: boolean;
  scopeName?: string;
  scopeTitle: string | false;
  prefixes: { [name: string]: { title?: string | false } | string | false };
  repo?: string;
  groupByPrefix?: boolean;
  dedupSameMessages?: boolean;
  capitalizeFirstLetter?: boolean;
  omittedCommitPattern?: RegExp;
  linkHashes?: boolean;
  linkPRs?: boolean;
  scopeTemplate?: string;
  prefixTemplate?: string;
  commitTemplate?: string;
  commitDateFormat?: string;
}): string {
  if (!commits.length) return "";
  const commitPrefixes = !groupByPrefix
    ? {}
    : mergeGroups(
        groupBy(commits, (c) => c.prefix ?? ""),
        detectMerge(prefixes)
      );
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
      : []
    )
      .filter(
        ([key, prefix]) =>
          prefix !== false &&
          (typeof prefix !== "object" || prefix?.title !== false) &&
          commitPrefixes[key]?.length
      )
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

export function generateChangelogPrefix({
  commits,
  prefix,
  title,
  repo,
  scope,
  scopeName,
  scopeTitle,
  dedupSameMessages,
  prefixTemplate = defaultPrefixTemplate,
  commitTemplate,
  commitDateFormat,
  ...options
}: {
  commits: Commit[];
  prefix?: string;
  title?: string;
  repo?: string;
  scope?: boolean;
  scopeName?: string;
  scopeTitle?: string | false;
  dedupSameMessages?: boolean;
  capitalizeFirstLetter?: boolean;
  omittedCommitPattern?: RegExp;
  linkHashes?: boolean;
  linkPRs?: boolean;
  prefixTemplate?: string;
  commitTemplate?: string;
  commitDateFormat?: string;
}): string {
  if (!commits?.length) return "";

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
      .map((commit) =>
        generateChangelogCommit({
          commit,
          repo,
          template: commitTemplate,
          scope,
          scopeName,
          scopeTitle,
          dateFormat: commitDateFormat,
          ...options,
        })
      )
      .filter(Boolean),
  ].join("\n");
}

function sortCommits(commits: Commit[], dedupSameMessages = true): Commit[] {
  return (
    dedupSameMessages ? uniqBy(commits, (c) => c.subject) : commits.concat()
  ).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function generateChangelogCommit({
  commit,
  template = defaultCommitTemplate,
  repo,
  scope,
  scopeName,
  scopeTitle,
  dateFormat = defaultDateFormat,
  capitalizeFirstLetter = true,
  linkHashes = true,
  linkPRs = true,
}: {
  commit: Commit;
  template?: string;
  repo?: string;
  scope?: boolean;
  scopeName?: string;
  scopeTitle?: string | false;
  capitalizeFirstLetter?: boolean;
  dateFormat?: string;
  linkHashes?: boolean;
  linkPRs?: boolean;
}): string {
  repo = getRepoUrl(repo);

  const shortHash = commit.hash?.slice(0, 6);
  let message = render(template, {
    ...commit,
    date: format(commit.date, dateFormat),
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

export function prLinks(md: string, repo?: string): string {
  return repo
    ? md.replace(/(^|[^[])#(\d+?)(\D|$)/g, `$1[#$2](${repo}/pull/$2)$3`)
    : md;
}

export function hashLinks(md: string, hash: string, repo?: string): string {
  hash = hash.replace(/[^0-9a-z]/g, "");
  const shortHash = hash.slice(0, 6);
  return repo
    ? md.replace(
        new RegExp(`${hash}|${shortHash}`, "g"),
        `[$&](${repo}/commit/${shortHash})`
      )
    : md;
}

export function fixMarkdownLinkedCode(md: string): string {
  return md.replace(/`\[(.+?)\]\((.+?)\)`/g, "[`$1`]($2)");
}

function getRepoUrl(repo?: string): string {
  return repo?.startsWith("http")
    ? repo.replace(/\/$/, "")
    : repo
    ? `https://github.com/${repo}`
    : "";
}

export function insertChangelog(
  changelog: string,
  inserting: string,
  version?: string,
  template?: string
): string {
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
    if (!n) return (changelog.trim() + "\n\n" + inserting).trim();
    m = n;
  }

  const [start, end] = m;
  return (
    changelog.slice(0, start) +
    inserting.trim() +
    "\n\n" +
    (end ? changelog.slice(end) : "")
  ).trim();
}

function renderVersionHeader(
  template: string | null | undefined,
  version: string,
  formattedDate: string
) {
  return render(template || defaultVersionTemplate, {
    version,
    versionWithPrefix: `v${version.replace(/^v/, "")}`,
    versionWithoutPrefix: version.replace(/^v/, ""),
    unreleased: version === "unreleased",
    prerelease: !!prerelease(version),
    date: formattedDate,
  });
}

export function findVersionSection(
  changelog: string,
  version?: string,
  template?: string
): [number, number | null] | null {
  const trimmedVersion = version?.replace(/^v(\d)/, "$1");
  const tmpl = renderVersionHeader(
    template,
    "{{___VERSION___}}",
    "{{___CHANGELOG_DATE___}}"
  );
  if (!tmpl.includes("{{___VERSION___}}")) return null;

  const re = new RegExp(
    escapeRegex(tmpl)
      .replace("\\{\\{___VERSION___\\}\\}", "(.+)")
      .replace("\\{\\{___CHANGELOG_DATE___\\}\\}", ".+"),
    "gm"
  );

  let i: number | null = null,
    j: number | null = null;

  if (version === "unreleased") {
    const reUnreleased = new RegExp(
      escapeRegex(
        renderVersionHeader(template, "unreleased", "{{___CHANGELOG_DATE___}}")
      ).replace("\\{\\{___CHANGELOG_DATE___\\}\\}", ".+"),
      "m"
    );

    const m = reUnreleased.exec(changelog);
    if (!m) return null;
    i = m.index;
  }

  for (let m; (m = re.exec(changelog)); ) {
    if (
      !version ||
      (i !== null && m.index !== i) ||
      (version !== "unreleased" &&
        trimmedVersion &&
        m[1].replace(/^v(\d)/, "$1") === trimmedVersion)
    ) {
      if (i !== null) {
        j = m.index;
        break;
      } else {
        i = m.index;
        if (!version) break;
      }
    }
  }

  return i !== null ? [i, version ? j : i] : null;
}

export function escapeRegex(s: string): string {
  return s.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
}

export function firstUppercase(subject: string, enabled: boolean): string {
  return enabled ? subject.charAt(0).toUpperCase() + subject.slice(1) : subject;
}

export function detectMerge(o: { [k: string]: unknown }): {
  [k: string]: string;
} {
  const m = new Map(
    Object.entries(o)
      .map<[string, string] | null>(([k, v]) => {
        const t = getTitle(v);
        return t ? [t, k] : null;
      })
      .filter((e): e is [string, string] => !!e)
      .reverse()
  );

  return Object.entries(o).reduce<{ [k: string]: string }>((a, [k, v]) => {
    const t = getTitle(v);
    if (!t) return a;
    const l = m.get(t);
    if (!l || l === k) return a;
    return {
      ...a,
      [k]: l,
    };
  }, {});

  function getTitle(e: unknown): string {
    return typeof e === "string"
      ? e
      : typeof e === "object" &&
        e &&
        "title" in e &&
        typeof (e as any).title === "string"
      ? (e as any).title
      : "";
  }
}

export function mergeGroups<T>(
  o: { [k: string]: T[] },
  m: { [k: string]: string }
): { [k: string]: T[] } {
  return Object.entries(o).reduce<{ [k: string]: T[] }>(
    (a, [k, v]) =>
      m[k]
        ? {
            ...a,
            [m[k]]: [...(a[m[k]] ?? []), ...v],
          }
        : { ...a, [k]: v },
    {}
  );
}
