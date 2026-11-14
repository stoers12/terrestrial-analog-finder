import { Router, type IRouter } from "express";
import { MeasureSitesBody } from "@workspace/api-zod";
import { CELL_SIZE_DEG, gridCells, gridStatus, startGridJob } from "../lib/grid-job";
import { keyOf, measurePoints } from "../lib/measure";
import { CLIMATE_SOURCE, ELEVATION_SOURCE } from "../lib/upstream";

const router: IRouter = Router();

router.post("/measurements", async (req, res) => {
  const parsed = MeasureSitesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { points } = parsed.data;
  const { rows, failed } = await measurePoints(points);
  if (failed.length > 0) {
    res.status(502).json({
      error: `Could not measure ${failed.length} of ${points.length} points. First error: ${failed[0].error}`,
    });
    return;
  }
  res.json({
    results: points.map((p) => {
      const r = rows.get(keyOf(p))!;
      return {
        id: p.id,
        lat: p.lat,
        lon: p.lon,
        elevationM: r.elevationM,
        reliefM: r.reliefM,
        tMeanC: r.tMeanC,
        tMinC: r.tMinC,
        tMaxC: r.tMaxC,
        precipMm: r.precipMm,
        pressureKpa: r.pressureKpa,
        windMs: r.windMs,
        climateSource: r.climateSource,
        elevationSource: r.elevationSource,
        fetchedAt: r.fetchedAt.toISOString(),
      };
    }),
  });
});

router.get("/grid", async (_req, res) => {
  startGridJob();
  const [status, cells] = await Promise.all([gridStatus(), gridCells()]);
  res.json({
    status: { ...status, cellSizeDeg: CELL_SIZE_DEG },
    climateSource: CLIMATE_SOURCE,
    elevationSource: ELEVATION_SOURCE,
    cells,
  });
});

export default router;
