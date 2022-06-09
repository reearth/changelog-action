import { groupBy } from "lodash";

export type Commit = {
  prefix?: string;
  group?: string;
  subject: string;
  hash?: string;
};

export type Option = {
  url?: string;
  prefix?: { [name: string]: string | false };
  group?: {
    [name: string]: { title?: string; url?: string } | string | false;
  };
};

export function generateChangelog(
  version: string,
  date: Date,
  commits: Commit[],
  options?: Option
): string {
  const commitGroups = groupBy(commits, (c) => c.group ?? "");
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
            (typeof group === "object" ? group?.url : null) ?? options?.url
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
  url?: string,
  level = 3
): string {
  if (!commits.length) return "";
  const commitPrefixes = groupBy(commits, (c) => c.prefix ?? "");
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
          url,
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
  url?: string,
  level = 3
): string {
  if (!commits?.length) return "";
  return [
    ...(title ? [`${"#".repeat(level)} ${title}`, ""] : []),
    ...commits.map((c) => "- " + generateChangelogCommit(c, url)),
  ].join("\n");
}

export function generateChangelogCommit(commit: Commit, url?: string): string {
  url = url?.startsWith("http")
    ? url.replace(/\/$/, "")
    : url
    ? `https://github.com/${url}`
    : "";
  const hash = commit.hash?.slice(0, 6);
  const subject = trimPrefixAndGroup(commit.subject);
  return url
    ? `${subject.replace(/\(#([0-9]+)\)/g, `([#$1](${url}/pull/$1))`)}${
        hash ? ` \`[${hash}](${url}/commit/${hash})\`` : ""
      }`
    : `${subject}${hash ? ` \`${hash}\`` : ""}`;
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

export function trimPrefixAndGroup(subject: string): string {
  return subject.replace(/^([a-z]+?)(?:\((.+?)\))?: /, "");
}
