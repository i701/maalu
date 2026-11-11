#!/usr/bin/env node
// Feature parity across the platforms (web, android, ios).
//
//   node scripts/parity.mjs write   make PARITY.md from parity/features.json
//   node scripts/parity.mjs check   validate the manifest and fail if PARITY.md is stale (what CI runs)
//
// parity/features.json is written by hand: it is the one place that says what each platform has. The check keeps it honest:
// every status is one of a fixed set, every "done" or "partial" carries evidence (a file that exists), every web page and every
// API endpoint is claimed by a feature (so a new page or endpoint cannot ship without being classified), and PARITY.md is what
// the manifest produces. No dependencies: plain Node.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(root, "parity/features.json");
const OUTPUT = join(root, "PARITY.md");
const OPENAPI = join(root, "apps/web/openapi.json");
const ROUTES = join(root, "apps/web/src/routes");

const STATUSES = ["done", "partial", "missing", "na", "planned"];
const MARK = { done: "✅", partial: "🟡", missing: "❌", na: "➖", planned: "🗓" };

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

// ---------- what exists on the web and in the API (derived, never typed)

/** The page routes of the web app, from the file names under apps/web/src/routes. */
function webRoutes() {
	const files = [];
	for (const f of readdirSync(join(ROUTES, "_protected"))) if (f.endsWith(".tsx")) files.push(f);
	const top = ["login.tsx", "register.tsx", "index.tsx"].filter((f) => existsSync(join(ROUTES, f)));
	const routeOf = (file) => {
		const segs = file.replace(/\.tsx$/, "").split(".");
		if (segs.at(-1) === "index") segs.pop();
		return "/" + segs.join("/");
	};
	return [...top, ...files].map(routeOf);
}

function apiPaths() {
	return Object.keys(JSON.parse(readFileSync(OPENAPI, "utf8")).paths);
}

// ---------- validation

function validate() {
	const problems = [];
	const add = (m) => problems.push(m);
	const platforms = manifest.platforms;
	const areas = new Set(manifest.areas.map((a) => a.id));
	const ids = new Set();
	const claimedRoutes = new Set();
	const claimedApi = new Set();

	for (const f of manifest.features) {
		const where = `feature "${f.id}"`;
		if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.id ?? "")) add(`${where}: the id must be kebab-case`);
		if (ids.has(f.id)) add(`${where}: duplicate id`);
		ids.add(f.id);
		if (!areas.has(f.area)) add(`${where}: unknown area "${f.area}"`);
		if (!f.name || !f.summary) add(`${where}: needs a name and a summary`);
		for (const p of platforms) {
			const s = f[p];
			if (!s) { add(`${where}: no status for ${p}`); continue; }
			if (!STATUSES.includes(s.status)) { add(`${where}: ${p} has an unknown status "${s.status}"`); continue; }
			if ((s.status === "done" || s.status === "partial") && !(s.evidence?.length > 0)) add(`${where}: ${p} is ${s.status} but has no evidence (a file that proves it)`);
			if ((s.status === "partial" || s.status === "na") && !s.note) add(`${where}: ${p} is ${s.status} and needs a note saying why`);
			for (const e of s.evidence ?? []) if (!existsSync(join(root, e))) add(`${where}: ${p} evidence does not exist: ${e}`);
		}
		for (const r of f.routes ?? []) claimedRoutes.add(r);
		for (const a of f.api ?? []) claimedApi.add(a);
	}

	const routes = webRoutes();
	for (const r of routes) if (!claimedRoutes.has(r)) add(`web page ${r} is not claimed by any feature (add it to a feature's "routes")`);
	for (const r of claimedRoutes) if (!routes.includes(r)) add(`a feature claims the web page ${r}, which does not exist`);

	const paths = apiPaths();
	for (const p of paths) if (!claimedApi.has(p)) add(`API endpoint ${p} is not claimed by any feature (add it to a feature's "api")`);
	for (const p of claimedApi) if (!paths.includes(p)) add(`a feature claims the API endpoint ${p}, which does not exist (run just api-types if it is new)`);
	return problems;
}

// ---------- PARITY.md

const label = (s) => `${MARK[s.status]} ${s.status === "na" ? "n/a" : s.status}`;

function cell(s) {
	return label(s);
}

function render() {
	const lines = [];
	const out = (l = "") => lines.push(l);
	const platforms = manifest.platforms;
	const title = { web: "Web", android: "Android", ios: "iOS" };

	out("# Feature parity");
	out();
	out("What each platform has. **Generated from [`parity/features.json`](parity/features.json) by `just parity`: edit that file, not this one.**");
	out("`just check-parity` (and CI) fails when this file is stale, when a status has no evidence, or when a web page or API endpoint is not claimed by a feature.");
	out();
	out(`Key: ${STATUSES.map((s) => `${MARK[s]} ${s === "na" ? "n/a (deliberately not on this platform)" : s}`).join(" · ")}`);
	out();

	out("## At a glance");
	out();
	out(`| | ${platforms.map((p) => title[p]).join(" | ")} |`);
	out(`|---|${platforms.map(() => "---:").join("|")}|`);
	for (const st of STATUSES) {
		const counts = platforms.map((p) => manifest.features.filter((f) => f[p].status === st).length);
		if (counts.every((c) => c === 0)) continue;
		out(`| ${MARK[st]} ${st === "na" ? "n/a" : st} | ${counts.join(" | ")} |`);
	}
	out();

	for (const p of platforms) {
		const gaps = manifest.features.filter((f) => ["missing", "partial", "planned"].includes(f[p].status));
		if (p === "web" && gaps.length === 0) continue; // the web is where a feature is first built
		out(`## Still to build on ${title[p]} (${gaps.length})`);
		out();
		if (gaps.length === 0) out("Nothing: every feature is built or deliberately left out.");
		const ordered = [...gaps].sort((a, b) => ["partial", "planned", "missing"].indexOf(a[p].status) - ["partial", "planned", "missing"].indexOf(b[p].status));
		for (const f of ordered) {
			const note = f[p].note ? ` ${f[p].note}` : "";
			out(`- ${MARK[f[p].status]} **${f.name}** (${manifest.areas.find((a) => a.id === f.area).name}).${note}`);
		}
		out();
	}

	for (const area of manifest.areas) {
		const features = manifest.features.filter((f) => f.area === area.id);
		if (features.length === 0) continue;
		out(`## ${area.name}`);
		out();
		out(`| Feature | ${platforms.map((p) => title[p]).join(" | ")} |`);
		out(`|---|${platforms.map(() => ":---:").join("|")}|`);
		for (const f of features) out(`| **${f.name}**<br>${f.summary} | ${platforms.map((p) => cell(f[p])).join(" | ")} |`);
		out();
		const notes = features.flatMap((f) => platforms.filter((p) => f[p].note && f[p].status !== "missing").map((p) => `- **${f.name}** (${title[p]}): ${f[p].note}`));
		if (notes.length) { for (const n of notes) out(n); out(); }
	}
	return lines.join("\n").replace(/\n{3,}/g, "\n\n") + "\n";
}

// ---------- run

const command = process.argv[2];
if (command === "write") {
	const problems = validate();
	if (problems.length) {
		console.error(`parity: ${problems.length} problem(s) in parity/features.json:\n` + problems.map((p) => `  - ${p}`).join("\n"));
		process.exit(1);
	}
	writeFileSync(OUTPUT, render());
	console.log(`parity: wrote PARITY.md (${manifest.features.length} features)`);
} else if (command === "check") {
	const problems = validate();
	if (existsSync(OUTPUT)) {
		if (readFileSync(OUTPUT, "utf8") !== render()) problems.push("PARITY.md is out of date: run `just parity` and commit it");
	} else problems.push("PARITY.md is missing: run `just parity` and commit it");
	if (problems.length) {
		console.error(`parity: ${problems.length} problem(s):\n` + problems.map((p) => `  - ${p}`).join("\n"));
		process.exit(1);
	}
	console.log(`parity: ok (${manifest.features.length} features)`);
} else {
	console.error("usage: node scripts/parity.mjs write | check");
	process.exit(2);
}
