import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import ConfirmDelete from "#/components/ConfirmDelete";
import PageHeader from "#/components/PageHeader";
import TableCard from "#/components/TableCard";
import RefreshButton from "#/components/RefreshButton";
import VendorForm from "#/components/VendorForm";
import { unwrap } from "#/lib/unwrap";
import { listCurrenciesFn } from "#/server/currencies";
import { deleteVendorFn, listVendorsFn } from "#/server/vendors";
import type { Vendor } from "#/types/api";

export const Route = createFileRoute("/_protected/vendors")({
	loader: async () => {
		const [vendors, currencies] = await Promise.all([listVendorsFn(), listCurrenciesFn()]);
		return { vendors: unwrap(vendors), currencies };
	},
	component: VendorsPage,
});

const dash = (
	<Typography component="span" sx={{ color: "text.disabled" }}>
		—
	</Typography>
);

function VendorsPage() {
	const { vendors, currencies } = Route.useLoaderData();
	const [editing, setEditing] = useState<Vendor | "new" | null>(null);
	const [deleting, setDeleting] = useState<Vendor | null>(null);

	return (
		<>
			<PageHeader
				title="Vendors"
				description="Shops, people and companies you pay."
				action={
					<Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing("new")}>
						Add vendor
					</Button>
				}
			/>

			<TableCard>
				<Stack
					direction="row"
					sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1 }}
				>
					<Typography variant="body2" sx={{ color: "text.secondary" }}>
						{vendors.length} {vendors.length === 1 ? "vendor" : "vendors"}
					</Typography>
					<RefreshButton />
				</Stack>
				{vendors.length === 0 ? (
					<Typography sx={{ textAlign: "center", py: 8, px: 2, color: "text.secondary" }}>
						No vendors yet. They're also created automatically when you name one on a transaction.
					</Typography>
				) : (
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow>
									<TableCell>Name</TableCell>
									<TableCell>Type</TableCell>
									<TableCell>Currency</TableCell>
									<TableCell>Contact</TableCell>
									<TableCell>Address</TableCell>
									<TableCell align="right" sx={{ width: 100 }} />
								</TableRow>
							</TableHead>
							<TableBody>
								{vendors.map((v) => (
									<TableRow key={v.id} hover>
										<TableCell>
											<Typography variant="body2" sx={{ fontWeight: 500 }}>
												{v.name}
											</Typography>
										</TableCell>
										<TableCell>
											{v.is_local == null ? (
												dash
											) : (
												<Chip
													size="small"
													color={v.is_local ? "success" : "warning"}
													label={v.is_local ? "Local" : "Foreign"}
												/>
											)}
										</TableCell>
										<TableCell>{v.currency ?? dash}</TableCell>
										<TableCell>{v.contact ?? dash}</TableCell>
										<TableCell sx={{ maxWidth: 260 }}>
											<Typography variant="body2" noWrap>
												{v.address ?? dash}
											</Typography>
										</TableCell>
										<TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
											<Tooltip title="Edit">
												<IconButton aria-label="Edit" size="small" onClick={() => setEditing(v)}>
													<EditOutlinedIcon fontSize="small" />
												</IconButton>
											</Tooltip>
											<Tooltip title="Delete">
												<IconButton aria-label="Delete" size="small" onClick={() => setDeleting(v)}>
													<DeleteOutlineIcon fontSize="small" />
												</IconButton>
											</Tooltip>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				)}
			</TableCard>

			{editing && (
				<VendorForm
					vendor={editing === "new" ? undefined : editing}
					currencies={currencies}
					onClose={() => setEditing(null)}
				/>
			)}
			{deleting && (
				<ConfirmDelete
					title="Delete vendor"
					message={`Delete "${deleting.name}"? Its transactions are kept and just lose the vendor link.`}
					onConfirm={() => deleteVendorFn({ data: { id: deleting.id } })}
					onClose={() => setDeleting(null)}
				/>
			)}
		</>
	);
}
