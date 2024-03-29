# @reearth/changelog-action

A GitHub Action to generate CHANGELOG.md from Git commit histories

- 🔖 Automatic version bumping
- ✨ Generate changelog from commit messages according to Conventional Commits
- 🔧 Easily customizable configuration

```yml
name: Release
on:
  workflow_dispatch:
jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 0 # Do not forget!
      - id: changelog
        name: Generate CHANGELOG
        uses: reearth/changelog-action@main
      - name: Commit & push
        env:
          TAG: ${{ steps.changelog.outputs.version }}
        run: |
          git add CHANGELOG.md
          git commit -am "$TAG"
          git tag $TAG
          git push --atomic origin main $TAG
      - name: Release
        uses: ncipollo/release-action@v1
        with:
          name: ${{ steps.changelog.outputs.version }}
          tag: ${{ steps.changelog.outputs.version }}
          body: ${{ steps.changelog.outputs.changelog }}
```

# Fine Features

- Support scopes (e.g. `chore(scope): xxx`)
- Support unreleased version
- Dedups same commit messages in changelog
- Ignores merge commits and supports commit messages on a merged branch
- Automatic inserting and updating changelog of the new version to the existing CHANGELOG.md
- Outputs changelog for only the new version, which is helpful to use as a body of a new GitHub Release
- Optimizes links of a PR and a commit hash in each commit messages to proper hrefs
- Available as an CLI also: `npm i -g reearth/changelog-action; changelog`

# Not To Do

Some functions have been purposely stripped down to increase versatility:

- Creating and pushing a new Git tag: it depends on your workflow whether you need it or not. You might want to change files such as package.json or push other files together.

# Inputs

```yml
uses: reearth/changelog-action@main
with:
  # A new version ("vX.X.X"), "patch", "minor", "major", "prepatch", "preminor", "premajor", "prerelease", or "unreleased".
  # Default automatically detects a new version from commits.
  version:
  # Release date. Default: current local time
  date:
  # Repository name (owner/name) or URL used in CHANGELOG as the link destination for commits and pull requests.
  repo: ${{ github.repository }}
  # If true, generates CHANGELOG_latest.md also. You can also specify a file name.
  latest: false
  # CHANGELOG.md file path
  output: CHANGELOG.md
  # If true, any files will not be emitted. The result is only available from the outputs.
  noEmit: false
  # Config file path. Default: .github/changelog.yml, .github/changelog.json, .github/changelog.yaml
  config: .github/changelog.yml
```

# Outputs

- `version`: the new version. e.g. `v1.1.1`
- `prevVersion`: the previous version. e.g. `v1.1.0`. If there was no previous version, it will be empty.
- `date`: a date string of the new version. e.g. `2022/06/30`
- `changelog`: the contents of a changelog only for the new version. It is useful for a body of a new GitHub Release.
- `newChangelog`: the whole contents of the new `CHANGELOG.md`
- `oldChangelog`: the whole contents of the previous `CHANGELOG.md`

An example of `changelog` output:

```md
### Features

- Add feat (#3) `xxxxxx`

### Fixes

- Fix bugs (#2) `yyyyyy`
- Fix bugs (#1) `zzzzzz`
```

# Configurations

`.github/changelog.yml`

```yml
repo: reearth/changelog-action
prefixes:
  feat:
    title: Features
  fix: Bug fixes
  '': false # hide commits without prefix
scopes:
  hoge:
    title: Hoge
    repo: reearth/changelog-action-2
disableFirstLetterCapitalization: false
dedupSameMessages: true
includeOldCommits: false
omittedCommitPattern: ^v\d+\.\d+\.\d+
groupByScopes: null
groupByPrefixes: null
versionPrefix: null
minorPrefixes: [feat]
initialVersion: v0.1.0
linkPRs: true
linkHashes: true
dateFormat: yyyy-MM-dd
commitDateFormat: yyyy-MM-dd
defaultChangelog: "# Changelog\n\nAll notable changes to this project will be documented in this file."
versionTemplate: "## {{#unreleased}}Unreleased{{/unreleased}}{{^unreleased}}{{versionWithoutPrefix}} - {{date}}{{/unreleased}}"
scopeTemplate: "### {{title}}"
prefixTemplate: "###{{#scope}}#{{/scope}} {{title}}"
commitTemplate: "- {{subject}}{{#shortHash}} `{{shortHash}}`{{/shortHash}}"
```

```typescript
type Option = {
  repo?: string;
  prefixes?: { [name: string]: { title?: string | false } | string | false };
  scopes?: {
    [name: string]: { title?: string; repo?: string } | string | false;
  };
  // Whether to capitalize the first letter of each commit message
  capitalizeFirstLetter?: boolean;
  // Deduplicate commits for the same message from changelog. Default is true.
  dedupSameMessages?: boolean;
  // Whether to include commits older than the latest tag
  includeOldCommits?: boolean;
  // Regular expression matching the subject of the commit to be omitted from the changelog. An empty string will not omit any commit. Default: ^v\d+\.\d+\.\d+
  omittedCommitPattern?: string;
  // If true, groups commit messages by scopes. Default: null (automatically decided)
  groupByScopes?: boolean;
  // If true, groups commit messages by prefixes. Default: true
  groupByPrefixes?: boolean;
  // Always add or always remove the prefix ("v") from the tag name entered. Default: as is
  versionPrefix?: "add" | "remove";
  // If the next version is not specified, the action automatically detects a new version. If the prefix is one of them, it is treated as a minor update. Default: ["feat"]
  minorPrefixes?: string[];
  // If there are no tags, this version will be used. Default: "v0.1.0"
  initialVersion?: string;
  // Automatically makes the pull request number in the message a link. Default: true
  linkPRs?: boolean;
  // Automatically makes the commit hash in the message a link. Default: true
  linkHashes?: boolean;
  // Date format for a version. Refer to https://date-fns.org/v2.28.0/docs/format Default: "yyyy-MM-dd"
  dateFormat?: string;
  // Date format for a commit. Refer to https://date-fns.org/v2.28.0/docs/format Default: "yyyy-MM-dd"
  commitDateFormat?: string;
  // If there are no contents in CHANGELOG.md, this will be used as default.
  // Default: "# Changelog\n\nAll notable changes to this project will be documented in this file."
  defaultChangelog?: string;
  // Mustache template for a version title
  versionTemplate?: string;
  // Mustache template for a scope title
  scopeTemplate?: string;
  // Mustache template for a prefix title
  prefixTemplate?: string;
  // Mustache template for a commit
  commitTemplate?: string;
}
```

## Templates

Each template can be described in Mustache. For details, see the [mustache documentation](https://mustache.github.io/).

The following is a list of variables that can be accessed in each template.

### versionTemplate

- `version`: version name as is
- `versionWithPrefix`: version name with `v` prefix
- `versionWithoutPrefix`: version name without `v` prefix
- `date`: formatted date by `dateFormat` option
- `unreleased`: whether the version is "unreleased"
- `prerelease`: whether the version is prerelease (e.g. true when version is "0.1.0-beta.1")

### scopeTemplate

- `scope`: whether the scope exists (false when there are no scope in commits)
- `name`: scope name (extracted from the commit subject)
- `title`: scope title for display
- `repo`: repository owner and name (e.g. "reearth/changelog-action")
- `commits`: an array of commit objects of the scope

### prefixTempalte

- `prefix`: prefix name (etc. "feat", "fix", "chore")
- `title`: prefix title
- `repo`: repository owner and name (e.g. "reearth/changelog-action")
- `commits`: an array of commit objects of the prefix used by commitTemplate
- `scope`: whether this prefix is grouped in some scope
- `scopeName`: scope name (extracted from the commit subject)
- `scopeTitle`: scope title for display

### commitTemplate

- `subject`: commit subject
- `body`: commit body
- `prefix`: commit prefix (etc. "feat", "fix", "chore")
- `date`: commit date formatted by `commitDateFormat` option
- `breakingChange`: Whether the commit is marked as a breaking change
- `hash`: Long commit hash
- `shortHash`: Short commit hash
- `repo`: repository owner and name (e.g. "reearth/changelog-action")
- `scope`: whether this commit is grouped in some scope
- `scopeName`: scope name (extracted from the commit subject)
- `scopeTitle`: scope title for display
- `pr`: pr number string if included

# License

[MIT License](LICENSE)
