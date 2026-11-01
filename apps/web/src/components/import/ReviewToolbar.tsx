import { isFiltered, plural, type RowFilter } from "#/lib/imports";
import AmountRangeField from "../AmountRangeField";
import SearchField from "../SearchField";
import TableToolbar from "../TableToolbar";

/** Search the statement's rows and limit them by amount. */
export default function ReviewToolbar({
	filter,
	onChange,
	shown,
	total,
	currency,
}: {
	filter: RowFilter;
	onChange: (next: Partial<RowFilter>) => void;
	shown: number;
	total: number;
	currency: string;
}) {
	return (
		<TableToolbar
			summary={isFiltered(filter) ? `${shown} of ${total} rows` : plural(total, "row")}
			filters={
				<>
					<SearchField
						value={filter.q}
						placeholder="Search the statement"
						onChange={(q) => onChange({ q })}
					/>
					<AmountRangeField
						value={{ min: filter.min, max: filter.max }}
						onChange={(range) => onChange({ min: range.min, max: range.max })}
						currency={currency}
					/>
				</>
			}
		/>
	);
}
