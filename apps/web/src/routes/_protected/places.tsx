import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { memo, useCallback, useMemo, useState } from "react";
import { z } from "zod";
import EmptyState from "#/components/EmptyState";
import PlacesMap from "#/components/map/PlacesMap";
import MobileCard from "#/components/MobileCard";
import PageHeader from "#/components/PageHeader";
import PendingOverlay from "#/components/PendingOverlay";
import ResponsiveTable from "#/components/ResponsiveTable";
import { formatDate, formatMoney } from "#/lib/format";
import {
	PLACE_RANGE_LABELS,
	PLACE_RANGES,
	placeLabel,
	placeRangeBounds,
	type PlaceRange,
} from "#/lib/places";
import { localToday } from "#/lib/planned";
import { unwrap } from "#/lib/unwrap";
import { getPlacesFn } from "#/server/transactions";
import type { PlaceTotal } from "#/types/api";

const searchSchema = z.object({ range: z.enum(PLACE_RANGES).optional().catch(undefined) });

export const Route = createFileRoute("/_protected/places")({
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({ range: search.range ?? "3months" }),
	loader: async ({ deps }) =>
		unwrap(await getPlacesFn({ data: placeRangeBounds(deps.range, localToday()) })),
	component: PlacesPage,
});

const PlacesTable = memo(function PlacesTable({
	places,
	names,
	money,
	focused,
	onFocus,
}: {
	places: PlaceTotal[];
	names: string[];
	money: string[];
	focused: number | null;
	onFocus: (index: number) => void;
}) {
	// the list is the places in order, so a row finds its place by position
	const indexOf = (p: PlaceTotal) => places.indexOf(p);
	return (
		<ResponsiveTable
			rows={places}
			getKey={(p) => `${p.latitude},${p.longitude}`}
			minWidth={560}
			head={
				<TableRow>
					<TableCell>Place</TableCell>
					<TableCell align="right">Transactions</TableCell>
					<TableCell align="right">Spent</TableCell>
					<TableCell align="right">Last</TableCell>
				</TableRow>
			}
			renderRow={(p) => (
				<TableRow
					hover
					selected={focused === indexOf(p)}
					onClick={() => onFocus(indexOf(p))}
					sx={{ cursor: "pointer" }}
				>
					<TableCell sx={{ fontWeight: 500 }}>{names[indexOf(p)]}</TableCell>
					<TableCell align="right">{p.count}</TableCell>
					<TableCell align="right" sx={{ fontWeight: 600 }}>
						{money[indexOf(p)]}
					</TableCell>
					<TableCell align="right" sx={{ color: "text.secondary", whiteSpace: "nowrap" }}>
						{formatDate(p.last_date)}
					</TableCell>
				</TableRow>
			)}
			renderCard={(p) => (
				<Box onClick={() => onFocus(indexOf(p))} sx={{ cursor: "pointer" }}>
					<MobileCard
						primary={
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								{names[indexOf(p)]}
							</Typography>
						}
						secondary={
							<Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
								{p.count} {p.count === 1 ? "transaction" : "transactions"} ·{" "}
								{formatDate(p.last_date)}
							</Typography>
						}
						end={
							<Typography variant="body2" sx={{ fontWeight: 600 }}>
								{money[indexOf(p)]}
							</Typography>
						}
					/>
				</Box>
			)}
		/>
	);
});

function PlacesPage() {
	const { currency, places } = Route.useLoaderData();
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	const range: PlaceRange = search.range ?? "3months";
	const [focused, setFocused] = useState<number | null>(null);

	const names = useMemo(() => places.map((p) => placeLabel(p)), [places]);
	const money = useMemo(
		() => places.map((p) => formatMoney(String(p.spent), currency)),
		[places, currency],
	);
	const onFocus = useCallback((i: number) => setFocused(i), []);
	const total = places.reduce((sum, p) => sum + Number(p.spent), 0);

	return (
		<>
			<PageHeader
				title="Places"
				symbol="location_on"
				accent="pink"
				shape={3}
				stats={[
					{
						symbol: "location_on",
						label: `${places.length} ${places.length === 1 ? "place" : "places"}`,
					},
					...(places.length > 0
						? [{ symbol: "payments", label: formatMoney(String(total), currency) }]
						: []),
				]}
				description="Where your spending went, from the transactions you marked with a location. Add one with the location button in the transaction form."
			/>

			<ToggleButtonGroup
				exclusive
				size="small"
				value={range}
				onChange={(_, value: PlaceRange | null) => {
					if (!value) return;
					setFocused(null);
					void navigate({ search: { range: value }, replace: true });
				}}
				aria-label="Period"
				sx={{ mb: 2 }}
			>
				{PLACE_RANGES.map((r) => (
					<ToggleButton key={r} value={r} sx={{ px: 1.5, py: 0.5 }}>
						{PLACE_RANGE_LABELS[r]}
					</ToggleButton>
				))}
			</ToggleButtonGroup>

			<PendingOverlay>
				{places.length === 0 ? (
					<EmptyState firstRun symbol="location_on" accent="pink" shape={3}>
						No spending with a location in this period. Add one to a transaction with the location
						button, or set a vendor's usual place so it fills in for you.
					</EmptyState>
				) : (
					<Box sx={{ display: "grid", gap: 2 }}>
						<PlacesMap
							places={places}
							names={names}
							money={money}
							focused={focused}
							onFocus={onFocus}
						/>
						<PlacesTable
							places={places}
							names={names}
							money={money}
							focused={focused}
							onFocus={onFocus}
						/>
					</Box>
				)}
			</PendingOverlay>
		</>
	);
}
