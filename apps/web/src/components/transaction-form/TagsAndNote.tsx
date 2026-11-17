import { type Control, Controller } from "react-hook-form";
import type { Tag } from "#/types/api";
import FormTextField from "../FormTextField";
import TagsField from "../TagsField";
import { Cell } from "./Cells";
import type { TxValues } from "./schema";

/** The tags and the description, under the transaction's details. */
export default function TagsAndNote({
	control,
	tags,
	tagsKey,
}: {
	control: Control<TxValues>;
	/** Every existing tag, to pick from. */
	tags: Tag[];
	/** Changes when a vendor fills the tags in, so the picker shows them. */
	tagsKey: number;
}) {
	return (
		<>
			<Cell size={12}>
				<Controller
					name="tags"
					control={control}
					render={({ field, fieldState }) => (
						<TagsField
							key={tagsKey}
							tags={tags}
							defaultValue={field.value}
							onChange={field.onChange}
							error={fieldState.error?.message}
						/>
					)}
				/>
			</Cell>

			<Cell size={12}>
				<FormTextField
					control={control}
					name="description"
					label="Description"
					multiline
					minRows={2}
				/>
			</Cell>
		</>
	);
}
