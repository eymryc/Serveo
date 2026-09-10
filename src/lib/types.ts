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
  customerId?: string | null;
  cashSessionId?: string | null;
  batchId: string | null;
  cancelledAt?: string | null;
  cancelledByUserId?: string | null;
  cancelReason?: string | null;
};

export type CashMethodTotals = {
  especes: number;
  orange_money: number;
  mtn_momo: number;
  wave: number;
  carte_virement: number;
};

export type CashSession = {
  id: string;
  organizationId: string;
  status: "open" | "closed";
  openedAt: string;
  closedAt: string | null;
  openedByUserId: string;
  closedByUserId: string | null;
  openingFloat: string;
  countedEspeces: string | null;
  countedOrangeMoney: string | null;
  countedMtnMomo: string | null;
  countedWave: string | null;
  countedCarteVirement: string | null;
  note: string | null;
  createdAt: string;
};

export type CashSessionSummary = {
  session: CashSession;
  expectedByMethod: CashMethodTotals;
  countedByMethod: CashMethodTotals | null;
  variances: CashMethodTotals | null;
};

export type Customer = {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  note: string | null;
  isActive: number;
  createdAt: string;
  /** Présent sur la liste API (dette nette ; >0 = client doit). */
  balance?: number;
};

export type CustomerLedgerEntry =
  | {
      kind: "credit_sale";
      id: string;
      amount: number;
      at: string;
      paymentMethod: string;
      batchId: string | null;
      note: string | null;
    }
  | {
      kind: "payment";
      id: string;
      amount: number;
      at: string;
      paymentMethod: string;
      note: string | null;
    };

export type CustomerPayment = {
  id: string;
  organizationId: string;
  customerId: string;
  amount: string;
  paymentMethod: string;
  note: string | null;
  paidAt: string;
  cashSessionId: string | null;
  createdByUserId: string;
  createdAt: string;
};

export type InventorySession = {
  id: string;
  organizationId: string;
  status: "draft" | "completed";
  note: string | null;
  createdByUserId: string;
  completedAt: string | null;
  createdAt: string;
};

export type InventoryLine = {
  id: string;
  sessionId: string;
  productId: string;
  productName?: string;
  theoreticalQty: number;
  countedQty: number;
  variance: number;
};

export type Supplier = {
  id: string;
  organizationId: string;
  name: string;
  phone: string | null;
  note: string | null;
  isActive: number;
  createdAt: string;
};

export type SupplierDelivery = {
  id: string;
  organizationId: string;
  supplierId: string;
  supplierName?: string;
  deliveryDate: string;
  note: string | null;
  totalAmount: string;
  paidAmount: string;
  paymentMethod: string | null;
  stockBatchId: string | null;
  createdByUserId: string;
  createdAt: string;
};

export type SupplierDeliveryLine = {
  id: string;
  deliveryId: string;
  productId: string;
  quantity: number;
  unitCost: string;
};

export type SaleTicket = {
  organizationName: string;
  currency: string;
  batchId: string;
  soldAt: string;
  paymentMethod: string;
  customerId: string | null;
  customerName?: string | null;
  cancelledAt: string | null;
  lines: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    grossAmount: number;
    netAmount: number;
  }[];
  totals: { gross: number; discount: number; net: number };
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
  memberCanCancelSales: number;
};

export type TeamMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: "admin" | "member";
  createdAt: string;
};

export type PeriodPreset = "today" | "week" | "month" | "year";
export type PeriodKey = PeriodPreset | "custom";

export type PeriodSelection = {
  preset: PeriodKey;
  customFrom?: string;
  customTo?: string;
};

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
  revenue: {
    gross: number;
    net: number;
    cogs: number;
    grossMargin: number;
    grossMarginPct: number | null;
    salesCount: number;
    unitsSold: number;
    avgTicket: number;
    deltaPct: number | null;
  };
  timeSeries: { bucket: string; net: number }[];
  expenses: { total: number; byCategory: { category: string; amount: number; percentage: number }[] };
  revenueByCategory: { category: string; amount: number; percentage: number }[];
  paymentMethodBreakdown: { method: string; amount: number; percentage: number }[];
  topProducts: {
    productId: string;
    name: string;
    quantity: number;
    amount: number;
    cogs: number;
    profit: number;
    marginPct: number | null;
  }[];
  /** Compte de résultat simplifié : CA − COGS − charges. */
  result: {
    cogs: number;
    grossMargin: number;
    grossMarginPct: number | null;
    netProfit: number;
    marginPct: number | null;
    goalProgressPct: number | null;
    monthlyRevenueTarget: number | null;
  };
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
