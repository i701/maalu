import type { Control } from "react-hook-form";
import { z } from "zod";
import { datesOverlap, nextStretch } from "#/lib/budget";
import { limit } from "#/server/budget";
import type { Budget, BudgetFixedLine, BudgetLine, Category } from "#/types/api";

export const isDated = (l?: BudgetLine): l is BudgetFixedLine => Boolean(l && "end_date" in l);
/** A per-period limit that only runs between two dates. */
export const isWindowed = (l?: BudgetLine) => Boolean(l?.runs_from);

export const limitSchema = z
	.object({
		name: z.string().trim().min(1, "Give the limit a name").max(200),
		category_ids: z.array(z.string()).min(1, "Choose at least one category"),
		amount: limit,
		warn_percent: z
			.string()
			.trim()
			.regex(/^\d*$/, "A whole number")
			.refine((v) => v === "" || (Number(v) >= 1 && Number(v) <= 100), "Between 1 and 100"),
		rollover: z.boolean(),
		// "Only for certain dates": both days, the last not before the first
		dated: z.boolean(),
		repeat: z.boolean(),
		start: z.string(),
		end: z.string(),
	})
	.superRefine((v, ctx) => {
		if (!v.dated) return;
		if (!v.start)
			ctx.addIssue({ code: "custom", path: ["start"], message: "Choose the first day" });
		if (!v.end) ctx.addIssue({ code: "custom", path: ["end"], message: "Choose the last day" });
		if (v.start && v.end && v.end < v.start)
			ctx.addIssue({
				code: "custom",
				path: ["end"],
				message: "The last day can't be before the first",
			});
	});

export type LimitControl = Control<
	z.input<typeof limitSchema>,
	unknown,
	z.output<typeof limitSchema>
>;
export type LimitValues = z.output<typeof limitSchema>;

/** Where the form starts: the limit being changed, the next stretch of one being repeated, or empty. */
export function limitDefaults(
	line: BudgetLine | undefined,
	repeatOf: BudgetFixedLine | undefined,
	categories: Category[],
): z.input<typeof limitSchema> {
	const base = line ?? repeatOf;
	const next = repeatOf ? nextStretch(repeatOf) : null;
	return {
		name: base?.name ?? "",
		category_ids: base
			? categories.filter((c) => base.categories.some((x) => x.id === c.id)).map((c) => c.id)
			: [],
		amount: base?.amount ?? "",
		warn_percent: line?.warn_percent?.toString() ?? "",
		rollover: line?.rollover ?? false,
		dated: isDated(line) || isWindowed(line) || Boolean(repeatOf),
		repeat: isWindowed(line),
		start: next?.start ?? (isDated(line) ? line.start_date : (line?.runs_from ?? "")),
		end: next?.end ?? (isDated(line) ? line.end_date : (line?.runs_until ?? "")),
	};
}

/** The checked values as the fields both create and update send; the warning level differs
 * (blank is "none" for a new limit, "back to the budget's" for a change). */
export function limitFields(v: LimitValues) {
	return {
		name: v.name,
		category_ids: v.category_ids,
		amount: v.amount,
		// one total for set dates never rolls over
		rollover: v.dated && !v.repeat ? false : v.rollover,
		...(v.dated ? { start_date: v.start, end_date: v.end, repeat: v.repeat } : {}),
	};
}

/** The categories other limits already hold, with the limit's name: a category is in one
 * per-period limit only, and in one limit per stretch of dates. A limit that runs between dates is
 * left to the server, which knows every period. */
export function takenByOthers(
	budget: Budget,
	lineId: string | undefined,
	v: Pick<LimitValues, "dated" | "repeat" | "start" | "end">,
): Map<string, string> {
	const others: BudgetLine[] =
		v.dated && !v.repeat && v.start && v.end
			? (budget.fixed_lines ?? []).filter((l) =>
					datesOverlap([v.start, v.end], [l.start_date, l.end_date]),
				)
			: v.dated
				? []
				: budget.lines;
	const map = new Map<string, string>();
	for (const l of others) {
		if (l.id === lineId) continue;
		for (const c of l.categories) map.set(c.id, l.name);
	}
	return map;
}
