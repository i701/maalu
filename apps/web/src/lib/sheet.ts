import { useState } from "react";

/** State for a dialog that animates out before it is removed. */
export type Sheet = {
	/** Whether the sheet is shown; false starts the fade-out. */
	open: boolean;
	/** Ask the sheet to close (Cancel, Escape, backdrop, or after a successful save). */
	close: () => void;
	/** Called by the dialog once the fade-out has finished: the cue to unmount it. */
	onExited: () => void;
};

/**
 * Lets a dialog play its exit animation. The page keeps rendering the dialog until `onClosed`
 * fires, which happens after the fade-out; call `sheet.close()` instead of unmounting directly.
 */
export function useSheet(onClosed: () => void): Sheet {
	const [open, setOpen] = useState(true);
	return { open, close: () => setOpen(false), onExited: onClosed };
}
