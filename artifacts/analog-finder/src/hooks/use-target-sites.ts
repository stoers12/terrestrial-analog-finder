import { useQuery } from "@tanstack/react-query";
import { getTargets } from "@workspace/api-client-react";
import { TARGET_SEEDS, hydrateTargetSite, type Site, type TargetApiSite } from "@/data/sites";

export interface TargetsData {
  sites: Site[];
  processedAt: string;
  datasets: { name: string; body: string; role: string; url: string; kind: string; steps: string[] }[];
  validation: string[];
}

/** Moon and Mars targets: editorial seeds merged with the values the NASA data pipeline stored in the database. */
export function useTargetSites() {
  const q = useQuery({
    queryKey: ["target-sites"],
    staleTime: Infinity,
    retry: 1,
    queryFn: async (): Promise<TargetsData> => {
      const res = await getTargets();
      const byId = new Map<string, TargetApiSite>(res.sites.map((s) => [s.id, s as TargetApiSite]));
      const sites = TARGET_SEEDS.map((seed) => {
        const api = byId.get(seed.id);
        if (!api) throw new Error(`The server returned no pipeline data for ${seed.name}`);
        return hydrateTargetSite(seed, api);
      });
      return { sites, processedAt: res.processedAt, datasets: res.datasets, validation: res.validation };
    },
  });
  return { data: q.data ?? null, isLoading: q.isLoading, error: q.error as Error | null, refetch: q.refetch };
}
