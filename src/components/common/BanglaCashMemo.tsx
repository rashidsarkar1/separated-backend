import React from "react";
import { format } from "date-fns";
import { buildCashMemoRows, getCashMemoGrandTotal } from "../../utils/cashMemo";

interface BanglaCashMemoProps {
  order: any;
}

const SHOP_PHONE_NUMBERS = ["০১৭২০-১৪৮০৬৩", "০১৯১২-৬৬৮৬৭৫", "০১৯১৯-২৮৩৬৪৮"];
const ROWS_PER_PAGE = 10;

const taka = (amount: number) =>
  `৳ ${new Intl.NumberFormat("bn-BD", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)}`;

const toBanglaDigits = (value: string) =>
  value.replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);

const unitInBangla: Record<string, string> = {
  unit: "",
  piece: "পিস",
  pieces: "পিস",
  dozen: "ডজন",
  box: "বক্স",
  packed: "প্যাকেট",
  carton: "কার্টন",
  kilogram: "কেজি",
  kg: "কেজি",
  gram: "গ্রাম",
  liter: "লিটার",
  meter: "মিটার",
};

export function BanglaCashMemo({ order }: BanglaCashMemoProps) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const rows = buildCashMemoRows(items);
  const grandTotal = getCashMemoGrandTotal(rows);
  const rawId = String(order?._id || order?.id || "");
  const customerName = String(
    order?.customerName || order?.customerId?.name || order?.customer?.name || "",
  );
  const memoNumber = toBanglaDigits(
    String(order?.memoNumber || order?.receiptNumber || rawId.slice(-8).toUpperCase() || "-"),
  );
  const createdAt = new Date(order?.createdAt || order?.orderDate || order?.date || Date.now());
  const date = Number.isNaN(createdAt.getTime())
    ? "-"
    : toBanglaDigits(format(createdAt, "dd/MM/yyyy"));
  const pages = Array.from(
    { length: Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE)) },
    (_, index) => rows.slice(index * ROWS_PER_PAGE, (index + 1) * ROWS_PER_PAGE),
  );

  return (
    <article id="cash-memo-print-root" className="cash-memo" lang="bn">
      {pages.map((pageRows, pageIndex) => {
        const pageTotal = getCashMemoGrandTotal(pageRows);
        const isLastPage = pageIndex === pages.length - 1;
        return <section className="cash-memo-page" key={pageIndex}>
      <header className="cash-memo-header">
        <div className="cash-memo-topline">
          <span className="cash-memo-number-label">{memoNumber}</span>
          <h2>ক্যাশ মেমো</h2>
          <p className="cash-memo-phones">মোবা: {SHOP_PHONE_NUMBERS.map((phone) => <span key={phone}>{phone}</span>)}</p>
        </div>
        <h1>গাজীপুর সাইকেল সেন্টার</h1>
        <p>এখানে যাবতীয় রিকশা ও সাইকেল পার্টস</p>
        <p>পাইকারি ও খুচরা বিক্রয় করা হয়।</p>
        <p>ফরিদ ম্যানশন, মসজিদ রোড, জয়দেবপুর, গাজীপুর।</p>
      </header>

      <section className="cash-memo-fields" aria-label="মেমোর তথ্য">
        <p><strong>নাম:</strong> {customerName}</p>
        <p><strong>তারিখ:</strong> {date}</p>
      </section>

      <section className="cash-memo-items" aria-label="মালামালের বিবরণ">
        <div className="cash-memo-column-headings" aria-hidden="true">
          <span>পরিমাণ</span><span>নাম</span><span>দর</span><span>মোট</span>
        </div>
        {pageRows.length > 0 ? pageRows.map((row, index) => (
          <div className="cash-memo-row" key={`${row.productName}-${index}`}>
            <span className="cash-memo-quantity">
              {new Intl.NumberFormat("bn-BD", { maximumFractionDigits: 2 }).format(row.quantity)}
              {row.unit && (
                <span className="cash-memo-unit">
                  {unitInBangla[row.unit.toLowerCase()] ?? row.unit}
                </span>
              )}
            </span>
            <span className="cash-memo-product">{row.productName}</span>
            <span className="cash-memo-number">{taka(row.unitPrice)}</span>
            <span className="cash-memo-number">{taka(row.total)}</span>
          </div>
        )) : (
          <div className="cash-memo-row cash-memo-empty">কোনো মালামাল নেই</div>
        )}
      </section>

      {pages.length > 1 && <footer className="cash-memo-total">
        <strong>পাতা {toBanglaDigits(String(pageIndex + 1))} যোগফল</strong>
        <strong>{taka(pageTotal)}</strong>
      </footer>}
      {isLastPage && <footer className="cash-memo-grand-total">
        <strong>মোট</strong><strong>{taka(grandTotal)}</strong>
      </footer>}
        </section>;
      })}
    </article>
  );
}
