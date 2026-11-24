import Box from "@mui/material/Box";
import { bankBrand } from "#/lib/banks";
import { ACCENT } from "#/lib/m3";
import TonalChip from "./TonalChip";

/** The bank an account is with, beside its name: the bank's name and, for a bank the app knows
 * (MIB, BML), its logo, tinted in the bank's colour; a plain grey chip for any other bank. */
export default function BankChip({ bank }: { bank: string }) {
	const brand = bankBrand(bank);
	return (
		<TonalChip
			accent={brand?.accent ?? ACCENT.slate}
			label={
				<Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.625 }}>
					{bank}
					{brand && (
						// decorative: the chip's text already names the bank
						<Box
							component="img"
							src={brand.logo}
							alt=""
							sx={{ width: 16, height: 16, borderRadius: "4px", flexShrink: 0 }}
						/>
					)}
				</Box>
			}
			sx={{ fontWeight: 600, "& .MuiChip-label": { pr: brand ? 0.625 : 1 } }}
		/>
	);
}
