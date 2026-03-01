export interface Extra {
  id: string;
  label: string;
  rate: string;
  isFlat: boolean;
}

export interface BreakdownRow {
  key: string;
  label: string;
  val: number;
  rate?: number;
  editable?: boolean;
  unit?: string;
  bold?: boolean;
  isFlat?: boolean;
}

export function computeBreakdown(
  type: string,
  amount: string,
  overrides: Record<string, number> = {},
  extras: Extra[] = []
): { breakdown: BreakdownRow[]; result: number } {
  const n = parseFloat(amount) || 0;
  let breakdown: BreakdownRow[] = [];
  let result = 0;

  if (type === 'tapu') {
    const buyerRate = overrides.buyerRate ?? 2;
    const sellerRate = overrides.sellerRate ?? 2;
    const buyer = (n * buyerRate) / 100;
    const seller = (n * sellerRate) / 100;
    result = buyer + seller;
    breakdown = [
      { key: 'buyerRate', label: 'Alıcı Tapu Harcı', val: buyer, rate: buyerRate, editable: true, unit: '%' },
      { key: 'sellerRate', label: 'Satıcı Tapu Harcı', val: seller, rate: sellerRate, editable: true, unit: '%' },
      { key: 'total', label: 'Toplam Tapu Harcı', val: result, bold: true },
    ];
  } else if (type === 'damga') {
    const rate = overrides.rate ?? 9.48; // 2026: ‰9,48 (RG 33124, 01.01.2026)
    result = (n * rate) / 1000;
    breakdown = [
      { key: 'rate', label: 'Damga Vergisi', val: result, rate, editable: true, unit: '‰' },
    ];
  } else if (type === 'kdv') {
    const rate = overrides.rate ?? 20;
    result = (n * rate) / 100;
    breakdown = [
      { key: 'rate', label: `KDV (%${rate})`, val: result, rate, editable: true, unit: '%' },
      { key: 'total', label: 'KDV Dahil Toplam', val: n + result, bold: true },
    ];
  } else if (type === 'kdv10') {
    const rate = overrides.rate ?? 10;
    result = (n * rate) / 100;
    breakdown = [
      { key: 'rate', label: `KDV (%${rate})`, val: result, rate, editable: true, unit: '%' },
      { key: 'total', label: 'KDV Dahil Toplam', val: n + result, bold: true },
    ];
  } else if (type === 'noter') {
    const rate = overrides.rate ?? 2.69; // 2026: ‰2,69
    const minFee = overrides.minFee ?? 1790; // 2026 asgari noter harcı
    const calc = (n * rate) / 1000;
    const asgariUyguluyor = calc < minFee;
    result = Math.max(calc, minFee);
    breakdown = [
      { key: 'rate', label: 'Nispi Harç (‰' + rate + ')', val: calc, rate, editable: true, unit: '‰' },
      { key: 'minFee', label: 'Asgari Harç (2026)' + (asgariUyguluyor ? ' ← uygulanıyor' : ''), val: minFee, rate: minFee, editable: true, unit: '₺', isFlat: true },
      { key: 'total', label: 'Uygulanacak Harç', val: result, bold: true },
    ];
  } else if (type === 'avukatlik') {
    // AAÜT 2025-2026 — Resmi Gazete 33067, 4 Kasım 2025 — Üçüncü Kısım (Nispi)
    let fee = 0;
    if (overrides.base !== undefined) {
      fee = overrides.base;
    } else if (n <= 150000) {
      fee = Math.max(n * 0.15, 9000); // min 9.000 TL (icra), asliye için min 45.000 TL
    } else if (n <= 300000) {
      fee = 22500 + (n - 150000) * 0.12;
    } else if (n <= 500000) {
      fee = 40500 + (n - 300000) * 0.08;
    } else if (n <= 1000000) {
      fee = 56500 + (n - 500000) * 0.05;
    } else if (n <= 3000000) {
      fee = 81500 + (n - 1000000) * 0.03;
    } else if (n <= 5000000) {
      fee = 141500 + (n - 3000000) * 0.02;
    } else {
      fee = 181500 + (n - 5000000) * 0.01;
    }
    const kdv = fee * 0.2;
    result = fee;
    breakdown = [
      { key: 'base', label: 'AAÜT Ücreti (2025-2026)', val: fee, editable: false },
      { key: 'kdvFee', label: 'KDV (%20)', val: kdv },
      { key: 'total', label: 'KDV Dahil Toplam', val: fee + kdv, bold: true },
    ];
  }

  extras.forEach((ex) => {
    const v = parseFloat(ex.rate) || 0;
    const val = ex.isFlat ? v : (n * v) / 100;
    breakdown.push({
      key: `ex_${ex.id}`,
      label: ex.label,
      val,
      rate: v,
      editable: true,
      unit: ex.isFlat ? '₺' : '%',
    });
    result += val;
  });

  return { breakdown, result };
}

export function formatTL(n: number): string {
  return '₺' + Number(n || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function shortTL(n: number): string {
  if (n >= 1_000_000) return '₺' + (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return '₺' + (n / 1_000).toFixed(0) + 'K';
  return '₺' + n;
}
