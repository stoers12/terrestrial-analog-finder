import { Router, type IRouter } from "express";
import healthRouter from "./health";
import measurementsRouter from "./measurements";
import targetsRouter from "./targets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(measurementsRouter);
router.use(targetsRouter);

export default router;
