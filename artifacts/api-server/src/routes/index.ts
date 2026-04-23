import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import employeesRouter from "./employees";
import attendanceRouter from "./attendance";
import salariesRouter from "./salaries";
import advancesRouter from "./advances";
import copperRouter from "./copper";
import dashboardRouter from "./dashboard";
import productionRouter from "./production";
import customersRouter from "./customers";
import ordersRouter from "./orders";
import stockRouter from "./stock";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(employeesRouter);
router.use(attendanceRouter);
router.use(salariesRouter);
router.use(advancesRouter);
router.use(copperRouter);
router.use(dashboardRouter);
router.use(productionRouter);
router.use(customersRouter);
router.use(ordersRouter);
router.use(stockRouter);

export default router;
