import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
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
						maxHeight: "85vh",
						width: "min(640px, 100%)",
						mx: "auto",
						p: 2.5,
						pt: 1.5,
						borderTopLeftRadius: "var(--shape-xl)",
						borderTopRightRadius: "var(--shape-xl)",
						backgroundColor: "var(--md-sys-color-surface-container-low)",
					},
				},
			}}
		>
			<SheetHandle />
			{t && (
				<>
					<Typography variant="h6" sx={{ fontWeight: 500 }}>
						{txRowTitle(t)}
					</Typography>
					<Box
						sx={{ mt: 0.5, "& .MuiTypography-body2": { fontSize: "1.375rem", fontWeight: 400 } }}
					>
						<TxAmount t={t} baseCurrency={baseCurrency} />
					</Box>
					<Box sx={{ mt: 1.5, display: "flex", flexWrap: "wrap", gap: 0.75 }}>
						{t.planned && <TonalChip accent={ACCENT.amber} label="Planned" />}
						<TxRefundChip t={t} />
						<TxSubscriptionChip t={t} />
						<TxGroupChip t={t} />
						<TxStatsChips t={t} />
					</Box>
					<Divider sx={{ my: 1.5 }} />
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
					<Divider sx={{ my: 1.5 }} />
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
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
