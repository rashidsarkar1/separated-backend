import { Router } from "express";
import { AuthRoutes } from "../modules/auth/auth.routes";
import { InventoryRoutes } from "../modules/inventory/inventory.routes";
import { TransactionRoutes } from "../modules/transactions/transaction.routes";
import { AnalyticsRoutes } from "../modules/analytics/analytics.routes";
import { CustomerRoutes } from "../modules/customers/customer.routes";
import { DealerRoutes } from "../modules/dealers/dealers.routes";
import { settingsRoutes } from "../modules/settings/settings.routes";
import { AIRoutes } from "../modules/ai/ai.routes";
import { dealerReceiptRoutes } from "../modules/dealer-receipts/dealer-receipt.routes";
import { CategoryRoutes } from "../modules/categories/category.routes";

const router = Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/inventory",
    route: InventoryRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/transactions",
    route: TransactionRoutes,
  },
  {
    path: "/analytics",
    route: AnalyticsRoutes,
  },
  {
    path: "/customers",
    route: CustomerRoutes,
  },
  {
    path: "/dealers",
    route: DealerRoutes,
  },
  {
    path: "/dealer-receipts",
    route: dealerReceiptRoutes,
  },
  {
    path: "/settings",
    route: settingsRoutes,
  },
  {
    path: "/ai",
    route: AIRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
