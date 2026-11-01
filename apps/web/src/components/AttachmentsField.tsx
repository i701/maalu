import AttachFileIcon from "@mui/icons-material/AttachFile";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import LinkIcon from "@mui/icons-material/Link";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import { useRef, useState } from "react";
import {
	ATTACHMENT_ACCEPT,
	attachmentUrl,
	formatBytes,
	isImage,
	MAX_ATTACHMENTS,
} from "#/lib/attachments";
import { hostOf, linkLabel, MAX_LINKS } from "#/lib/links";
import LinkAdder from "./LinkAdder";
import type { AttachmentsState } from "./transaction-form/useAttachments";
import type { LinksState } from "./transaction-form/useLinks";

const TILE = 48;

function Tile({ children }: { children: React.ReactNode }) {
	return (
		<Box
			sx={{
				width: TILE,
				height: TILE,
				flexShrink: 0,
				display: "grid",
				placeItems: "center",
				borderRadius: "var(--shape-sm)",
				overflow: "hidden",
				bgcolor: "var(--md-sys-color-surface-container-highest)",
			}}
		>
			{children}
		</Box>
	);
}

/** A thumbnail for a saved photo, a PDF icon for a PDF, and a plain clip for anything not shown. */
function Thumb({ mime, src }: { mime: string; src: string | null }) {
	return (
		<Tile>
			{src && isImage(mime) ? (
				<Box
					component="img"
					src={src}
					alt=""
					loading="lazy"
					sx={{ width: "100%", height: "100%", objectFit: "cover" }}
				/>
			) : mime === "application/pdf" ? (
				<PictureAsPdfOutlinedIcon />
			) : (
				<AttachFileIcon />
			)}
		</Tile>
	);
}

function Row({
	thumb,
	name,
	meta,
	href,
	onRemove,
	disabled,
}: {
	thumb: React.ReactNode;
	name: string;
	meta: string;
	href?: string;
	onRemove: () => void;
	disabled: boolean;
}) {
	return (
		<Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
			{thumb}
			<Box sx={{ minWidth: 0, flex: 1 }}>
				<Typography
					variant="body2"
					noWrap
					component={href ? "a" : "p"}
					href={href}
					target={href ? "_blank" : undefined}
					rel={href ? "noopener noreferrer" : undefined}
					sx={{ display: "block", color: "inherit", textDecoration: "none", fontWeight: 500 }}
				>
					{name}
				</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					{meta}
				</Typography>
			</Box>
			<IconButton
				size="small"
				aria-label={`Remove ${name}`}
				title="Remove"
				disabled={disabled}
				onClick={onRemove}
			>
				<DeleteOutlineIcon fontSize="small" />
			</IconButton>
		</Box>
	);
}

/** Receipts and invoices for a transaction: photos or PDFs, picked or dropped here. */
export default function AttachmentsField({
	state,
	links,
}: {
	state: AttachmentsState;
	links: LinksState;
}) {
	const picker = useRef<HTMLInputElement>(null);
	const [over, setOver] = useState(false);
	const [adding, setAdding] = useState(false);
	const count = state.saved.length + state.pending.length;

	return (
		<Box
			onDragOver={(e) => {
				e.preventDefault();
				setOver(true);
			}}
			onDragLeave={() => setOver(false)}
			onDrop={(e) => {
				e.preventDefault();
				setOver(false);
				void state.add([...e.dataTransfer.files]);
			}}
			sx={{
				p: 1.5,
				borderRadius: "var(--shape-md)",
				border: "1px dashed",
				borderColor: over ? "primary.main" : "divider",
				display: "grid",
				gap: 1.25,
			}}
		>
			<Box>
				<Typography variant="subtitle2">Attachments</Typography>
				<Typography variant="caption" sx={{ color: "text.secondary" }}>
					Receipts or invoices: JPEG, PNG, WebP or PDF up to 10 MB, {MAX_ATTACHMENTS} files at most.
					Or a link to an online receipt or order page. Drop files here.
				</Typography>
			</Box>
			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
				<Button
					size="small"
					variant="outlined"
					color="inherit"
					startIcon={<AttachFileIcon />}
					loading={state.busy}
					disabled={count >= MAX_ATTACHMENTS}
					onClick={() => picker.current?.click()}
				>
					Add files
				</Button>
				<Button
					size="small"
					variant="outlined"
					color="inherit"
					startIcon={<LinkIcon />}
					disabled={adding || links.saved.length + links.pending.length >= MAX_LINKS}
					onClick={() => setAdding(true)}
				>
					Add link
				</Button>
				<input
					ref={picker}
					type="file"
					accept={ATTACHMENT_ACCEPT}
					multiple
					hidden
					onChange={(e) => {
						void state.add([...(e.target.files ?? [])]);
						e.target.value = "";
					}}
				/>
			</Box>
			{state.error && (
				<Typography variant="caption" role="alert" sx={{ color: "error.main" }}>
					{state.error}
				</Typography>
			)}
			{state.saved.map((a) => (
				<Row
					key={a.id}
					thumb={<Thumb mime={a.mime_type} src={attachmentUrl(a.id)} />}
					name={a.filename}
					meta={formatBytes(a.size)}
					href={attachmentUrl(a.id)}
					disabled={state.busy}
					onRemove={() => void state.remove(a.id)}
				/>
			))}
			{state.pending.map(({ key, file }) => (
				<Row
					key={key}
					thumb={<Thumb mime={file.type} src={null} />}
					name={file.name}
					meta={`${formatBytes(file.size)} · attached when you save`}
					disabled={state.busy}
					onRemove={() => state.removePending(key)}
				/>
			))}
			{links.error && (
				<Typography variant="caption" role="alert" sx={{ color: "error.main" }}>
					{links.error}
				</Typography>
			)}
			{links.saved.map((l) => (
				<Row
					key={l.id}
					thumb={
						<Tile>
							<LinkIcon />
						</Tile>
					}
					name={linkLabel(l)}
					meta={hostOf(l.url)}
					href={l.url}
					disabled={links.busy}
					onRemove={() => void links.remove(l.id)}
				/>
			))}
			{links.pending.map((l) => (
				<Row
					key={l.key}
					thumb={
						<Tile>
							<LinkIcon />
						</Tile>
					}
					name={linkLabel(l)}
					meta={`${hostOf(l.url)} · added when you save`}
					disabled={links.busy}
					onRemove={() => links.removePending(l.key)}
				/>
			))}
			{adding && <LinkAdder busy={links.busy} onAdd={links.add} onClose={() => setAdding(false)} />}
		</Box>
	);
}
