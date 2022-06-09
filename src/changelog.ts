import { groupBy } from "lodash";

export type Commit = {
  prefix?: string;
  group?: string;
  subject: string;
  hash?: string;
};

export type Option = {
  repo?: string;
  prefix?: { [name: string]: string | false };
  group?: {
    [name: string]: { title?: string; url?: string } | string | false;
  };
  disableFirstLetterCapitalization?: boolean;
};

export function generateChangelog(
  version: string,
  date: Date,
  commits: Commit[],
  options?: Option
): string {
  const groupMerges = detectMerge(
    Object.fromEntries(
      Object.entries(options?.group ?? {})
        .map(([k, v]) => [k, typeof v === "string" ? v : v ? v.title : ""])
        .filter(([, v]) => !!v)
    )
  );
  const commitGroups = mergeGroups(
    groupBy(commits, (c) => c.group ?? ""),
    groupMerges
  );

  const groups = Object.keys(commitGroups);
  const knownGroups = Object.keys(options?.group ?? []);
  const unknownGroups = groups
    .filter((g) => g && !knownGroups.includes(g))
    .sort();
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
        const title =
          typeof group === "string" ? group : group ? group.title : undefined;
        return [
          generateChangelogGroup(
            commitGroups[key],
            groupEnabled ? title || key || "" : false,
            options?.prefix ?? {},
            (typeof group === "object" ? group?.url : null) ?? options?.repo,
            !options?.disableFirstLetterCapitalization
          ),
          "",
        ];
      })
      .slice(0, -1),
  ].join("\n");
}

export function generateChangelogGroup(
  commits: Commit[],
  groupTitle: string | false,
  prefix: { [name: string]: string | false },
  repo?: string,
  capitalizeFirstLetter = true,
  level = 3
): string {
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
      .filter(([key, title]) => title !== false && commitPrefixes[key]?.length)
      .flatMap(([key, title]) => [
        generateChangelogPrefix(
          commitPrefixes[key],
          title || key,
          repo,
          capitalizeFirstLetter,
          groupTitle === false ? level : level + 1
        ),
        "",
      ])
      .slice(0, -1),
  ].join("\n");
}

export function generateChangelogPrefix(
  commits: Commit[],
  title?: string,
  repo?: string,
  capitalizeFirstLetter = true,
  level = 3
): string {
  if (!commits?.length) return "";
  return [
    ...(title ? [`${"#".repeat(level)} ${title}`, ""] : []),
    ...commits.map(
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
  const subject = firstUppercase(
    trimPrefixAndGroup(commit.subject),
    capitalizeFirstLetter
  );
  return repo
    ? `${subject.replace(/\(#([0-9]+)\)/g, `([#$1](${repo}/pull/$1))`)}${
        hash ? ` \`[${hash}](${repo}/commit/${hash})\`` : ""
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

export function trimPrefixAndGroup(subject: string): string {
  return subject.replace(/^([a-z]+?)(?:\((.+?)\))?: /, "");
}

export function detectMerge(o: { [k: string]: unknown }): {
  [k: string]: string;
} {
  const m = new Map(
    Object.entries(o)
      .map<[string, string] | null>(([k, v]) =>
        typeof v === "string" ? [v, k] : null
      )
      .filter((e): e is [string, string] => !!e)
      .reverse()
  );
  return Object.entries(o).reduce<{ [k: string]: string }>((a, [k, v]) => {
    if (typeof v !== "string") return a;
    const l = m.get(v);
    if (!l || l === k) return a;
    return {
      ...a,
      [k]: l,
    };
  }, {});
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
