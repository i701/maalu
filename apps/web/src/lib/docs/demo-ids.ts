/** The live examples a guide can show. Each has a component in `components/docs/Demos.tsx` and its
 * made-up data in `demo-data.ts`. */
export const DEMO_IDS = ["card-statement", "plan-agenda", "salary-rules", "budget-limits"] as const;
export type DemoId = (typeof DEMO_IDS)[number];
