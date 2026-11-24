import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import type { ReactNode } from "react";
import IconSymbol from "#/components/Symbol";
import { fillRows } from "#/lib/dashboard";
import { staggerChildren } from "#/lib/motion";

export type Section = {
	id: string;
	label: string;
	/** Columns of the 6 it spans on wide screens (narrow ones stack). */
	span: number;
	node: ReactNode;
};

const column = (span: number) => ({ gridColumn: { lg: `span ${span}` } });

const GRID_SX = {
	display: "grid",
	gap: 2,
	gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "repeat(6, minmax(0, 1fr))" },
};

/** The dashboard's sections in the order given. While `editing`, each one can be dragged by its
 * handle or moved with the arrows, and `onReorder` gets the new order of ids. */
export default function SectionGrid({
	sections,
	editing,
	hidden,
	onReorder,
	onToggleHidden,
}: {
	sections: Section[];
	editing: boolean;
	/** Ids turned off; while arranging they stay in the grid, dimmed, so they can be turned on. */
	hidden: ReadonlySet<string>;
	onReorder: (ids: string[]) => void;
	onToggleHidden: (id: string) => void;
}) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);
	const ids = sections.map((s) => s.id);

	if (!editing) {
		// cards turned off leave short rows: the ones left share the room
		const spans = fillRows(sections);
		return (
			<Box sx={{ ...GRID_SX, ...staggerChildren() }}>
				{sections.map((s) => (
					<Box
						key={s.id}
						sx={{ ...column(spans.get(s.id) ?? s.span), "& > *": { height: "100%" } }}
					>
						{s.node}
					</Box>
				))}
			</Box>
		);
	}

	const move = (from: number, to: number) => onReorder(arrayMove(ids, from, to));
	const onDragEnd = ({ active, over }: DragEndEvent) => {
		if (over && active.id !== over.id)
			move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
	};

	return (
		<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
			<SortableContext items={ids} strategy={rectSortingStrategy}>
				<Box sx={GRID_SX}>
					{sections.map((s, index) => (
						<EditableSection
							key={s.id}
							section={s}
							first={index === 0}
							last={index === sections.length - 1}
							hidden={hidden.has(s.id)}
							onToggleHidden={() => onToggleHidden(s.id)}
							onMove={(by) => move(index, index + by)}
						/>
					))}
				</Box>
			</SortableContext>
		</DndContext>
	);
}

function EditableSection({
	section,
	first,
	last,
	hidden,
	onToggleHidden,
	onMove,
}: {
	section: Section;
	first: boolean;
	last: boolean;
	hidden: boolean;
	onToggleHidden: () => void;
	onMove: (by: -1 | 1) => void;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: section.id });
	return (
		<Box
			ref={setNodeRef}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			sx={{
				...column(section.span),
				position: "relative",
				zIndex: isDragging ? 2 : 0,
			}}
		>
			<Box
				sx={{
					height: "100%",
					// the cards are for looking at while arranging: no links or hovers
					pointerEvents: "none",
					opacity: isDragging ? 0.7 : hidden ? 0.35 : 1,
					outline: "2px dashed var(--md-sys-color-outline-variant)",
					outlineOffset: 2,
					borderRadius: "var(--shape-xl)",
					"& > *": { height: "100%" },
				}}
			>
				{section.node}
			</Box>
			<Box
				sx={{
					position: "absolute",
					top: 8,
					right: 8,
					display: "flex",
					alignItems: "center",
					borderRadius: "var(--shape-full)",
					bgcolor: "var(--md-sys-color-surface-container-highest)",
					boxShadow: 1,
				}}
			>
				<IconButton
					size="small"
					aria-label={hidden ? `Show ${section.label}` : `Hide ${section.label}`}
					aria-pressed={hidden}
					onClick={onToggleHidden}
				>
					{hidden ? (
						<VisibilityOffOutlinedIcon fontSize="small" />
					) : (
						<VisibilityOutlinedIcon fontSize="small" />
					)}
				</IconButton>
				<IconButton
					size="small"
					aria-label={`Move ${section.label} earlier`}
					disabled={first}
					onClick={() => onMove(-1)}
				>
					<IconSymbol name="keyboard_arrow_up" size={20} />
				</IconButton>
				<IconButton
					size="small"
					aria-label={`Move ${section.label} later`}
					disabled={last}
					onClick={() => onMove(1)}
				>
					<IconSymbol name="keyboard_arrow_down" size={20} />
				</IconButton>
				<IconButton
					size="small"
					ref={setActivatorNodeRef}
					aria-label={`Drag ${section.label}`}
					sx={{ cursor: "grab", touchAction: "none" }}
					{...attributes}
					{...listeners}
				>
					<DragIndicatorIcon fontSize="small" />
				</IconButton>
			</Box>
		</Box>
	);
}
