import TuneIcon from "@mui/icons-material/Tune";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Drawer from "@mui/material/Drawer";
import type { SxProps, Theme } from "@mui/material/styles";
import { type ReactNode, useState } from "react";
import SheetHandle from "./SheetHandle";

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
				// Same as the "More" sheet, which is smooth: MUI's own slide curve and duration. The earlier
				// `linear()` spring easing (484ms) is what Safari animates badly. The panel is also kept
				// mounted, so its many fields are built once, before the drawer is ever opened, instead of
				// during the slide (that mounting on the main thread is what made it stutter).
				keepMounted
				slotProps={{
					backdrop: { sx: { backgroundColor: "rgb(0 0 0 / 0.32)" } },
					paper: {
						sx: {
							maxHeight: "85vh",
							p: 2.5,
							pt: 1.5,
							width: "min(560px, 100%)",
							mx: "auto",
							borderTopLeftRadius: "var(--shape-xl)",
							borderTopRightRadius: "var(--shape-xl)",
							backgroundColor: "var(--md-sys-color-surface-container-low)",
						},
					},
				}}
			>
				<SheetHandle />
				{children}
				<Button variant="contained" fullWidth sx={{ mt: 3 }} onClick={() => setOpen(false)}>
					Show {total} {total === 1 ? "result" : "results"}
				</Button>
			</Drawer>
		</>
	);
}
