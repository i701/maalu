import Typography from "@mui/material/Typography";
import { statementLine, statementStatus } from "#/lib/card-statement";
import type { CardStatement } from "#/types/api";

/** On a credit card's entry in the Accounts list: what to pay and by when. Nothing for a card
 * with no statement days set. */
export default function StatementLine({ statement }: { statement: CardStatement | undefined }) {
	if (!statement) return null;
	const late = statementStatus(statement).tone === "late";
	return (
		<Typography
			variant="caption"
			sx={{ display: "block", mt: 0.5, color: late ? "error.main" : "text.secondary" }}
		>
			{statementLine(statement)}
		</Typography>
	);
}
