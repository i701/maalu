import Typography from "@mui/material/Typography";

/** The app name, in the handwriting face (declared in styles/m3.css). */
export default function Brand() {
	return (
		<Typography
			component="div"
			sx={{
				fontFamily: '"Homemade Apple", cursive',
				fontWeight: 400,
				lineHeight: 1.5,
				fontSize: 22,
			}}
		>
			Maalu
		</Typography>
	);
}
