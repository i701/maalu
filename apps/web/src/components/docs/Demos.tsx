import type { ReactElement } from "react";
import { DEMO_IDS, type DemoId } from "#/lib/docs/demo-ids";
import { statementDemo } from "#/lib/docs/demo-data";
import CardStatementPanel from "../account/CardStatementPanel";

const noop = () => {};

/** The live examples, by id. Each is the real component of the app drawn with made-up data. A new
 * id needs an entry in `demo-ids.ts` and one here (the type makes both required). */
const DEMOS: Record<DemoId, () => ReactElement> = {
	"card-statement": () => <CardStatementPanel statement={statementDemo} onRepay={noop} />,
};

export const isDemo = (id: string): id is DemoId => (DEMO_IDS as readonly string[]).includes(id);

export default DEMOS;
