import { inc, valid } from "semver";
import simpleGit from "simple-git";
const git = simpleGit();
export function getTags() {
    return git.tags();
}
export async function getCommits(from) {
    if (!from) {
        from = (await git.raw(["rev-list", "--max-parents=0", "HEAD"])).trim();
        if (!from) {
            throw new Error("there are no commits in this repo");
        }
    }
    return (await git.log({
        from,
        to: "HEAD",
    })).all
        .filter((l) => !l.message.startsWith("Revert ") &&
        !l.message.startsWith("Merge branch "))
        .map((l) => ({
        subject: l.message,
        hash: l.hash,
        ...getPrefixAndGroup(l.message),
    }));
}
export function getPrefixAndGroup(subject) {
    const m = subject.match(/^([a-z]+?)(?:\((.+?)\))?: /);
    return { prefix: m?.[1], group: m?.[2] };
}
export function isValidVersion(version) {
    return !!valid(version);
}
export function bumpVersion(version, next) {
    if (next === "major" ||
        next === "premajor" ||
        next === "minor" ||
        next === "preminor" ||
        next === "patch" ||
        next === "prepatch" ||
        next === "prerelease") {
        const res = inc(version, next);
        if (!res?.startsWith("v") && version.startsWith("v")) {
            return `v${res}`;
        }
        return res;
    }
    if (!next.startsWith("v") && version.startsWith("v")) {
        return `v${next}`;
    }
    return next;
}
