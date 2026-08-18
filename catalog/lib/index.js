import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const TOPIC = "dsh-plugin";
const SELF = "dsh-plugin-catalog";
// First-party plugin hub: its mods are listed ahead of GitHub topic results and
// install from checksummed hub artifacts rather than npm. Overridable for local
// hub development (e.g. http://127.0.0.1:3100).
const HUB_URL = (process.env.DSH_PLUGIN_HUB_URL || "https://plugin-hub-khaki.vercel.app").replace(/\/+$/, "");
// Derived, not hardcoded: this file is checked in and runs on other machines.
// DSH_HOME is <install>/state, so its parent holds the harness's own node_modules.
const EXTRA_PATH = [
  join(homedir(), ".local", "bin"),
  join(homedir(), ".hermes", "node", "bin"),
  "/opt/homebrew/bin",
  "/usr/local/bin",
  process.env.DSH_HOME ? join(process.env.DSH_HOME, "..", "node_modules", ".bin") : null,
].filter(Boolean).join(":");

function profileDir() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "profiles", "web");
}

// The harness reads skills from <projectRoot>/.dsh/skills, <projectRoot>/.agents/
// skills, <DSH_HOME>/skills and ~/.agents/skills. Install into the DSH_HOME root:
// it is harness-scoped, so a bulk install cannot pollute ~/.agents/skills, which
// is shared with the user's other agents.
function skillsRoot() {
  const home = process.env.DSH_HOME;
  if (!home) throw new Error("DSH_HOME is not set");
  return join(home, "skills");
}

function childEnv() {
  return {
    ...process.env,
    PATH: `${EXTRA_PATH}:${process.env.PATH ?? ""}`,
  };
}

async function readManifest() {
  const path = join(profileDir(), "package.json");
  const raw = await readFile(path, "utf8");
  return { path, manifest: JSON.parse(raw) };
}

async function writeManifest(path, manifest) {
  await writeFile(path, `${JSON.stringify(manifest, null, 2)}\n`);
}

async function installedNames() {
  try {
    const { manifest } = await readManifest();
    return {
      dependencies: Object.keys(manifest.dependencies ?? {}),
      bundles: manifest.dsh?.profile?.bundles ?? [],
      installs: manifest.dsh?.catalog?.installs ?? {},
      skills: manifest.dsh?.catalog?.skills ?? {},
    };
  } catch {
    return { dependencies: [], bundles: [], installs: {}, skills: {} };
  }
}

function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: childEnv(),
      cwd: options.cwd ?? process.cwd(),
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ ok: false, code: 127, stdout, stderr: `${command} spawn: ${error.message}` });
    });
    child.on("close", (code) => {
      resolve({ ok: code === 0, code: code ?? 1, stdout, stderr });
    });
  });
}

function parseGithubSpec(spec) {
  const match = /^github:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(spec);
  if (!match) return null;
  return { owner: match[1], repo: match[2], fullName: `${match[1]}/${match[2]}` };
}

function parseHubSpec(spec) {
  const match = /^hub:([A-Za-z0-9][A-Za-z0-9-]*)$/.exec(spec ?? "");
  return match ? match[1] : null;
}

function parseVer(raw) {
  const text = String(raw ?? "").trim().replace(/^[vV]/, "");
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(text);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]), pre: match[4] ?? "" };
}

function cmpVer(aRaw, bRaw) {
  const a = typeof aRaw === "object" && aRaw ? aRaw : parseVer(aRaw);
  const b = typeof bRaw === "object" && bRaw ? bRaw : parseVer(bRaw);
  if (!a || !b) {
    const as = String(aRaw ?? "");
    const bs = String(bRaw ?? "");
    return as < bs ? -1 : as > bs ? 1 : 0;
  }
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (!a.pre && !b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;
  return a.pre < b.pre ? -1 : a.pre > b.pre ? 1 : 0;
}

function satisfiesOne(version, range) {
  const v = parseVer(version);
  if (!v) return false;
  let spec = String(range ?? "").trim();
  if (!spec || spec === "*" || spec === "x") return true;
  let op = "=";
  if (spec.startsWith(">=")) { op = ">="; spec = spec.slice(2).trim(); }
  else if (spec.startsWith("<=")) { op = "<="; spec = spec.slice(2).trim(); }
  else if (spec.startsWith(">")) { op = ">"; spec = spec.slice(1).trim(); }
  else if (spec.startsWith("<")) { op = "<"; spec = spec.slice(1).trim(); }
  else if (spec.startsWith("^")) { op = "^"; spec = spec.slice(1).trim(); }
  else if (spec.startsWith("~")) { op = "~"; spec = spec.slice(1).trim(); }
  const base = parseVer(spec.replace(/[xX]/g, "0"));
  if (!base) return false;
  const cmp = cmpVer(v, base);
  if (op === "=") return cmp === 0;
  if (op === ">=") return cmp >= 0;
  if (op === "<=") return cmp <= 0;
  if (op === ">") return cmp > 0;
  if (op === "<") return cmp < 0;
  if (op === "^") {
    if (cmp < 0) return false;
    if (base.major > 0) return v.major === base.major;
    if (base.minor > 0) return v.major === 0 && v.minor === base.minor;
    return v.major === 0 && v.minor === 0 && v.patch === base.patch;
  }
  if (op === "~") {
    if (cmp < 0) return false;
    return v.major === base.major && v.minor === base.minor;
  }
  return false;
}

function satisfies(version, range) {
  return String(range).split("||").some((part) => {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 1) return tokens.every((token) => satisfiesOne(version, token));
    return satisfiesOne(version, part.trim());
  });
}

function pluginRange(meta) {
  if (!meta) return "";
  const engines = meta.engines ?? {};
  const peers = meta.peerDependencies ?? {};
  return String(
    engines.dsh || engines["@deepseek-ai/dsh"] || peers["@deepseek-ai/dsh"] || peers.dsh || "",
  ).trim();
}

function checkCompat(meta, harness) {
  const range = pluginRange(meta);
  if (!range) return { level: "ok", note: "" };
  if (satisfies(harness, range)) return { level: "ok", note: "" };
  const parsed = parseVer(harness);
  if (parsed?.pre) {
    const release = `${parsed.major}.${parsed.minor}.${parsed.patch}`;
    if (satisfies(release, range)) {
      return {
        level: "warn",
        note: `Plugin range ${range} matches ${release}, but this host is ${harness} (prerelease).`,
      };
    }
  }
  return {
    level: "block",
    note: `Plugin latest asks for harness ${range}; this host is ${harness}.`,
  };
}

async function harnessVersion() {
  const home = process.env.DSH_HOME;
  const candidates = [
    home ? join(home, "..", "node_modules", "@deepseek-ai", "dsh", "package.json") : null,
    join(profileDir(), "..", "..", "..", "node_modules", "@deepseek-ai", "dsh", "package.json"),
  ].filter(Boolean);
  for (const file of candidates) {
    try {
      const pkg = JSON.parse(await readFile(file, "utf8"));
      if (pkg.version) return String(pkg.version);
    } catch {
      /* try next */
    }
  }
  return "unknown";
}

function resolveMappedName(mapped) {
  if (typeof mapped === "string" && mapped) return mapped;
  if (mapped && typeof mapped === "object" && typeof mapped.package === "string") return mapped.package;
  return null;
}

async function installedPackageVersion(name) {
  try {
    const file = join(profileDir(), "node_modules", ...String(name).split("/"), "package.json");
    const pkg = JSON.parse(await readFile(file, "utf8"));
    return pkg.version ? String(pkg.version) : null;
  } catch {
    return null;
  }
}

async function npmInfo(name) {
  try {
    const data = await fetchJson(`https://registry.npmjs.org/${name.replace("/", "%2f")}`);
    const version = data["dist-tags"]?.latest;
    const meta = version ? data.versions?.[version] : null;
    if (!meta) return null;
    return {
      name,
      version,
      isBundle: Boolean(meta?.dsh?.bundle),
      engines: meta.engines ?? {},
      peerDependencies: meta.peerDependencies ?? {},
    };
  } catch {
    return null;
  }
}

// Plugins ship on npm as prebuilt tarballs, and they have real runtime deps
// (schemastery et al) that are NOT in the harness node_modules — so npm, which
// resolves the whole tree, is the install path. pnpm is absent here; npm is not.
async function npmInstall(parsed, pkg) {
  const result = await run(
    "npm",
    [
      "install",
      "--prefix",
      profileDir(),
      "--save",
      "--no-audit",
      "--no-fund",
      `${pkg.name}@${pkg.version}`,
    ],
    { cwd: profileDir() },
  );
  if (!result.ok) return { ...result, method: "npm" };

  const { path, manifest } = await readManifest();
  manifest.dsh = manifest.dsh ?? {};
  manifest.dsh.profile = manifest.dsh.profile ?? {};
  const bundles = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles : [];
  if (!bundles.includes(pkg.name)) bundles.push(pkg.name);
  manifest.dsh.profile.bundles = bundles;
  manifest.dsh.catalog = manifest.dsh.catalog ?? {};
  manifest.dsh.catalog.installs = {
    ...manifest.dsh.catalog.installs,
    [parsed.fullName]: {
      package: pkg.name,
      version: pkg.version,
      harness: await harnessVersion(),
      at: new Date().toISOString(),
    },
  };
  await writeManifest(path, manifest);

  return {
    ok: true,
    code: 0,
    method: "npm",
    packageName: pkg.name,
    version: pkg.version,
    stdout: `Installed ${pkg.name}@${pkg.version} from npm.\n`,
    stderr: "",
  };
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "dsh-plugin-catalog" } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return JSON.parse(await response.text());
}

// Most repos in the topic are monorepos: the root is not a bundle, but one or
// more subdirectories are. Report those instead of a bare "not a plugin".
async function discoverBundles(parsed) {
  try {
    const tree = await fetchJson(
      `https://api.github.com/repos/${parsed.fullName}/git/trees/HEAD?recursive=1`,
    );
    const paths = (tree.tree ?? [])
      .map((node) => node.path)
      .filter(
        (p) =>
          p.endsWith("/package.json") &&
          !p.includes("node_modules/") &&
          !p.includes("/tests/") &&
          !p.includes("/fixtures/"),
      )
      .slice(0, 25);

    const checked = await Promise.all(
      paths.map(async (p) => {
        try {
          const pkg = await fetchJson(
            `https://raw.githubusercontent.com/${parsed.fullName}/HEAD/${p}`,
          );
          if (!pkg?.dsh?.bundle) return null;
          return { path: p.replace(/\/package\.json$/, ""), name: pkg.name ?? null };
        } catch {
          return null;
        }
      }),
    );
    return checked.filter(Boolean);
  } catch {
    return [];
  }
}

// Skills are not plugins: a skill is a directory holding SKILL.md, installed by
// copying it into a skill root. No npm, no bundle, no build — this is the path
// for the many repos in the topic that ship skills rather than packages.
async function discoverSkills(parsed) {
  try {
    const tree = await fetchJson(
      `https://api.github.com/repos/${parsed.fullName}/git/trees/HEAD?recursive=1`,
    );
    const byName = new Map();
    for (const node of tree.tree ?? []) {
      const p = node.path;
      if (!p.endsWith("/SKILL.md")) continue;
      const dir = p.replace(/\/SKILL\.md$/, "");
      // .system holds the repo's own tooling skills; the harness skips them too.
      if (dir.split("/").includes(".system")) continue;
      const name = dir.split("/").pop();
      if (name && !byName.has(name)) byName.set(name, dir);
    }
    return [...byName.entries()].map(([name, path]) => ({ name, path }));
  } catch {
    return [];
  }
}

async function installSkills(parsed, selected) {
  const dest = skillsRoot();
  // Clone to the OS temp dir — never inside a directory the harness watches.
  const staging = join(tmpdir(), `dsh-catalog-${parsed.owner}-${parsed.repo}`);
  await rm(staging, { recursive: true, force: true });

  const clone = await run("git", [
    "clone",
    "--depth",
    "1",
    `https://github.com/${parsed.fullName}.git`,
    staging,
  ]);
  if (!clone.ok) {
    return { ok: false, code: 502, method: "skills", stdout: "", stderr: clone.stderr };
  }

  try {
    await mkdir(dest, { recursive: true });
    const done = [];
    for (const skill of selected) {
      const to = join(dest, skill.name);
      await rm(to, { recursive: true, force: true });
      await cp(join(staging, skill.path), to, { recursive: true });
      done.push(skill.name);
    }

    const { path, manifest } = await readManifest();
    manifest.dsh = manifest.dsh ?? {};
    manifest.dsh.catalog = manifest.dsh.catalog ?? {};
    manifest.dsh.catalog.skills = {
      ...manifest.dsh.catalog.skills,
      [parsed.fullName]: [
        ...new Set([...(manifest.dsh.catalog.skills?.[parsed.fullName] ?? []), ...done]),
      ],
    };
    await writeManifest(path, manifest);

    return {
      ok: true,
      code: 0,
      method: "skills",
      skillCount: done.length,
      stdout:
        `Installed ${done.length} skill${done.length === 1 ? "" : "s"} into ${dest}:\n` +
        done.map((n) => `  · ${n}`).join("\n") +
        `\n`,
      stderr: "",
    };
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

function notInstallable(fullName, found = []) {
  if (!found.length) {
    return {
      ok: false,
      code: 422,
      method: "rejected",
      stdout: "",
      stderr:
        `${fullName} is not a DeepSeek Harness plugin — nothing in the repo declares ` +
        `"dsh.bundle". Nothing was installed and nothing was changed.`,
    };
  }
  return {
    ok: false,
    code: 422,
    method: "rejected",
    stdout: "",
    stderr:
      `${fullName} contains ${found.length} plugin${found.length > 1 ? "s" : ""}, but ` +
      `none are published on npm, so there is no built package to install — the repo ` +
      `ships source only and would need a full build:\n` +
      found.map((f) => `  · ${f.path}${f.name ? `  (${f.name})` : ""}`).join("\n") +
      `\n\nNothing was installed and nothing was changed.`,
  };
}

async function repoRootPackage(parsed) {
  try {
    return await fetchJson(
      `https://raw.githubusercontent.com/${parsed.fullName}/HEAD/package.json`,
    );
  } catch {
    return null;
  }
}

// A repo is a browse target; the installable unit is an npm package. The root is
// usually a monorepo, so look there first and then at each subpackage.
async function resolveCandidates(parsed) {
  const root = await repoRootPackage(parsed);
  if (root?.dsh?.bundle && root.name) {
    const info = await npmInfo(root.name);
    if (info?.isBundle) return { published: [info], found: [{ path: ".", name: root.name }] };
  }
  const found = await discoverBundles(parsed);
  const infos = await Promise.all(found.map((f) => (f.name ? npmInfo(f.name) : null)));
  return { published: infos.filter((i) => i?.isBundle), found };
}

async function installSpec(spec, requested, requestedSkills, force = false) {
  const parsed = parseGithubSpec(spec);
  if (!parsed) {
    return { ok: false, code: 400, method: "failed", stdout: "", stderr: "Invalid github spec" };
  }

  // The client picked one package out of a multi-plugin repo.
  if (requested) {
    const info = await npmInfo(requested);
    if (!info?.isBundle) {
      return {
        ok: false,
        code: 422,
        method: "rejected",
        stdout: "",
        stderr: `${requested} is not a dsh plugin published on npm. Nothing was changed.`,
      };
    }
    return gateInstall(parsed, info, force);
  }

  const { published, found } = await resolveCandidates(parsed);
  if (published.length === 1) return gateInstall(parsed, published[0], force);
  if (published.length > 1) {
    return {
      ok: false,
      code: 300,
      method: "choices",
      candidates: published.map((p) => ({ name: p.name, version: p.version })),
      stdout: "",
      stderr: `${parsed.fullName} ships ${published.length} plugins — pick one to install.`,
    };
  }

  // No installable package: the repo may still ship skills, which need no npm.
  const skills = await discoverSkills(parsed);
  if (skills.length) {
    if (!requestedSkills) {
      return {
        ok: false,
        code: 300,
        method: "skills-confirm",
        skills: skills.map((s) => s.name),
        root: skillsRoot(),
        stdout: "",
        stderr:
          `${parsed.fullName} ships no installable plugin, but it does contain ` +
          `${skills.length} skill${skills.length === 1 ? "" : "s"}. Skills are plain ` +
          `directories — no npm needed. They would be copied into:\n  ${skillsRoot()}\n\n` +
          `That root is used only by the harness, so this will not touch ` +
          `~/.agents/skills, which your other agents share. Installing all ` +
          `${skills.length} adds every one of them to the agent's skill catalog.`,
      };
    }
    const wanted = Array.isArray(requestedSkills)
      ? skills.filter((s) => requestedSkills.includes(s.name))
      : skills;
    if (!wanted.length) {
      return {
        ok: false,
        code: 422,
        method: "rejected",
        stdout: "",
        stderr: "None of the requested skills exist in that repo.",
      };
    }
    return installSkills(parsed, wanted);
  }

  return notInstallable(parsed.fullName, found);
}

function resolvePackageName(fullName, repoName, installed) {
  const mapped = resolveMappedName(installed.installs[fullName]);
  if (mapped) return mapped;
  // Installed before the repo->package map existed, or added by hand.
  if (installed.dependencies.includes(repoName) || installed.bundles.includes(repoName)) {
    return repoName;
  }
  // Scoped packages: @owner/repo published from this repo.
  const scoped = installed.dependencies.find(
    (dep) => dep === fullName || dep.endsWith(`/${repoName}`),
  );
  return scoped ?? null;
}

async function uninstallSpec(spec) {
  const parsed = parseGithubSpec(spec);
  if (!parsed) return { ok: false, code: 400, stdout: "", stderr: "Invalid github spec" };

  const installed = await installedNames();

  // Skill installs are file copies, not packages — remove the copied directories.
  const installedSkills = installed.skills[parsed.fullName];
  if (Array.isArray(installedSkills) && installedSkills.length) {
    for (const name of installedSkills) {
      await rm(join(skillsRoot(), name), { recursive: true, force: true });
    }
    const { path, manifest } = await readManifest();
    if (manifest.dsh?.catalog?.skills) delete manifest.dsh.catalog.skills[parsed.fullName];
    await writeManifest(path, manifest);
    return {
      ok: true,
      code: 0,
      method: "skills",
      stdout: `Removed ${installedSkills.length} skill(s) from ${skillsRoot()}.\n`,
      stderr: "",
    };
  }

  const packageName = resolvePackageName(parsed.fullName, parsed.repo, installed);
  if (!packageName) {
    return { ok: false, code: 404, stdout: "", stderr: `${parsed.fullName} is not installed` };
  }
  if (packageName === SELF) {
    return {
      ok: false,
      code: 400,
      stdout: "",
      stderr: "Refusing to remove the catalog plugin itself — that would delete this tab.",
    };
  }

  // Let npm remove the package and its now-unreferenced deps; the manifest edits
  // below then drop the bundle wiring npm knows nothing about.
  const removed = await run(
    "npm",
    ["uninstall", "--prefix", profileDir(), "--no-audit", "--no-fund", packageName],
    { cwd: profileDir() },
  );

  const { path, manifest } = await readManifest();
  if (manifest.dependencies) delete manifest.dependencies[packageName];
  if (Array.isArray(manifest.dsh?.profile?.bundles)) {
    manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((b) => b !== packageName);
  }
  if (manifest.dsh?.catalog?.installs) delete manifest.dsh.catalog.installs[parsed.fullName];
  await writeManifest(path, manifest);

  // Defensive: npm leaves nothing behind for a normal install, but a package
  // linked by an older build of this plugin is not npm's to remove.
  await rm(join(profileDir(), "node_modules", packageName), { recursive: true, force: true });

  return {
    ok: true,
    code: 0,
    method: "npm",
    packageName,
    stdout: `Removed ${packageName}.\n${removed.ok ? "" : removed.stderr}`,
    stderr: "",
  };
}

async function updateSpec(spec, requested, force = false) {
  const parsed = parseGithubSpec(spec);
  if (!parsed) {
    return { ok: false, code: 400, method: "failed", stdout: "", stderr: "Invalid github spec" };
  }

  const installed = await installedNames();
  const packageName = requested || resolvePackageName(parsed.fullName, parsed.repo, installed);
  if (!packageName) {
    return { ok: false, code: 404, method: "failed", stdout: "", stderr: `${parsed.fullName} is not installed` };
  }
  if (packageName === SELF) {
    return {
      ok: false,
      code: 400,
      method: "rejected",
      stdout: "",
      stderr: "Refusing to update the catalog plugin itself.",
    };
  }

  const info = await npmInfo(packageName);
  if (!info?.isBundle) {
    return {
      ok: false,
      code: 422,
      method: "rejected",
      stdout: "",
      stderr: `${packageName} is not a dsh plugin published on npm. Nothing was changed.`,
    };
  }

  const current = await installedPackageVersion(packageName);
  if (current && cmpVer(current, info.version) >= 0) {
    return {
      ok: true,
      code: 0,
      method: "noop",
      packageName,
      version: current,
      stdout: `${packageName} is already at ${current}.\n`,
      stderr: "",
    };
  }

  return gateInstall(parsed, info, force);
}

async function updateAll(force = false) {
  const installed = await installedNames();
  const harness = await harnessVersion();
  const lines = [];
  const results = [];
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const [fullName, rec] of Object.entries(installed.installs)) {
    const packageName = resolveMappedName(rec);
    if (!packageName || packageName === SELF) continue;

    if (fullName.startsWith("hub:")) {
      const slug = fullName.slice(4);
      hubDetailCache.delete(slug);
      const detail = await hubModDetail(slug);
      if (!detail?.latest) {
        skipped += 1;
        results.push({ spec: fullName, packageName, skipped: true, reason: "hub unreachable" });
        continue;
      }
      const currentHub = await installedPackageVersion(packageName);
      if (currentHub && cmpVer(currentHub, detail.latest) >= 0) {
        skipped += 1;
        continue;
      }
      const hubCompat = checkCompat({ engines: detail.engines ?? {}, peerDependencies: {} }, harness);
      if (hubCompat.level !== "ok" && !force) {
        skipped += 1;
        results.push({
          spec: fullName, packageName, skipped: true, compat: hubCompat.level, reason: hubCompat.note,
        });
        lines.push(`Skipped ${packageName}: ${hubCompat.note}`);
        continue;
      }
      const hubResult = await installHub(slug, true);
      results.push({
        spec: fullName, packageName, version: detail.latest,
        ok: hubResult.ok, stderr: hubResult.stderr,
      });
      if (hubResult.ok) {
        updated += 1;
        lines.push(`Updated ${packageName}@${detail.latest} (hub)`);
      } else {
        failed += 1;
        lines.push(`Failed ${packageName}: ${(hubResult.stderr || "").replace(/\s+/g, " ").slice(0, 200)}`);
      }
      continue;
    }

    const parsed = parseGithubSpec(`github:${fullName}`);
    if (!parsed) continue;

    const info = await npmInfo(packageName);
    if (!info?.isBundle) {
      skipped += 1;
      results.push({ spec: `github:${fullName}`, packageName, skipped: true, reason: "not on npm" });
      continue;
    }

    const current = await installedPackageVersion(packageName);
    if (current && cmpVer(current, info.version) >= 0) {
      skipped += 1;
      continue;
    }

    const compat = checkCompat(info, harness);
    if (compat.level !== "ok" && !force) {
      skipped += 1;
      results.push({
        spec: `github:${fullName}`,
        packageName,
        skipped: true,
        compat: compat.level,
        reason: compat.note,
      });
      lines.push(`Skipped ${packageName}: ${compat.note}`);
      continue;
    }

    const result = await npmInstall(parsed, info);
    results.push({
      spec: `github:${fullName}`,
      packageName,
      version: info.version,
      ok: result.ok,
      stderr: result.stderr,
    });
    if (result.ok) {
      updated += 1;
      lines.push(`Updated ${packageName}@${info.version}`);
    } else {
      failed += 1;
      lines.push(`Failed ${packageName}: ${(result.stderr || "").replace(/\s+/g, " ").slice(0, 200)}`);
    }
  }

  const summary =
    `Updated ${updated}, skipped ${skipped}, failed ${failed}.` +
    (lines.length ? `\n${lines.join("\n")}` : "") +
    (updated ? "\nRestart the GUI to load the new versions.\n" : "\n");

  return {
    ok: failed === 0,
    code: failed ? 500 : 0,
    method: "update-all",
    updated,
    skipped,
    failed,
    results,
    stdout: summary,
    stderr: "",
  };
}

// Cover art = the social preview the owner actually uploaded. GitHub will always
// serve *something* from opengraph.githubassets.com, but for a repo without a
// preview that is an auto-generated card repeating the name, description and
// star count already on our card — redundant, and white-on-dark here. Only a
// repository-images.githubusercontent.com URL is real art.
const coverCache = new Map();

async function resolveCover(fullName) {
  if (coverCache.has(fullName)) return coverCache.get(fullName);

  let found = null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`https://github.com/${fullName}`, {
      headers: { "User-Agent": "dsh-plugin-catalog", Accept: "text/html" },
      signal: controller.signal,
    });
    if (response.ok && response.body) {
      // og:image lives in <head>; stop reading as soon as we have it rather
      // than pulling ~500KB of repo page per card.
      let buffer = "";
      for await (const chunk of response.body) {
        buffer += Buffer.from(chunk).toString("utf8");
        const match = /<meta[^>]+property="og:image"[^>]+content="([^"]+)"/.exec(buffer);
        if (match) {
          found = match[1];
          break;
        }
        if (buffer.length > 150000) break;
      }
    }
  } catch {
    /* offline, throttled, or aborted — treated as "no cover" */
  } finally {
    clearTimeout(timer);
    controller.abort();
  }

  const custom = found?.includes("repository-images.githubusercontent.com") ? found : null;
  coverCache.set(fullName, custom);
  return custom;
}

async function mapWithLimit(values, limit, worker) {
  const out = new Array(values.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor;
      cursor += 1;
      out[index] = await worker(values[index]);
    }
  });
  await Promise.all(runners);
  return out;
}

function mapRepo(item, installed) {
  const packageName = resolvePackageName(item.full_name, item.name, installed);
  const skillNames = installed.skills[item.full_name];
  const skillCount = Array.isArray(skillNames) ? skillNames.length : 0;
  const rec = installed.installs[item.full_name];
  return {
    id: item.full_name,
    name: item.full_name,
    description: item.description ?? "",
    stars: item.stargazers_count ?? 0,
    language: item.language ?? "",
    updatedAt: item.updated_at ?? "",
    htmlUrl: item.html_url,
    coverUrl: item.__cover ?? null,
    topics: Array.isArray(item.topics) ? item.topics : [],
    spec: `github:${item.full_name}`,
    packageName,
    skillCount,
    installed: Boolean(packageName) || skillCount > 0,
    removable: (Boolean(packageName) && packageName !== SELF) || skillCount > 0,
    updatable: Boolean(packageName) && packageName !== SELF,
    harnessAtInstall: rec && typeof rec === "object" ? rec.harness ?? null : null,
    installedVersion: null,
    latestVersion: null,
    updateAvailable: false,
    compat: "ok",
    compatNote: "",
  };
}

async function enrichInstalled(item, installed, harness) {
  if (!item.packageName || !item.updatable) return item;
  const rec = installed.installs[item.id];
  const recorded = rec && typeof rec === "object" ? rec.version ?? null : null;
  const installedVersion = (await installedPackageVersion(item.packageName)) || recorded || null;
  const latest = await npmInfo(item.packageName);
  const latestVersion = latest?.version ?? null;
  const updateAvailable = Boolean(
    installedVersion && latestVersion && cmpVer(installedVersion, latestVersion) < 0,
  );
  const compat = latest ? checkCompat(latest, harness) : { level: "ok", note: "" };
  return {
    ...item,
    installedVersion,
    latestVersion,
    updateAvailable,
    compat: compat.level,
    compatNote: compat.note,
  };
}

async function gateInstall(parsed, pkg, force) {
  const harness = await harnessVersion();
  const compat = checkCompat(pkg, harness);
  if ((compat.level === "block" || compat.level === "warn") && !force) {
    return {
      ok: false,
      code: 412,
      method: "compat",
      compat: compat.level,
      compatNote: compat.note,
      packageName: pkg.name,
      version: pkg.version,
      stdout: "",
      stderr: compat.note,
    };
  }
  const result = await npmInstall(parsed, pkg);
  return { ...result, compat: compat.level, compatNote: compat.note };
}

// --- Plugin hub (first-party, priority source) -------------------------------

async function hubApi(path) {
  try {
    return await fetchJson(`${HUB_URL}/api/v1${path}`);
  } catch {
    return null;
  }
}

// Details (package name, engines, artifact) come from the per-mod endpoint;
// cached per listing pass so install/update don't re-fetch, and cleared at the
// start of each searchHub so a reload always sees fresh versions.
const hubDetailCache = new Map();

async function hubModDetail(slug) {
  if (hubDetailCache.has(slug)) return hubDetailCache.get(slug);
  const payload = await hubApi(`/games/dsh/mods/${slug}?include=files`);
  const detail = payload?.ok ? payload : null;
  hubDetailCache.set(slug, detail);
  return detail;
}

async function mapHubMod(mod, installed, harness) {
  const detail = await hubModDetail(mod.slug);
  const packageName = detail?.package ?? `dsh-plugin-${mod.slug}`;
  const key = `hub:${mod.slug}`;
  const rec = installed.installs[key];
  const recorded = rec && typeof rec === "object" ? rec.version ?? null : null;
  const isSelf = packageName === SELF;
  const installedVersion = (await installedPackageVersion(packageName)) || recorded || null;
  const isInstalled = Boolean(
    installedVersion ||
    installed.dependencies.includes(packageName) ||
    installed.bundles.includes(packageName)
  );
  const latestVersion = mod.latest ?? detail?.latest ?? null;
  const updateAvailable = Boolean(
    !isSelf && installedVersion && latestVersion && cmpVer(installedVersion, latestVersion) < 0,
  );
  const compat = detail
    ? checkCompat({ engines: detail.engines ?? {}, peerDependencies: {} }, harness)
    : { level: "ok", note: "" };
  return {
    id: key,
    name: mod.name ?? mod.slug,
    description: mod.summary ?? "",
    stars: 0,
    language: "",
    updatedAt: "",
    htmlUrl: `${HUB_URL}/harness/mods/${mod.slug}`,
    coverUrl: null,
    topics: Array.isArray(mod.categories) ? mod.categories : [],
    spec: key,
    hub: true,
    author: mod.author ?? "",
    packageName,
    skillCount: 0,
    installed: isInstalled,
    removable: isInstalled && !isSelf,
    updatable: isInstalled && !isSelf,
    harnessAtInstall: rec && typeof rec === "object" ? rec.harness ?? null : null,
    installedVersion,
    latestVersion,
    updateAvailable,
    compat: compat.level,
    compatNote: compat.note,
  };
}

async function searchHub(query, installed, harness) {
  hubDetailCache.clear();
  const q = `?limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`;
  const payload = await hubApi(`/games/dsh/mods${q}`);
  if (!payload?.ok || !Array.isArray(payload.mods)) return { ok: false, items: [] };
  const items = await mapWithLimit(payload.mods, 4, (mod) => mapHubMod(mod, installed, harness));
  return { ok: true, items };
}

// Hub artifacts are npm tarballs behind a sha256 the hub publishes. Download to
// a stable cache inside the profile, verify, then hand npm the local file — so
// a corrupted or swapped blob fails before anything is installed.
async function downloadHubArtifact(artifact) {
  const dir = join(profileDir(), ".catalog");
  await mkdir(dir, { recursive: true });
  const dest = join(dir, artifact.name);
  const response = await fetch(artifact.url, { headers: { "User-Agent": "dsh-plugin-catalog" } });
  if (!response.ok) throw new Error(`Hub artifact fetch failed (HTTP ${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const digest = createHash("sha256").update(buffer).digest("hex");
  if (artifact.sha256 && digest !== artifact.sha256) {
    throw new Error(
      `Checksum mismatch for ${artifact.name}: hub says ${artifact.sha256}, got ${digest}. Nothing was installed.`,
    );
  }
  await writeFile(dest, buffer);
  return dest;
}

async function installHub(slug, force = false) {
  const detail = await hubModDetail(slug);
  if (!detail) {
    return {
      ok: false, code: 502, method: "failed", stdout: "",
      stderr: `The hub has no mod dsh/${slug}, or the hub is unreachable.`,
    };
  }
  const artifact = detail.files?.artifacts?.[0];
  if (!artifact?.url) {
    return {
      ok: false, code: 422, method: "rejected", stdout: "",
      stderr: `dsh/${slug} has no downloadable artifact on the hub yet.`,
    };
  }
  const pkg = {
    name: detail.package ?? `dsh-plugin-${slug}`,
    version: detail.latest ?? "0.0.0",
    engines: detail.engines ?? {},
    peerDependencies: {},
  };
  const harness = await harnessVersion();
  const compat = checkCompat(pkg, harness);
  if ((compat.level === "block" || compat.level === "warn") && !force) {
    return {
      ok: false, code: 412, method: "compat", compat: compat.level, compatNote: compat.note,
      packageName: pkg.name, version: pkg.version, stdout: "", stderr: compat.note,
    };
  }

  try {
    await downloadHubArtifact(artifact);
  } catch (error) {
    return { ok: false, code: 502, method: "failed", stdout: "", stderr: String(error?.message ?? error) };
  }

  // Relative to profileDir (the cwd) so the saved dependency spec is portable.
  const relTarball = `.catalog/${artifact.name}`;
  const result = await run(
    "npm",
    ["install", "--prefix", profileDir(), "--save", "--no-audit", "--no-fund", relTarball],
    { cwd: profileDir() },
  );
  if (!result.ok) return { ...result, method: "npm" };

  const { path, manifest } = await readManifest();
  manifest.dsh = manifest.dsh ?? {};
  manifest.dsh.profile = manifest.dsh.profile ?? {};
  const bundles = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles : [];
  if (!bundles.includes(pkg.name)) bundles.push(pkg.name);
  manifest.dsh.profile.bundles = bundles;
  manifest.dsh.catalog = manifest.dsh.catalog ?? {};
  manifest.dsh.catalog.installs = {
    ...manifest.dsh.catalog.installs,
    [`hub:${slug}`]: {
      package: pkg.name,
      version: pkg.version,
      harness,
      at: new Date().toISOString(),
    },
  };
  await writeManifest(path, manifest);
  hubDetailCache.delete(slug);

  return {
    ok: true, code: 0, method: "hub", packageName: pkg.name, version: pkg.version,
    compat: compat.level, compatNote: compat.note,
    stdout: `Installed ${pkg.name}@${pkg.version} from the plugin hub (sha256 verified).\n`,
    stderr: "",
  };
}

// Hub installs are tracked under `hub:<slug>`, but a plugin may have been
// installed by hand or before hub tracking existed. Fall back to the package
// the hub says this slug ships, when it is present in the profile.
async function hubPackageName(slug, installed) {
  const mapped = resolveMappedName(installed.installs[`hub:${slug}`]);
  if (mapped) return mapped;
  const detail = await hubModDetail(slug);
  const candidate = detail?.package ?? `dsh-plugin-${slug}`;
  if (installed.dependencies.includes(candidate) || installed.bundles.includes(candidate)) {
    return candidate;
  }
  return null;
}

async function uninstallHub(slug) {
  const installed = await installedNames();
  const packageName = await hubPackageName(slug, installed);
  if (!packageName) {
    return { ok: false, code: 404, stdout: "", stderr: `hub:${slug} is not installed` };
  }
  if (packageName === SELF) {
    return {
      ok: false, code: 400, stdout: "",
      stderr: "Refusing to remove the catalog plugin itself — that would delete this tab.",
    };
  }

  const removed = await run(
    "npm",
    ["uninstall", "--prefix", profileDir(), "--no-audit", "--no-fund", packageName],
    { cwd: profileDir() },
  );

  const { path, manifest } = await readManifest();
  if (manifest.dependencies) delete manifest.dependencies[packageName];
  if (Array.isArray(manifest.dsh?.profile?.bundles)) {
    manifest.dsh.profile.bundles = manifest.dsh.profile.bundles.filter((b) => b !== packageName);
  }
  if (manifest.dsh?.catalog?.installs) delete manifest.dsh.catalog.installs[`hub:${slug}`];
  await writeManifest(path, manifest);

  await rm(join(profileDir(), "node_modules", packageName), { recursive: true, force: true });

  return {
    ok: true, code: 0, method: "npm", packageName,
    stdout: `Removed ${packageName}.\n${removed.ok ? "" : removed.stderr}`,
    stderr: "",
  };
}

async function updateHub(slug, force = false) {
  const installed = await installedNames();
  const packageName = await hubPackageName(slug, installed);
  if (!packageName) {
    return { ok: false, code: 404, method: "failed", stdout: "", stderr: `hub:${slug} is not installed` };
  }
  if (packageName === SELF) {
    return {
      ok: false, code: 400, method: "rejected", stdout: "",
      stderr: "Refusing to update the catalog plugin itself.",
    };
  }
  const detail = await hubModDetail(slug);
  if (!detail?.latest) {
    return {
      ok: false, code: 502, method: "failed", stdout: "",
      stderr: `The hub has no mod dsh/${slug}, or the hub is unreachable.`,
    };
  }
  const current = await installedPackageVersion(packageName);
  if (current && cmpVer(current, detail.latest) >= 0) {
    return {
      ok: true, code: 0, method: "noop", packageName, version: current,
      stdout: `${packageName} is already at ${current}.\n`, stderr: "",
    };
  }
  return installHub(slug, force);
}

// --- GitHub topic (community fallback) ----------------------------------------

async function searchGithub(query, installed, harness) {
  const q = query ? `${query} topic:${TOPIC}` : `topic:${TOPIC}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=50`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "dsh-plugin-catalog",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GitHub search failed (${response.status}): ${body.slice(0, 400)}`);
  }
  const payload = await response.json();
  const rawItems = Array.isArray(payload.items) ? payload.items : [];
  const covers = await mapWithLimit(rawItems, 8, (item) => resolveCover(item.full_name));
  const items = rawItems.map((item, index) => ({ ...item, __cover: covers[index] }));
  const mapped = items.map((item) => mapRepo(item, installed));
  const enriched = await mapWithLimit(mapped, 6, (item) => enrichInstalled(item, installed, harness));
  return {
    total: payload.total_count ?? items.length,
    topic: TOPIC,
    topicUrl: "https://github.com/topics/dsh-plugin",
    installed: installed.dependencies,
    harness,
    updates: enriched.filter((item) => item.updateAvailable).length,
    items: enriched,
  };
}

// Hub first, GitHub second: first-party mods are checksummed and curated, so
// they lead the list; the GitHub topic remains as the community long tail. A
// hub outage never blocks the catalog — it just drops the priority section.
// --- Demo mode (master suppression switch) ------------------------------------
// Stashes the profile's bundle list and boots with only this catalog plugin,
// so the interface can be shown with and without community plugins. The
// catalog must stay loaded or there is no switch left to turn it back off.
// Bundles are read at boot, so a restart applies the change.

async function demoState() {
  try {
    const { manifest } = await readManifest();
    const bundles = manifest.dsh?.profile?.bundles ?? [];
    const stash = manifest.dsh?.catalog?.demoStash;
    return {
      suppressed: Array.isArray(stash),
      active: bundles,
      hidden: Array.isArray(stash)
        ? stash.filter((b) => b !== SELF && !b.startsWith("@deepseek-ai/"))
        : [],
    };
  } catch {
    return { suppressed: false, active: [], hidden: [] };
  }
}

async function setDemoMode(on) {
  const { path, manifest } = await readManifest();
  manifest.dsh = manifest.dsh ?? {};
  manifest.dsh.profile = manifest.dsh.profile ?? {};
  manifest.dsh.catalog = manifest.dsh.catalog ?? {};
  const current = Array.isArray(manifest.dsh.profile.bundles) ? manifest.dsh.profile.bundles : [];
  const stash = manifest.dsh.catalog.demoStash;

  if (on && !Array.isArray(stash)) {
    manifest.dsh.catalog.demoStash = current;
    // Keep the harness's own base bundles (they gate the shell stacks) and this
    // catalog (the switch must survive, or there is no way back).
    manifest.dsh.profile.bundles = current.filter((b) => b.startsWith("@deepseek-ai/") || b === SELF);
    await writeManifest(path, manifest);
    return { suppressed: true, hidden: current.filter((b) => !b.startsWith("@deepseek-ai/") && b !== SELF), restart: true };
  }
  if (!on && Array.isArray(stash)) {
    // Plugins installed while suppressed are kept — merge them into the restore.
    const merged = [...stash, ...current.filter((b) => b !== SELF && !stash.includes(b))];
    manifest.dsh.profile.bundles = merged;
    delete manifest.dsh.catalog.demoStash;
    await writeManifest(path, manifest);
    return { suppressed: false, restored: merged, restart: true };
  }
  return { suppressed: Array.isArray(stash), noop: true };
}

async function searchAll(query) {
  const installed = await installedNames();
  const harness = await harnessVersion();
  const hub = await searchHub(query, installed, harness);
  const github = await searchGithub(query, installed, harness);
  return {
    ...github,
    hub: { url: HUB_URL, ok: hub.ok, count: hub.items.length },
    demo: await demoState(),
    updates: github.updates + hub.items.filter((item) => item.updateAvailable).length,
    items: [...hub.items, ...github.items],
  };
}

async function translateToEnglish(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed) return { translation: "", source: "empty" };
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(trimmed.slice(0, 1800))}`;
  const response = await fetch(url, { headers: { "User-Agent": "dsh-plugin-catalog" } });
  if (!response.ok) throw new Error(`Translate failed (${response.status})`);
  const payload = await response.json();
  const chunks = Array.isArray(payload?.[0]) ? payload[0] : [];
  const translation = chunks.map((part) => part?.[0] ?? "").join("").trim();
  return { translation: translation || trimmed, detected: payload?.[2] ?? null };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw);
}

export const name = "plugin-catalog";
export const inject = ["webServer"];

export function apply(ctx) {
  // The UI banner is easy to miss or dismiss; keep a durable record in the
  // harness log so a failed install can still be read back afterwards.
  const record = (kind, spec, result) => {
    const line =
      `[plugin-catalog] ${kind} ${spec} -> ${result.ok ? "ok" : "FAILED"} ` +
      `(${result.method || "?"}${result.packageName ? ` ${result.packageName}` : ""})` +
      `${result.ok ? "" : `: ${(result.stderr || result.error || "").replace(/\s+/g, " ").slice(0, 500)}`}`;
    try {
      ctx.logger?.("plugin-catalog")?.info(line);
    } catch {
      /* logger shape varies; console is always there */
    }
    console.log(line);
  };

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/list",
    async handler(req, res) {
      try {
        const url = new URL(req.url ?? "/", "http://127.0.0.1");
        sendJson(res, 200, await searchAll(url.searchParams.get("q") ?? ""));
      } catch (error) {
        sendJson(res, 502, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/install",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const spec = body.spec;
        const hubSlug = parseHubSpec(spec);
        if (!parseGithubSpec(spec ?? "") && !hubSlug) {
          sendJson(res, 400, { error: "Install spec must be github:owner/repo or hub:slug" });
          return;
        }
        const result = hubSlug
          ? await installHub(hubSlug, Boolean(body.force))
          : await installSpec(spec, body.package, body.skills, Boolean(body.force));
        record("install", body.package ? `${spec} (${body.package})` : spec, result);
        const installed = await installedNames();
        sendJson(res, result.ok ? 200 : result.code || 500, {
          ...result,
          installed: installed.dependencies,
        });
      } catch (error) {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/uninstall",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const spec = body.spec;
        const hubSlug = parseHubSpec(spec);
        if (!parseGithubSpec(spec ?? "") && !hubSlug) {
          sendJson(res, 400, { error: "Uninstall spec must be github:owner/repo or hub:slug" });
          return;
        }
        const result = hubSlug ? await uninstallHub(hubSlug) : await uninstallSpec(spec);
        record("uninstall", spec, result);
        const installed = await installedNames();
        sendJson(res, result.ok ? 200 : result.code, {
          ...result,
          installed: installed.dependencies,
        });
      } catch (error) {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/update",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const spec = body.spec;
        const hubSlug = parseHubSpec(spec);
        if (!parseGithubSpec(spec ?? "") && !hubSlug) {
          sendJson(res, 400, { error: "Update spec must be github:owner/repo or hub:slug" });
          return;
        }
        const result = hubSlug
          ? await updateHub(hubSlug, Boolean(body.force))
          : await updateSpec(spec, body.package, Boolean(body.force));
        record("update", body.package ? `${spec} (${body.package})` : spec, result);
        const installed = await installedNames();
        sendJson(res, result.ok ? 200 : result.code || 500, {
          ...result,
          installed: installed.dependencies,
        });
      } catch (error) {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/update-all",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        const result = await updateAll(Boolean(body.force));
        record("update-all", "*", result);
        const installed = await installedNames();
        sendJson(res, result.ok ? 200 : result.code || 500, {
          ...result,
          installed: installed.dependencies,
        });
      } catch (error) {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/demo-mode",
    async handler(req, res) {
      try {
        if (req.method === "GET") {
          sendJson(res, 200, await demoState());
          return;
        }
        if (req.method !== "POST") {
          sendJson(res, 405, { error: "GET or POST required" });
          return;
        }
        const body = await readJson(req);
        const result = await setDemoMode(Boolean(body.on));
        record("demo-mode", body.on ? "on" : "off", { ok: true, method: "manifest", stdout: "", stderr: "" });
        sendJson(res, 200, result);
      } catch (error) {
        sendJson(res, 500, { error: String(error?.message ?? error) });
      }
    },
  }));

  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: "/dsh-plugin-catalog/translate",
    async handler(req, res) {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "POST required" });
        return;
      }
      try {
        const body = await readJson(req);
        sendJson(res, 200, await translateToEnglish(body.text ?? ""));
      } catch (error) {
        sendJson(res, 502, { error: String(error?.message ?? error) });
      }
    },
  }));
}

void fileURLToPath;
