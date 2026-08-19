export type Product = {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  unitPrice: string;
  // Absent pour un role non-admin (masque cote API : revele la marge).
  purchasePrice?: string;
  unitLabel: string;
  packageLabel: string | null;
  unitsPerPackage: number | null;
  currentStock: number;
  stockMinThreshold: number;
  isActive: number;
  createdAt: string;
};

export type Sale = {
  id: string;
  productId: string;
  soldAt: string;
  unitPrice: string;
  quantity: number;
  discount: string;
  grossAmount: string;
  netAmount: string;
  paymentMethod: string;
  batchId: string | null;
};

export type StockMovement = {
  id: string;
  productId: string;
  type: "initial" | "entry" | "sale_exit" | "adjustment";
  quantityDelta: number;
  note: string | null;
  batchId: string | null;
  reversalOfBatchId: string | null;
  createdByUserId: string;
  createdAt: string;
};

export type StockMovementWithProduct = {
  id: string;
  productId: string;
  productName: string;
  type: StockMovement["type"];
  quantityDelta: number;
  note: string | null;
  batchId: string | null;
  reversalOfBatchId: string | null;
  createdAt: string;
};

export type Expense = {
  id: string;
  expenseDate: string;
  label: string;
  categoryId: string | null;
  amount: string;
  paymentMethod: string;
  frequency: string | null;
  remark: string | null;
};

export type Category = {
  id: string;
  organizationId: string;
  name: string;
};

export type Organization = {
  id: string;
  name: string;
  city: string | null;
  country: string | null;
  currency: string;
  monthlyRevenueTarget: string | null;
  monthlyMarginTargetPct: string | null;
  defaultStockAlertThreshold: number;
  activePaymentMethods: string[];
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  createdAt: string;
};

export type PeriodKey = "today" | "week" | "month" | "year";

// Vue reduite renvoyee au barman : uniquement le stock, pas les chiffres
// financiers (cf. audit sur la separation des roles).
export type RestrictedDashboardData = {
  restricted: true;
  period: { key: PeriodKey; from: string; to: string };
  salesCount: number;
  activeProductsCount: number;
  stock: { alerts: Product[]; alertsCount: number };
};

export type FullDashboardData = {
  restricted: false;
  period: { key: PeriodKey; from: string; to: string; granularity: "hour" | "day" | "month" };
  revenue: { gross: number; net: number; salesCount: number; avgTicket: number; deltaPct: number | null };
  timeSeries: { bucket: string; net: number }[];
  expenses: { total: number; byCategory: { category: string; amount: number; percentage: number }[] };
  revenueByCategory: { category: string; amount: number; percentage: number }[];
  paymentMethodBreakdown: { method: string; amount: number; percentage: number }[];
  topProducts: { productId: string; name: string; quantity: number; amount: number }[];
  result: { netProfit: number; marginPct: number | null; goalProgressPct: number | null; monthlyRevenueTarget: number | null };
  stock: { totalValue: number; activeProductsCount: number; alerts: Product[]; alertsCount: number };
};

export type DashboardData = FullDashboardData | RestrictedDashboardData;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  especes: "Especes",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  wave: "Wave",
  carte_virement: "Carte / Virement",
  credit_client: "Credit client",
};

export const ALL_PAYMENT_METHODS = Object.keys(PAYMENT_METHOD_LABELS);

export const UNIT_LABEL_OPTIONS = [
  { value: "bouteille", label: "Bouteille" },
  { value: "canette", label: "Canette" },
  { value: "sachet", label: "Sachet" },
  { value: "verre", label: "Verre" },
  { value: "bidon", label: "Bidon" },
] as const;

export const PACKAGE_LABEL_OPTIONS = [
  { value: "casier", label: "Casier" },
  { value: "carton", label: "Carton" },
  { value: "pack", label: "Pack" },
  { value: "caisse", label: "Caisse" },
  { value: "fut", label: "Fut" },
] as const;
