import { describe, expect, it } from "vitest";
import { bulkMessage, transactionCount } from "./bulk-message";

const moved = (n: number) => `Moved ${transactionCount(n)} to the trash`;

describe("bulkMessage", () => {
	it("is a plain success when nothing was skipped", () => {
		expect(bulkMessage(moved, { updated: 3, skipped: [] })).toEqual({
			text: "Moved 3 transactions to the trash",
			severity: "success",
		});
		expect(bulkMessage(moved, { updated: 1, skipped: [] }).text).toBe(
			"Moved 1 transaction to the trash",
		);
	});

	it("says how many were skipped and why, each reason once", () => {
		const result = bulkMessage(moved, {
			updated: 2,
			skipped: [
				{ id: "a", reason: "Not found" },
				{ id: "b", reason: "Not found" },
				{ id: "c", reason: "A transfer has no category" },
			],
		});
		expect(result.severity).toBe("warning");
		expect(result.text).toBe(
			"Moved 2 transactions to the trash. 3 skipped: Not found; A transfer has no category",
		);
	});

	it("warns when nothing at all was done", () => {
		expect(
			bulkMessage(moved, { updated: 0, skipped: [{ id: "a", reason: "Not found" }] }).severity,
		).toBe("warning");
	});
});
