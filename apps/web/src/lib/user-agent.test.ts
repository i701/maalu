import { describe, expect, it } from "vitest";
import { describeDevice } from "./user-agent";

const UA = {
	firefoxLinux: "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0",
	chromeWindows:
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
	edgeWindows:
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 Edg/129.0.0.0",
	safariMac:
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
	safariIphone:
		"Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
	chromeAndroid:
		"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
	operaLinux:
		"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36 OPR/114.0.0.0",
};

describe("describeDevice", () => {
	it("names the common browsers and systems", () => {
		expect(describeDevice(UA.firefoxLinux)).toBe("Firefox on Linux");
		expect(describeDevice(UA.chromeWindows)).toBe("Chrome on Windows");
		expect(describeDevice(UA.safariMac)).toBe("Safari on macOS");
	});

	it("tells Edge and Opera from the Chrome they also claim to be", () => {
		expect(describeDevice(UA.edgeWindows)).toBe("Edge on Windows");
		expect(describeDevice(UA.operaLinux)).toBe("Opera on Linux");
	});

	it("tells phones from the desktop systems they imitate", () => {
		expect(describeDevice(UA.safariIphone)).toBe("Safari on iOS");
		expect(describeDevice(UA.chromeAndroid)).toBe("Chrome on Android");
	});

	it("falls back to what it can tell, then to unknown", () => {
		expect(describeDevice("curl/8.5.0")).toBe("curl");
		expect(describeDevice("Mozilla/5.0 (X11; Linux x86_64)")).toBe("Linux");
		expect(describeDevice("something else")).toBe("Unknown device");
		expect(describeDevice(null)).toBe("Unknown device");
		expect(describeDevice("")).toBe("Unknown device");
	});
});
