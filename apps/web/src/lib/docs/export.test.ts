import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { exportDocs, docsJson } from "./export";
import { DOCS } from "./index";

// The Android app bundles the guides as this file. It is generated from the guides here, never edited by hand:
// `just docs-json` rewrites it, and this test fails (so CI fails) when it is out of date.
const FILE = new URL("../../../../android/app/src/main/assets/docs.json", import.meta.url);

describe("the guides exported for the Android app", () => {
	it("matches the committed file (run `just docs-json` after changing a guide)", () => {
		const fresh = docsJson(DOCS);
		if (process.env.WRITE_DOCS_JSON) {
			writeFileSync(FILE, fresh);
			return;
		}
		let committed = "";
		try {
			committed = readFileSync(FILE, "utf8");
		} catch {
			// a missing file is as stale as a changed one
		}
		expect(
			committed,
			"apps/android/app/src/main/assets/docs.json is out of date: run `just docs-json`",
		).toBe(fresh);
	});

	it("keeps every guide and says what it leaves out", () => {
		const out = exportDocs(DOCS);
		expect(out.docs.map((d) => d.slug)).toEqual(DOCS.map((d) => d.slug));
		for (const [i, doc] of DOCS.entries()) {
			const omitted = doc.blocks.filter((b) => b.type === "demo" || b.type === "image").length;
			expect(out.docs[i].extras).toHaveLength(omitted);
			expect(out.docs[i].blocks).toHaveLength(doc.blocks.length - omitted);
		}
	});
});
