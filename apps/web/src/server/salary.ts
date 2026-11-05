import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SalaryRule, SalarySplitPlan, SalarySplitTask } from "#/types/api";
import { apiRequest } from "./api";

const amount = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/, "Enter a valid positive amount (max 4 decimals)")
	.refine((v) => Number(v) > 0, "The amount must be greater than 0");
const mode = z.enum(["percent", "fixed"]);

/** What each account or goal gets when a salary is split. */
export const listSalaryRulesFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<SalaryRule[]>("/salary-rules"),
);

export const createSalaryRuleFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			account_id: z.uuid().optional(),
			goal_id: z.uuid().optional(),
			mode,
			value: amount,
			auto: z.boolean().optional(),
		}),
	)
	.handler(async ({ data }) =>
		apiRequest<SalaryRule>("/salary-rules", { method: "POST", body: data }),
	);

export const updateSalaryRuleFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			mode: mode.optional(),
			value: amount.optional(),
			auto: z.boolean().optional(),
		}),
	)
	.handler(async ({ data: { id, ...body } }) =>
		apiRequest<SalaryRule>(`/salary-rules/${id}`, { method: "PATCH", body }),
	);

export const deleteSalaryRuleFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) => apiRequest<void>(`/salary-rules/${data.id}`, { method: "DELETE" }));

/** What the rules would send on from a salary, or what its split made. */
export const getSalarySplitFn = createServerFn({ method: "GET" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<SalarySplitPlan>(`/transactions/${data.id}/salary-split`),
	);

/** Make the split with the lines the user confirmed. */
export const applySalarySplitFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			id: z.uuid(),
			items: z
				.array(z.object({ target_type: z.enum(["account", "goal"]), target_id: z.uuid(), amount }))
				.min(1)
				.max(50),
		}),
	)
	.handler(async ({ data: { id, items } }) =>
		apiRequest<{ transfers: number; entries: number }>(`/transactions/${id}/salary-split`, {
			method: "POST",
			body: { items },
		}),
	);

/** Take a split back: its transfers go to the trash and its set-asides are removed. */
export const undoSalarySplitFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<void>(`/transactions/${data.id}/salary-split`, { method: "DELETE" }),
	);

/** The salaries waiting for their split to be approved, newest first. */
export const listSalarySplitTasksFn = createServerFn({ method: "GET" }).handler(async () =>
	apiRequest<SalarySplitTask[]>("/salary-split-tasks"),
);

/** How many are waiting, for the sidebar badge. Never fails the page: 0 when it can't be read. */
export const pendingSplitCountFn = createServerFn({ method: "GET" }).handler(async () => {
	const res = await apiRequest<{ count: number }>("/salary-split-tasks/count");
	return res.ok ? res.data.count : 0;
});

/** Don't split this salary: it leaves the list and can still be split by hand. */
export const dismissSalarySplitTaskFn = createServerFn({ method: "POST" })
	.validator(z.object({ id: z.uuid() }))
	.handler(async ({ data }) =>
		apiRequest<void>(`/salary-split-tasks/${data.id}/dismiss`, { method: "POST" }),
	);
