import groupBy from "lodash.groupby";

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
  const unknownPrefixes = Object.keys(commitPrefixes).filter(
    (p) => p && !knownPrefixes.includes(p)
  );

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
  return url
    ? `${commit.subject.replace(/\(#([0-9]+)\)/g, `([#$1](${url}/pull/$1))`)}${
        hash ? ` \`[${hash}](${url}/commit/${hash})\`` : ""
      }`
    : `${commit.subject}${hash ? ` \`${hash}\`` : ""}`;
}

export function insertChangelog(changelog: string, inserting: string): string {
  const i = changelog.search(/^## v?[0-9]/im);
  if (i < 0) throw new Error("invalid changelog");
  return changelog.slice(0, i) + inserting.trim() + "\n\n" + changelog.slice(i);
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}
