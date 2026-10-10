import { useEffect } from "react";

/** Highlights re-renders while developing. The `import.meta.env.DEV` guard lets the bundler drop
 * react-scan from production builds entirely. */
export default function ReactScan() {
	useEffect(() => {
		if (!import.meta.env.DEV) return;
		void import("react-scan").then(({ scan }) => scan({ enabled: true }));
	}, []);
	return null;
}
