import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { VcsType } from "./project-config.js";

interface VcsStatusSummary {
  available: boolean;
  vcsType: VcsType;
  branch: string | null;
  clean: boolean | null;
  changedFiles: number;
  lastCommit: string | null;
  upstream: string | null;
  ahead: number | null;
  behind: number | null;
}

const execFileAsync = promisify(execFile);

async function readVcsStatus(
  projectRoot: string,
  vcsType: VcsType
): Promise<VcsStatusSummary> {
  return vcsType === "jj"
    ? readJjStatus(projectRoot)
    : readGitStatus(projectRoot);
}

async function readGitStatus(projectRoot: string): Promise<VcsStatusSummary> {
  if (!(await isGitRepository(projectRoot))) {
    return unavailableSummary("git");
  }

  const porcelain = await runGit(projectRoot, [
    "status",
    "--porcelain=v1",
    "--untracked-files=all"
  ]);
  const changedFiles = porcelain
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .length;
  const branch = await readBranch(projectRoot);
  const lastCommit = await runOptionalGit(projectRoot, [
    "log",
    "-1",
    "--format=%s"
  ]);
  const upstream = await runOptionalGit(projectRoot, [
    "rev-parse",
    "--abbrev-ref",
    "--symbolic-full-name",
    "@{upstream}"
  ]);
  const divergence = upstream
    ? await readDivergence(projectRoot)
    : { ahead: null, behind: null };

  return {
    available: true,
    vcsType: "git",
    branch,
    clean: changedFiles === 0,
    changedFiles,
    lastCommit,
    upstream,
    ahead: divergence.ahead,
    behind: divergence.behind
  };
}

async function isGitRepository(projectRoot: string): Promise<boolean> {
  return (await runOptionalGit(projectRoot, [
    "rev-parse",
    "--is-inside-work-tree"
  ])) === "true";
}

async function readBranch(projectRoot: string): Promise<string> {
  const branch = await runOptionalGit(projectRoot, [
    "symbolic-ref",
    "--quiet",
    "--short",
    "HEAD"
  ]);
  return branch || "(detached HEAD)";
}

async function readDivergence(
  projectRoot: string
): Promise<Pick<VcsStatusSummary, "ahead" | "behind">> {
  const counts = await runOptionalGit(projectRoot, [
    "rev-list",
    "--left-right",
    "--count",
    "HEAD...@{upstream}"
  ]);
  const match = counts?.match(/^(\d+)\s+(\d+)$/);

  return match
    ? { ahead: Number(match[1]), behind: Number(match[2]) }
    : { ahead: null, behind: null };
}

async function runOptionalGit(
  projectRoot: string,
  args: readonly string[]
): Promise<string | null> {
  try {
    return await runGit(projectRoot, args);
  } catch {
    return null;
  }
}

async function runGit(projectRoot: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("git", ["-C", projectRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  return result.stdout.trim();
}

async function readJjStatus(projectRoot: string): Promise<VcsStatusSummary> {
  if (!(await isJjRepository(projectRoot))) {
    return unavailableSummary("jj");
  }

  const summary = await runJj(projectRoot, ["diff", "--summary"]);
  const changedFiles = summary
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .length;
  const bookmarks = await readBookmarks(projectRoot);
  const lastCommit = await runOptionalJj(projectRoot, [
    "log",
    "-r",
    "@",
    "--no-graph",
    "-T",
    "description.first_line()"
  ]);
  const bookmark = bookmarks[0] ?? null;
  const upstream = bookmark
    ? await readUpstreamBookmark(projectRoot, bookmark)
    : null;
  const divergence =
    bookmark && upstream
      ? await readJjDivergence(projectRoot, bookmark, upstream)
      : { ahead: null, behind: null };

  return {
    available: true,
    vcsType: "jj",
    branch: bookmarks.length > 0 ? bookmarks.join(" ") : "(no bookmark)",
    clean: changedFiles === 0,
    changedFiles,
    lastCommit: lastCommit || null,
    upstream,
    ahead: divergence.ahead,
    behind: divergence.behind
  };
}

async function isJjRepository(projectRoot: string): Promise<boolean> {
  return (await runOptionalJj(projectRoot, ["root"])) !== null;
}

async function readBookmarks(projectRoot: string): Promise<string[]> {
  const names = await runOptionalJj(projectRoot, [
    "log",
    "-r",
    "heads(::@ & bookmarks())",
    "--no-graph",
    "-T",
    'bookmarks.map(|bookmark| bookmark.name()).join(" ")'
  ]);

  return names ? names.split(" ").filter((name) => name.length > 0) : [];
}

async function readUpstreamBookmark(
  projectRoot: string,
  bookmark: string
): Promise<string | null> {
  const remotes = await runOptionalJj(projectRoot, [
    "log",
    "-r",
    `remote_bookmarks(exact:${JSON.stringify(bookmark)})`,
    "--no-graph",
    "-T",
    'remote_bookmarks.filter(|remote| remote.remote() != "git").map(|remote| remote.name() ++ "@" ++ remote.remote()).join("\n") ++ "\n"'
  ]);
  const [upstream] = (remotes ?? "").split(/\s+/).filter((name) => name.length > 0);

  return upstream || null;
}

async function readJjDivergence(
  projectRoot: string,
  bookmark: string,
  upstream: string
): Promise<Pick<VcsStatusSummary, "ahead" | "behind">> {
  const ahead = await countRevisions(projectRoot, `${upstream}..${bookmark}`);
  const behind = await countRevisions(projectRoot, `${bookmark}..${upstream}`);

  return ahead === null || behind === null
    ? { ahead: null, behind: null }
    : { ahead, behind };
}

// Jujutsu has no `rev-list --count`, so emit one character per revision.
async function countRevisions(
  projectRoot: string,
  revset: string
): Promise<number | null> {
  const marks = await runOptionalJj(projectRoot, [
    "log",
    "-r",
    revset,
    "--no-graph",
    "-T",
    '"."'
  ]);

  return marks === null ? null : marks.length;
}

async function runOptionalJj(
  projectRoot: string,
  args: readonly string[]
): Promise<string | null> {
  try {
    return await runJj(projectRoot, args);
  } catch {
    return null;
  }
}

async function runJj(projectRoot: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync("jj", ["--repository", projectRoot, ...args], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  return result.stdout.trim();
}

function unavailableSummary(vcsType: VcsType): VcsStatusSummary {
  return {
    available: false,
    vcsType,
    branch: null,
    clean: null,
    changedFiles: 0,
    lastCommit: null,
    upstream: null,
    ahead: null,
    behind: null
  };
}

export { readGitStatus, readJjStatus, readVcsStatus };

export type { VcsStatusSummary };
