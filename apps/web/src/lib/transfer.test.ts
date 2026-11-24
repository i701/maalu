import { describe, expect, it } from "vitest";
import { isSwap, pickTransferEnd, swapTransferAmounts, swapTransferEnds } from "./transfer";

const ends = { from: "bml", to: "mib" };

describe("pickTransferEnd", () => {
	it("sets the side that was picked and leaves the other", () => {
		expect(pickTransferEnd(ends, "from", "cash")).toEqual({ from: "cash", to: "mib" });
		expect(pickTransferEnd(ends, "to", "cash")).toEqual({ from: "bml", to: "cash" });
	});

	it("swaps when the account picked is the one on the other side", () => {
		expect(pickTransferEnd(ends, "from", "mib")).toEqual({ from: "mib", to: "bml" });
		expect(pickTransferEnd(ends, "to", "bml")).toEqual({ from: "mib", to: "bml" });
	});

	it("leaves the same account alone when it is picked again on its own side", () => {
		expect(pickTransferEnd(ends, "from", "bml")).toEqual(ends);
	});

	it("does not treat two empty sides as a swap", () => {
		expect(pickTransferEnd({ from: "", to: "" }, "to", "")).toEqual({ from: "", to: "" });
		expect(pickTransferEnd({ from: "bml", to: "" }, "to", "bml")).toEqual({ from: "", to: "bml" });
	});
});

describe("swapTransferEnds", () => {
	it("trades the two accounts", () => {
		expect(swapTransferEnds(ends)).toEqual({ from: "mib", to: "bml" });
	});

	it("moves a lone account to the other side", () => {
		expect(swapTransferEnds({ from: "bml", to: "" })).toEqual({ from: "", to: "bml" });
		expect(swapTransferEnds({ from: "", to: "bml" })).toEqual({ from: "bml", to: "" });
	});
});

describe("isSwap", () => {
	it("is true only when the two ends traded places", () => {
		expect(isSwap(ends, { from: "mib", to: "bml" })).toBe(true);
		expect(isSwap(ends, { from: "cash", to: "mib" })).toBe(false);
		expect(isSwap({ from: "a", to: "a" }, { from: "a", to: "a" })).toBe(false);
	});
});

describe("swapTransferAmounts", () => {
	const amounts = { amount: "100.00", to_amount: "6.50" };

	it("trades the two figures between currencies", () => {
		expect(swapTransferAmounts(amounts, true)).toEqual({ amount: "6.50", to_amount: "100.00" });
	});

	it("keeps the one amount in a single currency", () => {
		expect(swapTransferAmounts(amounts, false)).toEqual(amounts);
	});
});
