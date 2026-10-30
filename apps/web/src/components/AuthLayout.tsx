import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import Brand from "./Brand";
import ColorModeToggle from "./ColorModeToggle";

export default function AuthLayout({
	title,
	subtitle,
	children,
}: {
	title: string;
	subtitle?: string;
	children: ReactNode;
}) {
	return (
		<Box
			sx={{
				minHeight: "100vh",
				display: "flex",
				alignItems: "center",
				py: 4,
			}}
		>
			<Box sx={{ position: "absolute", top: 12, right: 12 }}>
				<ColorModeToggle />
			</Box>
			<Container maxWidth="xs">
				<Box sx={{ display: "flex", justifyContent: "center", mb: 4 }}>
					<Brand />
				</Box>
				<Card>
					<CardContent sx={{ p: { xs: 3, sm: 4 } }}>
						<Typography variant="h2" component="h1" gutterBottom>
							{title}
						</Typography>
						{subtitle && (
							<Typography variant="body2" sx={{ color: "text.secondary" }}>
								{subtitle}
							</Typography>
						)}
						<Box sx={{ mb: 3 }} />
						{children}
					</CardContent>
				</Card>
			</Container>
		</Box>
	);
}
