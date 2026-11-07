/** The live examples a guide can show. Each has a component in `components/docs/Demos.tsx` and its
 * made-up data in `demo-data.ts`. */
export const DEMO_IDS = ["card-statement"] as const;
export type DemoId = (typeof DEMO_IDS)[number];
