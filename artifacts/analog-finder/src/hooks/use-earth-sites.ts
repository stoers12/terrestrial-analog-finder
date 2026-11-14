import { useQuery } from "@tanstack/react-query";
import { getGrid, measureSites } from "@workspace/api-client-react";
import { EARTH_SEEDS, hydrateEarthSite, type Site } from "@/data/sites";

/** Earth sites with temperature, pressure, precipitation, wind and relief measured by the API server. */
export function useEarthSites() {
  const q = useQuery({
    queryKey: ["earth-site-measurements"],
    staleTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<Site[]> => {
      const { results } = await measureSites({ points: EARTH_SEEDS.map(({ id, lat, lon }) => ({ id, lat, lon })) });
      const byId = new Map(results.map((r) => [r.id, r]));
      return EARTH_SEEDS.map((seed) => {
        const m = byId.get(seed.id);
        if (!m) throw new Error(`No measurement returned for ${seed.name}`);
        return hydrateEarthSite(seed, m);
      });
    },
  });
  return { sites: q.data ?? null, isLoading: q.isLoading, error: q.error as Error | null, refetch: q.refetch };
}

/** Global grid of measured land cells. Polls while the server is still filling it. */
export function useGrid() {
  return useQuery({
    queryKey: ["global-grid"],
    queryFn: () => getGrid(),
    refetchInterval: (query) => {
      const phase = query.state.data?.status.phase;
      return phase === "done" || phase === "error" ? false : 8000;
    },
  });
}
