import { describe, expect, it } from "vitest";
import { checkFile, formatBytes, MAX_ATTACHMENT_BYTES, uploadSummary } from "./attachments";

const file = (name: string, type: string, size = 1000) => ({ name, type, size });

describe("checkFile", () => {
	it("accepts photos and PDFs", () => {
		expect(checkFile(file("a.jpg", "image/jpeg"))).toBeNull();
		expect(checkFile(file("a.PNG", "image/png"))).toBeNull();
		expect(checkFile(file("a.webp", "image/webp"))).toBeNull();
		expect(checkFile(file("invoice.pdf", "application/pdf"))).toBeNull();
	});
	it("trusts the extension when the browser gives no type", () => {
		expect(checkFile(file("scan.pdf", ""))).toBeNull();
	});
	it("refuses other files, empty ones and big ones", () => {
		expect(checkFile(file("notes.txt", "text/plain"))).toContain("not a JPEG");
		expect(checkFile(file("x.svg", "image/svg+xml"))).toContain("not a JPEG");
		expect(checkFile(file("a.jpg", "image/jpeg", 0))).toContain("empty");
		expect(checkFile(file("a.jpg", "image/jpeg", MAX_ATTACHMENT_BYTES + 1))).toContain("too large");
	});
});

describe("formatBytes", () => {
	it("picks a readable unit", () => {
		expect(formatBytes(500)).toBe("500 B");
		expect(formatBytes(2048)).toBe("2 KB");
		expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
	});
});

describe("uploadSummary", () => {
	it("is quiet when everything went up", () => {
		expect(uploadSummary(2, [])).toBeNull();
	});
	it("gives the reason when all failed, and counts when only some did", () => {
		expect(uploadSummary(1, ["Too big"])).toBe("Too big");
		expect(uploadSummary(3, ["Too big"])).toBe("2 of 3 files attached. Too big");
	});
});
