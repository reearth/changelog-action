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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const core_1 = require("@actions/core");
const command_line_args_1 = __importDefault(require("command-line-args"));
const command_line_usage_1 = __importDefault(require("command-line-usage"));
const yaml = __importStar(require("js-yaml"));
const action_1 = require("./action");
const changelog_1 = require("./changelog");
const githubAction = !!process.env.GITHUB_ACTIONS;
const defaultChangelog = "# Changelog\n\nAll notable changes to this project will be documented in this file.";
const options = {
    version: (0, core_1.getInput)("version") || process.env.CHANGELOG_VERSION,
    date: (0, core_1.getInput)("date") || process.env.CHANGELOG_DATE,
    repo: (0, core_1.getInput)("repo") || process.env.CHANGELOG_REPO,
    latest: (0, core_1.getInput)("latest") || process.env.CHANGELOG_LATEST,
    output: (0, core_1.getInput)("output") || process.env.CHANGELOG_OUTPUT,
    configPath: (0, core_1.getInput)("config") || process.env.CHANGELOG_CONFIG,
    noEmit: argToBool((0, core_1.getInput)("noEmit") || process.env.CHANGELOG_NO_EMIT, false),
};
const argOptions = [
    { name: "version", type: String, alias: "v" },
    { name: "date", type: String, alias: "d" },
    { name: "repo", type: String, alias: "r" },
    { name: "latest", type: String, alias: "l" },
    { name: "output", type: String, alias: "o" },
    { name: "configPath", type: String, alias: "c" },
    { name: "noEmit", type: Boolean, alias: "n" },
    { name: "help", type: Boolean, alias: "h" },
];
const args = githubAction ? {} : (0, command_line_args_1.default)(argOptions);
if (!githubAction && args.help) {
    console.log((0, command_line_usage_1.default)([
        {
            header: "changelog",
            content: "Generate CHANGELOG.md from git commit logs",
        },
        {
            header: "Options",
            optionList: argOptions,
        },
    ]));
    // eslint-disable-next-line no-process-exit
    process.exit(0);
}
(async function () {
    const { version, date, repo, latest, output = "CHANGELOG.md", configPath = [
        ".github/changelog.yml",
        ".github/changelog.json",
        ".github/changelog.yaml",
    ], noEmit, } = { ...options, ...args };
    const config = await loadJSON(...(Array.isArray(configPath) ? configPath : [configPath]));
    const changelog = await load(output);
    const actualRepo = repo || config?.repo;
    const result = await (0, action_1.exec)(version, dateOrNow(date), {
        ...(config ?? {}),
        repo: actualRepo === "false"
            ? undefined
            : actualRepo || process.env.GITHUB_REPOSITORY,
    });
    const newChangelog = (0, changelog_1.insertChangelog)(changelog && changelog.trim().length > 0
        ? changelog
        : config?.defaultChangelog ?? defaultChangelog, result.changelog, result.version, config?.versionTemplate);
    if (githubAction) {
        (0, core_1.setOutput)("changelog", result.changelogWithoutTitle);
        (0, core_1.setOutput)("version", result.version);
        (0, core_1.setOutput)("date", result.date);
        (0, core_1.setOutput)("prevVersion", result.prevVersion);
        (0, core_1.setOutput)("oldChangelog", changelog);
        (0, core_1.setOutput)("newChangelog", newChangelog);
    }
    if (!noEmit && output !== "-") {
        await fs_1.promises.writeFile(output, newChangelog);
        console.error(`${githubAction ? "\n" : ""}Changelog was saved to ${output}`);
        if (latest) {
            await fs_1.promises.writeFile(latest, result.changelogWithoutTitle);
            console.error(`Changelog only for the new version was saved to ${latest}`);
        }
    }
    else if (!githubAction) {
        console.log(newChangelog);
    }
})().catch((err) => {
    if (githubAction) {
        (0, core_1.setFailed)(err?.message || err);
    }
});
function dateOrNow(date) {
    if (!date)
        return new Date();
    let d = new Date(date);
    if (isNaN(d.getTime())) {
        d = new Date();
    }
    return d;
}
async function load(path) {
    let data;
    try {
        data = await (path && path !== "-"
            ? fs_1.promises.readFile(path, "utf8")
            : readStdin());
    }
    catch (err) {
        if (!err || typeof err !== "object" || err.code !== "ENOENT") {
            throw err;
        }
    }
    return data;
}
async function loadJSON(...paths) {
    for (const path of paths) {
        const data = await load(path);
        if (data) {
            return yaml.load(data);
        }
    }
    return undefined;
}
function argToBool(a, df) {
    if (a === "true")
        return true;
    if (a === "false")
        return false;
    return df;
}
async function readStdin() {
    const buffers = [];
    for await (const chunk of process.stdin) {
        buffers.push(chunk);
    }
    return Buffer.concat(buffers).toString();
}
