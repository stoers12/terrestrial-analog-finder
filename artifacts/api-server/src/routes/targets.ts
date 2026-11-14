import { Router, type IRouter } from "express";
import { db, targetValuesTable } from "@workspace/db";
import { snapshot } from "../lib/targets";
import { TARGETS } from "../pipeline/targets";
import { VARIABLES } from "../pipeline/types";

const router: IRouter = Router();

router.get("/targets", async (_req, res) => {
  const rows = await db.select().from(targetValuesTable);
  const sites = TARGETS.map((t) => {
    const values: Record<string, unknown> = {};
    for (const variable of VARIABLES) {
      const r = rows.find((x) => x.siteId === t.id && x.variable === variable);
      if (!r) return { error: `${t.id} has no ${variable} value` };
      values[variable] = {
        value: r.value,
        kind: r.kind,
        product: r.product,
        sourceUrl: r.sourceUrl,
        processedAt: r.processedAt.toISOString(),
        pixelSize: r.pixelSize,
        cleaningNote: r.cleaningNote,
        samples: r.samples,
      };
    }
    return { id: t.id, body: t.body, lat: t.lat, lon: t.lon, values };
  });
  const broken = sites.find((s) => "error" in s) as { error: string } | undefined;
  if (broken) {
    res.status(500).json({ error: `Target table is incomplete: ${broken.error}. Run the pipeline.` });
    return;
  }
  res.json({
    pipelineVersion: snapshot.pipelineVersion,
    processedAt: snapshot.processedAt,
    sites,
    datasets: snapshot.datasets,
    validation: snapshot.validation,
  });
});

export default router;
