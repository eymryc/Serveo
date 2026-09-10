import { PAYMENT_METHOD_LABELS, type SaleTicket } from "@/lib/types";
import { formatFcfa } from "@/lib/format";

/** Ouvre une fenêtre imprimable pour un ticket de vente. */
export function printSaleTicket(ticket: SaleTicket) {
  const pay = PAYMENT_METHOD_LABELS[ticket.paymentMethod] ?? ticket.paymentMethod;
  const soldAt = new Date(ticket.soldAt).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const linesHtml = ticket.lines
    .map(
      (l) => `
      <tr>
        <td>${escapeHtml(l.productName)}</td>
        <td class="num">${l.quantity}</td>
        <td class="num">${formatFcfa(l.unitPrice)}</td>
        <td class="num">${formatFcfa(l.netAmount)}</td>
      </tr>
      ${
        l.discount > 0
          ? `<tr class="disc"><td colspan="4">Remise −${formatFcfa(l.discount)}</td></tr>`
          : ""
      }`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Ticket — ${escapeHtml(ticket.organizationName)}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0; padding: 16px; color: #111; }
    h1 { font-size: 16px; margin: 0 0 4px; text-align: center; }
    .meta { text-align: center; font-size: 11px; color: #444; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; border-bottom: 1px solid #111; padding: 4px 0; font-size: 10px; text-transform: uppercase; }
    td { padding: 6px 0; border-bottom: 1px dashed #ccc; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    .disc td { border: 0; color: #a00; font-size: 11px; padding-top: 0; }
    .tot { margin-top: 12px; border-top: 2px solid #111; padding-top: 8px; display: flex; justify-content: space-between; font-weight: 700; font-size: 14px; }
    .cancel { color: #a00; text-align: center; font-weight: 700; margin-bottom: 8px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(ticket.organizationName)}</h1>
  <div class="meta">
    ${escapeHtml(soldAt)}<br/>
    ${escapeHtml(pay)} · #${escapeHtml(ticket.batchId.slice(0, 8))}
    ${
      ticket.customerName
        ? `<br/>Client : ${escapeHtml(ticket.customerName)}`
        : ""
    }
  </div>
  ${ticket.cancelledAt ? '<p class="cancel">FACTURE ANNULÉE</p>' : ""}
  <table>
    <thead>
      <tr><th>Article</th><th class="num">Qté</th><th class="num">P.U.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>${linesHtml}</tbody>
  </table>
  <div class="tot">
    <span>Total</span>
    <span>${formatFcfa(ticket.totals.net)}</span>
  </div>
  <script>window.onload = function(){ window.print(); };</script>
</body>
</html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=420,height=640");
  if (!win) {
    throw new Error("Autorisez les pop-ups pour imprimer le ticket");
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
