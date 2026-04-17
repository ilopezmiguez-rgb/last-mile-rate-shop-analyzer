const pctFmt = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const pctWholeFmt = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const moneyFmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moneyCompactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const countFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export const formatPct = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : pctFmt.format(n);
export const formatPctWhole = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : pctWholeFmt.format(n);
export const formatMoney = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : moneyFmt.format(n);
export const formatMoneyCompact = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : `$${moneyCompactFmt.format(n)}`;
export const formatCount = (n: number | null | undefined) =>
  n == null || !Number.isFinite(n) ? "—" : countFmt.format(n);

export const formatWeight = (n: number) =>
  n < 1 ? `${n.toFixed(4).replace(/\.?0+$/, "")} lb` : `${n.toFixed(0)} lb`;

export const formatSigned = (n: number) =>
  `${n >= 0 ? "+" : ""}${moneyFmt.format(n)}`;
