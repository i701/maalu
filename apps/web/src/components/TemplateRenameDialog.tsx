import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { useSheet } from "#/lib/sheet";
import { useAction } from "#/lib/use-action";
import { renameTemplateFn, templateNameSchema } from "#/server/templates";
import type { TransactionTemplate } from "#/types/api";
import FormDialog from "./FormDialog";
import FormTextField from "./FormTextField";
import { useNotify } from "./Notify";

export default function TemplateRenameDialog({
	template,
	onClose,
}: {
	template: TransactionTemplate;
	onClose: () => void;
}) {
	const { run, pending, error } = useAction();
	const sheet = useSheet(onClose);
	const notify = useNotify();
	const { control, handleSubmit } = useForm({
		resolver: zodResolver(templateNameSchema),
		defaultValues: { name: template.name },
	});

	async function submit({ name }: z.output<typeof templateNameSchema>) {
		if (await run(() => renameTemplateFn({ data: { id: template.id, name } }))) {
			notify("Template renamed");
			sheet.close();
		}
	}

	return (
		<FormDialog
			title="Rename template"
			error={error}
			pending={pending}
			onSubmit={handleSubmit(submit)}
			noValidate
			sheet={sheet}
			maxWidth="xs"
		>
			<FormTextField
				control={control}
				name="name"
				label="Name"
				required
				autoFocus
				slotProps={{ htmlInput: { maxLength: 200 } }}
				helperText="To change what it fills in, delete it and save it again from the form"
			/>
		</FormDialog>
	);
}
