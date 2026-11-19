import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import CategoryDot from "#/components/CategoryDot";
import Money from "#/components/Money";
import SheetHandle from "#/components/SheetHandle";
import { TagChips } from "#/components/TagChip";
import TonalChip from "#/components/TonalChip";
import { cardText } from "#/lib/cards";
import { formatWhen } from "#/lib/format";
import { ACCENT, SCRIM } from "#/lib/m3";
import { placeLabel } from "#/lib/places";
import { txCategories, txRowTitle } from "#/lib/tx-display";
import { PAYMENT_METHOD_LABELS, type Transaction } from "#/types/api";
import {
	TxActions,
	TxAmount,
	TxGroupChip,
	TxRefundChip,
	TxStatsChips,
	TxSubscriptionChip,
} from "./TxParts";

/** One labelled fact; nothing is drawn when there is nothing to say. */
function Fact({ label, children }: { label: string; children?: ReactNode }) {
	if (!children) return null;
	return (
		<Box sx={{ display: "grid", gridTemplateColumns: "104px minmax(0, 1fr)", gap: 1.5, py: 1 }}>
			<Typography variant="body2" sx={{ color: "text.secondary" }}>
				{label}
			</Typography>
			<Box sx={{ minWidth: 0, fontSize: "0.875rem", overflowWrap: "anywhere" }}>{children}</Box>
		</Box>
	);
}

/**
 * Everything about one transaction that the list leaves out: when, where it was paid from, tags,
 * notes, items, links to its group, subscription and refund, and the actions. A side panel on wide
 * screens and a bottom sheet on a phone, so the list stays where it was scrolled to.
 */
export default function TransactionDrawer({
	transaction: t,
	open,
	baseCurrency,
	onClose,
	onConvert,
	onSplit,
	onRefund,
	onDuplicate,
	onEdit,
	onDelete,
}: {
	transaction: Transaction | null;
	open: boolean;
	baseCurrency: string;
	onClose: () => void;
	onConvert: (t: Transaction) => void;
	onSplit: (t: Transaction) => void;
	onRefund: (t: Transaction) => void;
	onDuplicate: (t: Transaction) => void;
	onEdit: (t: Transaction) => void;
	onDelete: (t: Transaction) => void;
}) {
	// an action closes the drawer first, so its dialog is not drawn over the panel
	const then = (action: (t: Transaction) => void) => () => {
		if (!t) return;
		onClose();
		action(t);
	};
	return (
		<Drawer
			anchor="bottom"
			open={open && t !== null}
			onClose={onClose}
			slotProps={{
				backdrop: { sx: { backgroundColor: SCRIM } },
				paper: {
					sx: {
						// a bottom sheet on every screen, centred and no wider than reads well
						backgroundColor: "var(--md-sys-color-surface-container-low)",
						maxHeight: "85vh",
						width: "min(800px, 100%)",
						mx: "auto",
						p: { xs: 3, sm: 5 },
						// the phone's grab bar sits close to the top; elsewhere the top matches the sides
						pt: { xs: 1.5, sm: 5 },
						borderTopLeftRadius: "var(--shape-xl)",
						borderTopRightRadius: "var(--shape-xl)",
					},
				},
			}}
		>
			{/* a grab bar only where the sheet is a phone's bottom sheet */}
			<Box sx={{ display: { xs: "flex", sm: "none" }, justifyContent: "center" }}>
				<SheetHandle />
			</Box>
			{t && (
				<>
					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							alignItems: "flex-end",
							justifyContent: "space-between",
							gap: 2,
							pt: 1,
							pb: 0.5,
						}}
					>
						<Box sx={{ minWidth: 0, flex: "1 1 160px" }}>
							<Typography variant="h6" sx={{ fontWeight: 600 }}>
								{txRowTitle(t)}
							</Typography>
							<Box sx={{ mt: 1, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
								{t.planned && <TonalChip accent={ACCENT.amber} label="Planned" />}
								<TxRefundChip t={t} />
								<TxSubscriptionChip t={t} />
								<TxGroupChip t={t} />
								<TxStatsChips t={t} />
							</Box>
						</Box>
						<Box
							sx={{
								textAlign: "right",
								// big: red for spending, green for income, like the wash behind it
								"& .MuiTypography-body2:first-of-type": {
									// as big as the sheet allows: the number is the point of it
									fontSize: "clamp(2.5rem, 9vw, 3.5rem)",
									lineHeight: 0.9,
									letterSpacing: "-0.03em",
									"--figure-weight": 600,
								},
							}}
						>
							<TxAmount t={t} baseCurrency={baseCurrency} coloured />
						</Box>
					</Box>
					<Fact label="Date">{formatWhen(t.transaction_date, t.transaction_time)}</Fact>
					<Fact label="Category">
						{t.type !== "transfer" && (
							<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
								{t.splits.length <= 1 && t.category_color && (
									<CategoryDot color={t.category_color} size={8} />
								)}
								{txCategories(t)}
							</Box>
						)}
					</Fact>
					<Fact label={t.type === "transfer" ? "From" : "Account"}>{t.account?.name}</Fact>
					<Fact label="To">{t.type === "transfer" ? t.to_account?.name : null}</Fact>
					<Fact label="Paid with">
						{t.type === "transfer"
							? null
							: [PAYMENT_METHOD_LABELS[t.payment_method], t.card ? cardText(t.card) : null]
									.filter(Boolean)
									.join(" · ")}
					</Fact>
					<Fact label="Vendor">{t.vendor?.name}</Fact>
					<Fact label="Tags">
						{t.tags.length > 0 && (
							<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
								<TagChips tags={t.tags} />
							</Box>
						)}
					</Fact>
					{/* a description that already serves as the title is not repeated */}
					<Fact label="Note">{t.description === txRowTitle(t) ? null : t.description}</Fact>
					<Fact label="Items">
						{t.splits.length > 1 && (
							<Box component="ul" sx={{ m: 0, p: 0, listStyle: "none" }}>
								{t.splits.map((s) => (
									<Box
										key={s.id}
										component="li"
										sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
									>
										<span>{s.name}</span>
										<Money amount={s.amount} currency={t.currency} />
									</Box>
								))}
							</Box>
						)}
					</Fact>
					<Fact label="Place">{t.latitude != null ? placeLabel(t) : null}</Fact>
					<Fact label="Attached">
						{t.attachment_count + t.link_count > 0 &&
							[
								t.attachment_count > 0 &&
									`${t.attachment_count} ${t.attachment_count === 1 ? "file" : "files"}`,
								t.link_count > 0 && `${t.link_count} ${t.link_count === 1 ? "link" : "links"}`,
							]
								.filter(Boolean)
								.join(", ")}
					</Fact>
					<Box
						sx={{
							display: "flex",
							flexWrap: "wrap",
							justifyContent: "flex-end",
							gap: 1.5,
							mt: 3,
							// on a phone the buttons share the width two by two, not ragged
							"& > .MuiButton-root": {
								flex: "1 1 calc(50% - 6px)",
								"@media (min-width: 600px)": { flex: "0 0 auto" },
							},
						}}
					>
						<TxActions
							t={t}
							onConvert={then(onConvert)}
							onSplit={then(onSplit)}
							onRefund={then(onRefund)}
							onDuplicate={then(onDuplicate)}
							onEdit={then(onEdit)}
							onDelete={then(onDelete)}
						/>
					</Box>
				</>
			)}
		</Drawer>
	);
}
