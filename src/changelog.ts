import { format } from "date-fns";
import { groupBy, uniqBy } from "lodash";
import * as mustache from "mustache";
import { prerelease } from "semver";

const render = mustache.render ?? (mustache as any).default.render;

export type Commit = {
  prefix?: string;
  group?: string;
  subject: string;
  hash?: string;
  date: Date;
  breakingChange?: boolean;
};

export type Option = {
  repo?: string;
  prefix?: { [name: string]: { title?: string | false } | string | false };
  group?: {
    [name: string]: { title?: string; repo?: string } | string | false;
  };
  capitalizeFirstLetter?: boolean;
  dedupSameMessages?: boolean;
  separateGroups?: boolean;
  linkPRs?: boolean;
  linkHashes?: boolean;
  dateFormat?: string;
  commitDateFormat?: string;
  versionTemplate?: string;
  groupTemplate?: string;
  prefixTemplate?: string;
  commitTemplate?: string;
};

const defaultDateFormat = "yyyy-MM-dd";
const defaultVersionTemplate =
  "## {{#unreleased}}Unreleased{{/unreleased}}{{^unreleased}}{{versionWithoutPrefix}} - {{date}}{{/unreleased}}";
const defaultGroupTemplate = "### {{title}}";
const defaultPrefixTemplate = "###{{#group}}#{{/group}} {{title}}";
const defaultCommitTemplate =
  "- {{subject}}{{#shortHash}} `{{shortHash}}`{{/shortHash}}";

export function generateChangelog(
  version: string,
  date: Date,
  commits: Commit[],
  options?: Option
): [string, string, string] {
  const commitGroups = mergeGroups(
    groupBy(commits, (c) => c.group ?? ""),
    detectMerge(options?.group ?? {})
  );

  const groups = Object.keys(commitGroups);
  const knownGroups = Object.keys(options?.group ?? []);
  const unknownGroups = groups
    .filter((g) => g && !knownGroups.includes(g))
    .sort();
  const groupEnabled =
    options?.separateGroups ??
    (groups.length > 1 || !!groups[0] || !!knownGroups.length);

  const formattedDate = format(date, options?.dateFormat || defaultDateFormat);
  const result = [
    render(options?.versionTemplate || defaultVersionTemplate, {
      version,
      versionWithPrefix: `v${version.replace(/^v/, "")}`,
      versionWithoutPrefix: version.replace(/^v/, ""),
      unreleased: version === "unreleased",
      prerelease: !!prerelease(version),
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
        const title =
          typeof group === "string" ? group : group ? group.title : undefined;
        return [
          generateChangelogGroup({
            commits: commitGroups[key],
            group: groupEnabled,
            groupName: key,
            groupTitle: groupEnabled ? title || key || "" : false,
            prefix: options?.prefix ?? {},
            repo:
              (typeof group === "object" ? group?.repo : null) ?? options?.repo,
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

export function generateChangelogGroup({
  commits,
  group,
  groupName,
  groupTitle,
  prefix,
  repo,
  groupTemplate = defaultGroupTemplate,
  ...options
}: {
  commits: Commit[];
  group?: boolean;
  groupName?: string;
  groupTitle: string | false;
  prefix: { [name: string]: { title?: string | false } | string | false };
  repo?: string;
  dedupSameMessages?: boolean;
  capitalizeFirstLetter?: boolean;
  linkHashes?: boolean;
  linkPRs?: boolean;
  groupTemplate?: string;
  prefixTemplate?: string;
  commitTemplate?: string;
  commitDateFormat?: string;
}): string {
  if (!commits.length) return "";
  const commitPrefixes = mergeGroups(
    groupBy(commits, (c) => c.prefix ?? ""),
    detectMerge(prefix)
  );
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
      .filter(
        ([key, prefix]) =>
          prefix !== false &&
          (typeof prefix !== "object" || prefix?.title !== false) &&
          commitPrefixes[key]?.length
      )
      .flatMap(([key, prefix]) => [
        generateChangelogPrefix({
          commits: commitPrefixes[key],
          group,
          groupName,
          groupTitle,
          prefix: key,
          title: (typeof prefix === "object" ? prefix.title : prefix) || key,
          repo,
          ...options,
        }),
        "",
      ])
      .slice(0, -1),
  ].join("\n");
}

export function generateChangelogPrefix({
  commits,
  prefix,
  title,
  repo,
  group,
  groupName,
  groupTitle,
  dedupSameMessages = true,
  prefixTemplate = defaultPrefixTemplate,
  commitTemplate,
  commitDateFormat,
  ...options
}: {
  commits: Commit[];
  prefix?: string;
  title?: string;
  repo?: string;
  group?: boolean;
  groupName?: string;
  groupTitle?: string | false;
  dedupSameMessages?: boolean;
  capitalizeFirstLetter?: boolean;
  linkHashes?: boolean;
  linkPRs?: boolean;
  prefixTemplate?: string;
  commitTemplate?: string;
  commitDateFormat?: string;
}): string {
  if (!commits?.length) return "";

  const processdCommits = (
    dedupSameMessages ? uniqBy(commits, (c) => c.subject) : commits.concat()
  ).sort((a, b) => b.date.getTime() - a.date.getTime());
  return [
    ...(title
      ? [
          render(prefixTemplate, {
            group,
            groupName,
            groupTitle,
            prefix,
            title,
            repo,
            commits: processdCommits,
          }),
          "",
        ]
      : []),
    ...processdCommits.map((c) =>
      generateChangelogCommit({
        commit: c,
        repo,
        template: commitTemplate,
        dateFormat: commitDateFormat,
        group,
        groupName,
        groupTitle,
        ...options,
      })
    ),
  ].join("\n");
}

export function generateChangelogCommit({
  commit,
  template = defaultCommitTemplate,
  repo,
  group,
  groupName,
  groupTitle,
  dateFormat = defaultDateFormat,
  capitalizeFirstLetter = true,
  linkHashes = true,
  linkPRs = true,
}: {
  commit: Commit;
  template?: string;
  repo?: string;
  group?: boolean;
  groupName?: string;
  groupTitle?: string | false;
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
    group,
    groupName,
    groupTitle,
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
  version?: string
): string {
  changelog = changelog.trim();
  const r = /^## v?([0-9].+?)(?: |$)/im;
  const m = r.exec(changelog);
  if (!m || m.index < 0) return (changelog + "\n\n" + inserting).trim();

  if (version && version.replace(/^v/, "") == m[1]) {
    const n = r.exec(changelog.slice(m.index + m[0].length));
    if (!n || n.index < 0) {
      return (changelog.slice(0, m.index) + inserting).trim();
    }
    return (
      changelog.slice(0, m.index) +
      inserting +
      "\n\n" +
      changelog.slice(m.index + m[0].length + n.index)
    ).trim();
  }

  return (
    changelog.slice(0, m.index) +
    inserting +
    "\n\n" +
    changelog.slice(m.index)
  ).trim();
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
