import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import ChangePasswordDialog from "./ChangePasswordDialog";

/** The Settings card for the password. */
export default function PasswordCard({ twoFactor }: { twoFactor: boolean }) {
	const [open, setOpen] = useState(false);
	return (
		<Card sx={{ maxWidth: 640 }}>
			<CardContent sx={{ p: { xs: 2.5, sm: 3 } }}>
				<Typography variant="h2" component="h2" sx={{ mb: 0.5 }}>
					Password
				</Typography>
				<Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
					Changing it signs out your other devices.
				</Typography>
				<Button variant="outlined" onClick={() => setOpen(true)}>
					Change password
				</Button>
			</CardContent>
			{open && <ChangePasswordDialog twoFactor={twoFactor} onClose={() => setOpen(false)} />}
		</Card>
	);
}
