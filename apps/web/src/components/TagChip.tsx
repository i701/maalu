import { tagAccent } from "#/lib/tags";
import type { TagRef } from "#/types/api";
import TonalChip from "./TonalChip";

/** A tag as a small tinted chip. */
export default function TagChip({ tag }: { tag: TagRef }) {
	return <TonalChip accent={tagAccent(tag.color)} label={tag.name} />;
}

/** All of an item's tags in a row, or nothing when it has none. */
export function TagChips({ tags }: { tags: TagRef[] }) {
	return (
		<>
			{tags.map((t) => (
				<TagChip key={t.id} tag={t} />
			))}
		</>
	);
}
