import MenuItem from "@mui/material/MenuItem";
import { ACCOUNT_GROUP_LABELS, type Account } from "#/types/api";

/** <MenuItem>s for an account <TextField select>, optionally leaving one account out. */
export function accountMenuItems(accounts: Account[], exclude?: string) {
	return accounts
		.filter((a) => a.id !== exclude)
		.map((a) => (
			<MenuItem key={a.id} value={a.id}>
				{a.name} · {ACCOUNT_GROUP_LABELS[a.group]} · {a.currency}
			</MenuItem>
		));
}
