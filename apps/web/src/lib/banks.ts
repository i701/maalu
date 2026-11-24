import bmlLogo from "#/assets/banks/bml.svg";
import mibLogo from "#/assets/banks/mib.svg";

/** A bank the app knows the look of: its logo and its colour (the chip's tint). */
export type BankBrand = { logo: string; accent: string };

// The colours are the banks' own, the logos the same files the iOS app uses.
const BRANDS: Record<string, BankBrand> = {
	mib: { logo: mibLogo, accent: "#006A4D" },
	bml: { logo: bmlLogo, accent: "#E21B23" },
};

/** The brand of a bank by the name typed on the account (any case, spaces around ignored), or
 * null for any other bank, which gets a plain grey chip. */
export function bankBrand(bank: string | null | undefined): BankBrand | null {
	return BRANDS[bank?.trim().toLowerCase() ?? ""] ?? null;
}
