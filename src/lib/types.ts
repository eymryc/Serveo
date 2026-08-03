export type Product = {
  id: string;
  organizationId: string;
  categoryId: string | null;
  name: string;
  unitPrice: string;
  // Absent pour un role non-admin (masque cote API : revele la marge).
  purchasePrice?: string;
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

// Vue reduite renvoyee au barman : uniquement le stock, pas les chiffres
// financiers (cf. audit sur la separation des roles).
export type RestrictedDashboardData = {
  restricted: true;
  period: { from: string; to: string };
  stock: { alerts: Product[]; alertsCount: number };
};

export type FullDashboardData = {
  restricted: false;
  period: { from: string; to: string };
  revenue: { gross: number; net: number; salesCount: number; avgTicket: number };
  expenses: { total: number; byCategory: { category: string; amount: number; percentage: number }[] };
  revenueByCategory: { category: string; amount: number; percentage: number }[];
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
