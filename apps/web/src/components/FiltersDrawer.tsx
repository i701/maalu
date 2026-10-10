import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import type { SxProps, Theme } from "@mui/material/styles";
import { type ReactNode, useState } from "react";

/** "Filters" button plus the bottom drawer it opens. The open state lives here, not in the page,
 * so toggling the drawer doesn't re-render the whole table behind it. */
export default function FiltersDrawer({
	activeCount,
	total,
	sx,
	children,
}: {
	activeCount: number;
	total: number;
	sx?: SxProps<Theme>;
	/** The filter panel. Pass the same element each render so React can skip it. */
	children: ReactNode;
}) {
	const [open, setOpen] = useState(false);

	return (
		<>
			<Button
				variant="outlined"
				color="inherit"
				startIcon={<TuneIcon />}
				onClick={() => setOpen(true)}
				sx={sx}
			>
				Filters
				{activeCount > 0 && (
					<Box
						component="span"
						sx={{
							ml: 1,
							minWidth: 20,
							height: 20,
							px: 0.75,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							borderRadius: "10px",
							bgcolor: "primary.main",
							color: "primary.contrastText",
							fontSize: 12,
							fontWeight: 600,
							lineHeight: 1,
						}}
					>
						{activeCount}
					</Box>
				)}
			</Button>
			<Drawer
				anchor="bottom"
				open={open}
				onClose={() => setOpen(false)}
				slotProps={{ paper: { sx: { maxHeight: "85vh", p: 2.5 } } }}
			>
				{children}
				<Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={() => setOpen(false)}>
					Show {total} {total === 1 ? "result" : "results"}
				</Button>
			</Drawer>
		</>
	);
}
