import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";
import { useState } from "react";

const OPTIONS = [
	{ value: "system", label: "System", Icon: SettingsBrightnessIcon },
	{ value: "light", label: "Light", Icon: LightModeIcon },
	{ value: "dark", label: "Dark", Icon: DarkModeIcon },
] as const;

export default function ColorModeToggle() {
	const { mode, setMode } = useColorScheme();
	const [anchor, setAnchor] = useState<HTMLElement | null>(null);

	// `mode` is undefined until hydration finishes: render nothing to avoid a mismatch.
	const current = OPTIONS.find((option) => option.value === mode);
	if (!current) return <IconButton disabled aria-label="Theme" />;

	return (
		<>
			<Tooltip title={`Theme: ${current.label}`}>
				<IconButton
					aria-label="Theme"
					aria-haspopup="menu"
					aria-expanded={anchor !== null}
					onClick={(event) => setAnchor(event.currentTarget)}
				>
					<current.Icon />
				</IconButton>
			</Tooltip>
			<Menu anchorEl={anchor} open={anchor !== null} onClose={() => setAnchor(null)}>
				{OPTIONS.map(({ value, label, Icon }) => (
					<MenuItem
						key={value}
						role="menuitemradio"
						aria-checked={value === mode}
						selected={value === mode}
						onClick={() => {
							setMode(value);
							setAnchor(null);
						}}
					>
						<ListItemIcon>
							<Icon fontSize="small" />
						</ListItemIcon>
						<ListItemText>{label}</ListItemText>
					</MenuItem>
				))}
			</Menu>
		</>
	);
}
