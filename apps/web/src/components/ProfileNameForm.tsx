import { zodResolver } from "@hookform/resolvers/zod";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useForm } from "react-hook-form";
import { z } from "zod";
import FormTextField from "#/components/FormTextField";
import { useNotify } from "#/components/Notify";
import { useAction } from "#/lib/use-action";
import { nameField, updateMeFn } from "#/server/auth";

const schema = z.object({ name: nameField });

/** The name Maalu calls you by; blank clears it. */
export default function ProfileNameForm({ name }: { name: string | null }) {
	const { run, pending, error } = useAction();
	const notify = useNotify();
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(schema),
		defaultValues: { name: name ?? "" },
	});

	async function submit(data: z.output<typeof schema>) {
		if (await run(() => updateMeFn({ data: { name: data.name || null } })))
			notify(data.name ? "Name saved" : "Name cleared");
	}

	return (
		<Stack
			component="form"
			onSubmit={handleSubmit(submit)}
			noValidate
			direction="row"
			spacing={1.5}
			sx={{ mt: 2, alignItems: "flex-start" }}
		>
			<FormTextField
				control={control}
				name="name"
				label="Name"
				autoComplete="given-name"
				helperText={error ?? "What Maalu calls you"}
				fullWidth
			/>
			<Button type="submit" variant="outlined" loading={pending} sx={{ mt: 1 }}>
				Save
			</Button>
		</Stack>
	);
}
