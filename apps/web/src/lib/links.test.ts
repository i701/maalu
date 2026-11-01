import { describe, expect, it } from "vitest";
import { hostOf, linkLabel, parseUrl } from "./links";

describe("parseUrl", () => {
	it("keeps a full address and adds https to a bare one", () => {
		expect(parseUrl("https://shop.example.com/o/1")).toEqual({
			url: "https://shop.example.com/o/1",
		});
		expect(parseUrl("  example.com/receipt ")).toEqual({ url: "https://example.com/receipt" });
		expect(parseUrl("localhost:8000/x")).toEqual({ url: "https://localhost:8000/x" });
	});
	it("refuses anything but http and https", () => {
		for (const bad of [
			"javascript:alert(1)",
			"mailto:a@b.co",
			"ftp://example.com",
			"data:text/html,x",
		])
			expect(parseUrl(bad)).toHaveProperty("error");
	});
	it("refuses spaces, empty input, hostless and password-bearing addresses", () => {
		expect(parseUrl("")).toHaveProperty("error");
		expect(parseUrl("not a url")).toHaveProperty("error");
		expect(parseUrl("https://nodot")).toHaveProperty("error");
		expect(parseUrl("https://user:pw@example.com")).toHaveProperty("error");
	});
});

describe("labels", () => {
	it("shows the host without www", () => {
		expect(hostOf("https://www.example.com/a?b=1")).toBe("example.com");
	});
	it("prefers the title", () => {
		expect(linkLabel({ url: "https://example.com", title: "Order 7" })).toBe("Order 7");
		expect(linkLabel({ url: "https://www.example.com/x", title: null })).toBe("example.com");
	});
});
