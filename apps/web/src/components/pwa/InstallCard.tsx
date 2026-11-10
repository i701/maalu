import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { install, useInstall } from "#/lib/pwa";
import { useNotify } from "../Notify";

/** Settings card: install Maalu on this device, so it opens in its own window from the home screen
 * and loads its files without waiting. It says plainly what installing does and does not do. */
export default function InstallCard() {
	const { standalone, canPrompt, ios } = useInstall();
	const notify = useNotify();

	let body: string;
	if (standalone) body = "Maalu is installed on this device and open as an app.";
	else if (canPrompt)
		body = "Add Maalu to this device's home screen or app list. It opens in its own window.";
	else if (ios)
		body = "On an iPhone or iPad: tap the Share button in Safari, then Add to Home Screen.";
	else
		body =
			"If your browser can install apps, look for an Install option in its menu (or the address bar). Some browsers only offer it after you have used the site for a little while.";

	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
					Install the app
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary" }}>
					{body}
				</Typography>
				{canPrompt && !standalone && (
					<Button
						variant="contained"
						sx={{ mt: 2 }}
						onClick={() =>
							void install().then(
								(accepted) => accepted && notify("Maalu is being installed.", "success"),
							)
						}
					>
						Install Maalu
					</Button>
				)}
				<Typography variant="caption" component="p" sx={{ color: "text.secondary", mt: 2 }}>
					Installing keeps no money data on the device. Your figures still come from your server, so
					Maalu needs a connection to show them; offline you will see a short message instead.
				</Typography>
			</CardContent>
		</Card>
	);
}
