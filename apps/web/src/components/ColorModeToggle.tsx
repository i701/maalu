import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useColorScheme } from "@mui/material/styles";

export default function ColorModeToggle() {
	const { mode, systemMode, setMode } = useColorScheme();

	// `mode` is undefined until hydration finishes: render nothing to avoid a mismatch.
	if (!mode) return <IconButton disabled aria-label="Toggle colour mode" />;

	const resolved = mode === "system" ? systemMode : mode;
	const next = resolved === "dark" ? "light" : "dark";

	return (
		<Tooltip title={`Switch to ${next} mode`}>
			<IconButton aria-label="Toggle colour mode" onClick={() => setMode(next)}>
				{resolved === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
			</IconButton>
		</Tooltip>
	);
}
