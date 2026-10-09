import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider } from "@mui/material/styles";
import { type ReactNode, useState } from "react";
import theme from "#/theme";
import { NotifyProvider } from "./Notify";

export default function Providers({ children }: { children: ReactNode }) {
	// One Emotion cache per render tree (so per request on the server).
	const [cache] = useState(() => createCache({ key: "css" }));

	return (
		<CacheProvider value={cache}>
			<ThemeProvider theme={theme} defaultMode="system">
				<CssBaseline />
				<NotifyProvider>{children}</NotifyProvider>
			</ThemeProvider>
		</CacheProvider>
	);
}
