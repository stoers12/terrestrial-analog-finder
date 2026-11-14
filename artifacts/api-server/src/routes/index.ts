import { Router, type IRouter } from "express";
import healthRouter from "./health";
import measurementsRouter from "./measurements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(measurementsRouter);

export default router;
