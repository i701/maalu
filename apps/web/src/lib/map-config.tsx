import { createContext, useContext, type ReactNode } from "react";
import type { MapConfig } from "#/server/map";

const MapConfigContext = createContext<MapConfig | null>(null);

/** Gives the maps below it the tile source the server was set up with. */
export function MapConfigProvider({ value, children }: { value: MapConfig; children: ReactNode }) {
	return <MapConfigContext.Provider value={value}>{children}</MapConfigContext.Provider>;
}

export function useMapConfig(): MapConfig {
	const config = useContext(MapConfigContext);
	if (!config) throw new Error("useMapConfig needs a MapConfigProvider above it");
	return config;
}
