import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculatePromoDiscount, calculateWalletBalance, findPromo, isValidEmail, isValidPhone, paymentLabel } from "../src/app/state";
import type { PromoCode, WalletLedgerEntry } from "../src/lib/types";

describe("app state helpers", () => {
  it("validates Indonesian WhatsApp numbers and email addresses", () => {
    assert.equal(isValidPhone("081234567890"), true);
    assert.equal(isValidPhone("+6281234567890"), true);
    assert.equal(isValidPhone("021-555"), false);
    assert.equal(isValidEmail("buyer@example.com"), true);
    assert.equal(isValidEmail("buyer.example.com"), false);
  });

  it("applies promo minimums and caps discounts", () => {
    const promo = findPromo("probyte10", 25000);
    assert.equal(promo?.code, "PROBYTE10");
    assert.equal(findPromo("probyte10", 10000), null);

    const capped: PromoCode = {
      code: "CAP",
      label: "Cap",
      type: "PERCENT",
      value: 50,
      minSubtotal: 0,
      maxDiscount: 10000,
      active: true
    };
    assert.equal(calculatePromoDiscount(capped, 100000), 10000);
  });

  it("calculates settled wallet balance only", () => {
    const ledger: WalletLedgerEntry[] = [
      wallet("TOPUP", 50000, "SETTLED"),
      wallet("PAYMENT", 17000, "SETTLED"),
      wallet("REFUND", 10000, "PENDING")
    ];

    assert.equal(calculateWalletBalance(ledger, "user_1"), 33000);
    assert.equal(paymentLabel("WALLET"), "Saldo Akun");
  });
});

function wallet(kind: WalletLedgerEntry["kind"], amount: number, status: WalletLedgerEntry["status"]): WalletLedgerEntry {
  return {
    id: `${kind}-${amount}`,
    userId: "user_1",
    kind,
    amount,
    status,
    invoiceNumber: null,
    paymentReference: null,
    note: "",
    createdAt: new Date(0).toISOString(),
    settledAt: status === "SETTLED" ? new Date(0).toISOString() : null
  };
}
