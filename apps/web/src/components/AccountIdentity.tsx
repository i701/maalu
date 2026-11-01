import Typography from "@mui/material/Typography";
import { accountIdentity } from "#/lib/accounts";

/** The bank and the full account number under an account's name, or nothing when it has neither. */
export default function AccountIdentity({
	account,
}: {
	account: { bank?: string | null; account_number?: string | null };
}) {
	const identity = accountIdentity(account);
	if (!identity) return null;
	return (
		<Typography
			variant="caption"
			component="div"
			sx={{ color: "text.secondary", fontVariantNumeric: "tabular-nums" }}
		>
			{identity}
		</Typography>
	);
}
