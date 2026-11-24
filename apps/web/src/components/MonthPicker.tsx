import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import IconSymbol from "#/components/Symbol";
import { monthLabel, shiftMonth } from "#/lib/dashboard";

/** The month pill (a white pill on the grey page): previous and next month, the month's name, and
 * "This month" once away from it. `month` is the first day of the month shown; `onChange` gets any
 * day of the month to go to, or undefined for the current one. `children` are extra controls that
 * sit at the end of the pill. */
export default function MonthPicker({
	month,
	isCurrent,
	onChange,
	children,
}: {
	month: string;
	isCurrent: boolean;
	onChange: (on: string | undefined) => void;
	children?: ReactNode;
}) {
	return (
		<Box
			sx={{
				display: "flex",
				alignItems: "center",
				gap: 0.5,
				px: 0.5,
				height: 40,
				borderRadius: "var(--shape-full)",
				bgcolor: "var(--md-sys-color-surface-container-low)",
			}}
		>
			<IconButton
				color="inherit"
				size="small"
				aria-label="Previous month"
				onClick={() => onChange(shiftMonth(month, -1))}
			>
				<IconSymbol name="chevron_left" size={22} />
			</IconButton>
			<Typography
				sx={{
					fontWeight: 500,
					minWidth: { xs: 112, sm: 150 },
					textAlign: "center",
					fontSize: { xs: 14, sm: 16 },
				}}
				aria-live="polite"
			>
				{monthLabel(month)}
			</Typography>
			<IconButton
				color="inherit"
				size="small"
				aria-label="Next month"
				onClick={() => onChange(shiftMonth(month, 1))}
			>
				<IconSymbol name="chevron_right" size={22} />
			</IconButton>
			{!isCurrent && (
				<Button color="inherit" size="small" onClick={() => onChange(undefined)}>
					This month
				</Button>
			)}
			{children}
		</Box>
	);
}
