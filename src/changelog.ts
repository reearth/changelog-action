import { groupBy, uniqBy } from "lodash";

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
  titleVersionPrefix?: "add" | "remove";
  dedupSameMessages?: boolean;
};

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
  const groupEnabled = groups.length > 1 || !!groups[0] || !!knownGroups.length;

  if (
    options?.titleVersionPrefix == "add" &&
    version &&
    !version.startsWith("v")
  ) {
    version = `v${version}`;
  } else if (
    options?.titleVersionPrefix === "remove" &&
    version?.startsWith("v")
  ) {
    version = version.slice(1);
  }

  const formattedDate = formatDate(date);
  const result = [
    `## ${version} - ${formattedDate}`,
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
            groupTitle: groupEnabled ? title || key || "" : false,
            prefix: options?.prefix ?? {},
            repo:
              (typeof group === "object" ? group?.repo : null) ?? options?.repo,
            dedupSameMessages: options?.dedupSameMessages,
            capitalizeFirstLetter: options?.capitalizeFirstLetter,
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
  groupTitle,
  prefix,
  repo,
  level = 3,
  ...options
}: {
  commits: Commit[];
  groupTitle: string | false;
  prefix: { [name: string]: { title?: string | false } | string | false };
  repo?: string;
  dedupSameMessages?: boolean;
  capitalizeFirstLetter?: boolean;
  level?: number;
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
    ...(groupTitle === false ? [] : [`${"#".repeat(level)} ${groupTitle}`, ""]),
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
          title: (typeof prefix === "object" ? prefix.title : prefix) || key,
          repo,
          level: groupTitle === false ? level : level + 1,
          ...options,
        }),
        "",
      ])
      .slice(0, -1),
  ].join("\n");
}

export function generateChangelogPrefix({
  commits,
  title,
  repo,
  dedupSameMessages = true,
  capitalizeFirstLetter = true,
  level = 3,
}: {
  commits: Commit[];
  title?: string;
  repo?: string;
  dedupSameMessages?: boolean;
  capitalizeFirstLetter?: boolean;
  level?: number;
}): string {
  if (!commits?.length) return "";

  const processdCommits = dedupSameMessages
    ? uniqBy(commits, (c) => c.subject)
    : commits.concat();
  return [
    ...(title ? [`${"#".repeat(level)} ${title}`, ""] : []),
    ...processdCommits
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(
        (c) => "- " + generateChangelogCommit(c, repo, capitalizeFirstLetter)
      ),
  ].join("\n");
}

export function generateChangelogCommit(
  commit: Commit,
  repo?: string,
  capitalizeFirstLetter = true
): string {
  repo = getRepoUrl(repo);
  const hash = commit.hash?.slice(0, 6);
  const subject = firstUppercase(commit.subject, capitalizeFirstLetter);
  return repo
    ? `${subject.replace(/\(#([0-9]+)\)/g, `([#$1](${repo}/pull/$1))`)}${
        hash ? ` [\`${hash}\`](${repo}/commit/${hash})` : ""
      }`
    : `${subject}${hash ? ` \`${hash}\`` : ""}`;
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
  const r = /^## (v?[0-9].+?)(?: - |$)/im;
  const m = r.exec(changelog);
  if (!m || m.index < 0) return (changelog + "\n" + inserting).trim();

  if (version && version == m[1]) {
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

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
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
