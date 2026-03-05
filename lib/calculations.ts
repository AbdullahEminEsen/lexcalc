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

  // ─── TAPU HARCI ───────────────────────────────────────────────
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

  // ─── DAMGA VERGİSİ ────────────────────────────────────────────
  } else if (type === 'damga') {
    const rate = overrides.rate ?? 9.48; // 2026: ‰9,48 (RG 33124, 01.01.2026)
    result = (n * rate) / 1000;
    breakdown = [
      { key: 'rate', label: 'Damga Vergisi (‰9,48)', val: result, rate, editable: true, unit: '‰' },
      { key: 'total', label: 'Ödenecek Damga Vergisi', val: result, bold: true },
    ];

  // ─── KDV %20 ─────────────────────────────────────────────────
  } else if (type === 'kdv') {
    const rate = overrides.rate ?? 20;
    result = (n * rate) / 100;
    breakdown = [
      { key: 'rate', label: `KDV (%${rate})`, val: result, rate, editable: true, unit: '%' },
      { key: 'total', label: 'KDV Dahil Toplam', val: n + result, bold: true },
    ];

  // ─── KDV %10 ─────────────────────────────────────────────────
  } else if (type === 'kdv10') {
    const rate = overrides.rate ?? 10;
    result = (n * rate) / 100;
    breakdown = [
      { key: 'rate', label: `KDV (%${rate})`, val: result, rate, editable: true, unit: '%' },
      { key: 'total', label: 'KDV Dahil Toplam', val: n + result, bold: true },
    ];

  // ─── KDV %1 ──────────────────────────────────────────────────
  } else if (type === 'kdv1') {
    const rate = overrides.rate ?? 1;
    result = (n * rate) / 100;
    breakdown = [
      { key: 'rate', label: `KDV (%${rate})`, val: result, rate, editable: true, unit: '%' },
      { key: 'total', label: 'KDV Dahil Toplam', val: n + result, bold: true },
    ];

  // ─── NOTER HARCI ─────────────────────────────────────────────
  } else if (type === 'noter') {
    const rate = overrides.rate ?? 2.69; // 2026: ‰2,69
    const minFee = overrides.minFee ?? 1790; // 2026 asgari noter harcı
    const calc = (n * rate) / 1000;
    const asgariUyguluyor = calc < minFee;
    result = Math.max(calc, minFee);
    breakdown = [
      { key: 'rate', label: `Nispi Harç (‰${rate})`, val: calc, rate, editable: true, unit: '‰' },
      { key: 'minFee', label: 'Asgari Harç' + (asgariUyguluyor ? ' ← uygulanıyor' : ''), val: minFee, rate: minFee, editable: true, unit: '₺', isFlat: true },
      { key: 'total', label: 'Uygulanacak Harç', val: result, bold: true },
    ];

  // ─── VERASEt VE İNTİKAL VERGİSİ ─────────────────────────────
  // 7338 sayılı Kanun — 2026 oranları
  } else if (type === 'veraset') {
    const ivazsiz = overrides.ivazsiz ?? 0; // 0=veraset, 1=ivazsız intikal
    let tax = 0;
    let dilimler: BreakdownRow[] = [];

    if (!ivazsiz) {
      // Veraset yoluyla intikal — 2026 dilimleri
      const brackets = [
        { limit: 1400000, rate: 1 },
        { limit: 3200000, rate: 3 },
        { limit: 7100000, rate: 5 },
        { limit: 14200000, rate: 7 },
        { limit: Infinity, rate: 10 },
      ];
      let remaining = n;
      let prev = 0;
      for (const b of brackets) {
        if (remaining <= 0) break;
        const dilimTutar = Math.min(remaining, b.limit - prev);
        const dilimVergi = (dilimTutar * b.rate) / 100;
        tax += dilimVergi;
        dilimler.push({
          key: `dilim_${b.rate}`,
          label: `%${b.rate} dilim (${formatTL(prev + 1)} - ${b.limit === Infinity ? '↑' : formatTL(b.limit)})`,
          val: dilimVergi,
        });
        remaining -= dilimTutar;
        prev = b.limit;
      }
    } else {
      // İvazsız intikal — 2026 dilimleri
      const brackets = [
        { limit: 700000, rate: 10 },
        { limit: 1600000, rate: 15 },
        { limit: 3500000, rate: 20 },
        { limit: 7100000, rate: 25 },
        { limit: Infinity, rate: 30 },
      ];
      let remaining = n;
      let prev = 0;
      for (const b of brackets) {
        if (remaining <= 0) break;
        const dilimTutar = Math.min(remaining, b.limit - prev);
        const dilimVergi = (dilimTutar * b.rate) / 100;
        tax += dilimVergi;
        dilimler.push({
          key: `dilim_${b.rate}`,
          label: `%${b.rate} dilim`,
          val: dilimVergi,
        });
        remaining -= dilimTutar;
        prev = b.limit;
      }
    }
    result = tax;
    breakdown = [
      ...dilimler,
      { key: 'total', label: 'Toplam Vergi', val: tax, bold: true },
    ];

  // ─── KİRA STOPAJ VERGİSİ ─────────────────────────────────────
  // GVK Md. 94/5 — kiradan stopaj %20
  } else if (type === 'kira_stopaj') {
    const rate = overrides.rate ?? 20;
    const stopaj = (n * rate) / 100;
    const net = n - stopaj;
    result = stopaj;
    breakdown = [
      { key: 'brut', label: 'Brüt Kira', val: n },
      { key: 'rate', label: `Stopaj Kesintisi (%${rate})`, val: stopaj, rate, editable: true, unit: '%' },
      { key: 'net', label: 'Net Ödenecek Kira', val: net },
      { key: 'total', label: 'Stopaj Tutarı', val: stopaj, bold: true },
    ];

  // ─── SERBEST MESLEK STOPAJI ───────────────────────────────────
  // GVK Md. 94/2 — %17 stopaj + KDV
  } else if (type === 'serbest_meslek') {
    const stopajRate = overrides.stopajRate ?? 17;
    const kdvRate = overrides.kdvRate ?? 20;
    const stopaj = (n * stopajRate) / 100;
    const kdv = (n * kdvRate) / 100;
    const tahsilEdilen = n + kdv - stopaj;
    result = stopaj;
    breakdown = [
      { key: 'brut', label: 'Hizmet Bedeli (Brüt)', val: n },
      { key: 'kdv', label: `KDV (%${kdvRate})`, val: kdv, rate: kdvRate, editable: true, unit: '%' },
      { key: 'stopaj', label: `Gelir Vergisi Stopajı (%${stopajRate})`, val: stopaj, rate: stopajRate, editable: true, unit: '%' },
      { key: 'tahsil', label: 'Tahsil Edilecek Net Tutar', val: tahsilEdilen },
      { key: 'total', label: 'Stopaj Tutarı (Vergi Dairesine)', val: stopaj, bold: true },
    ];

  // ─── MTV — MOTORLU TAŞITLAR VERGİSİ ─────────────────────────
  // 2026 MTV tarifesi (197 sayılı Kanun — 01.01.2026 güncel)
  // Motor hacmi bazlı, araç yaşına göre değişim
  } else if (type === 'mtv') {
    const cc = overrides.cc ?? 1600;       // motor hacmi (cc)
    const age = overrides.age ?? 3;         // araç yaşı (yıl)

    // 2026 MTV tablosu — otomobil, kaptıkaçtı, arazi taşıtları
    // Motor Hacmi → Yaş grubuna göre yıllık vergi (₺)
    type MTVRow = { maxCC: number; ages: number[] };
    const table: MTVRow[] = [
      { maxCC: 1300,  ages: [3681, 2270, 1450, 709, 354] },
      { maxCC: 1600,  ages: [6149, 3906, 2451, 1226, 613] },
      { maxCC: 1800,  ages: [10282, 6555, 4131, 2065, 1033] },
      { maxCC: 2000,  ages: [16262, 10282, 6555, 3278, 1638] },
      { maxCC: 2500,  ages: [24393, 16262, 10282, 5141, 2570] },
      { maxCC: 3000,  ages: [36590, 24393, 16262, 8130, 4066] },
      { maxCC: 3500,  ages: [52848, 36590, 24393, 12197, 6098] },
      { maxCC: Infinity, ages: [71110, 52848, 36590, 18295, 9148] },
    ];

    // Yaş grupları: 1-3 | 4-6 | 7-11 | 12-15 | 16+
    let ageIdx = 0;
    if (age <= 3) ageIdx = 0;
    else if (age <= 6) ageIdx = 1;
    else if (age <= 11) ageIdx = 2;
    else if (age <= 15) ageIdx = 3;
    else ageIdx = 4;

    const row = table.find(r => cc <= r.maxCC) || table[table.length - 1];
    const yillikMtv = row.ages[ageIdx];
    result = yillikMtv;

    const ageLabels = ['1-3 yaş', '4-6 yaş', '7-11 yaş', '12-15 yaş', '16+ yaş'];
    breakdown = [
      { key: 'cc', label: 'Motor Hacmi', val: cc, unit: 'cc', editable: true },
      { key: 'age', label: 'Araç Yaşı', val: age, unit: 'yıl', editable: true },
      { key: 'ageGroup', label: 'Yaş Grubu', val: 0, unit: ageLabels[ageIdx] },
      { key: 'total', label: '2026 Yıllık MTV', val: yillikMtv, bold: true },
      { key: 'taksit', label: '1. Taksit (Ocak)', val: yillikMtv / 2 },
      { key: 'taksit2', label: '2. Taksit (Temmuz)', val: yillikMtv / 2 },
    ];

  // ─── TRAFİK CEZASI ───────────────────────────────────────────
  // 2918 sayılı KTK — 2026 güncellenmiş ceza tutarları
  } else if (type === 'trafik_ceza') {
    // n = baz ceza tutarı (kullanıcı girer ya da seçer)
    const erkenOdemeRate = overrides.erkenOdemeRate ?? 25; // %25 indirim
    const erkenOdeme = n * (1 - erkenOdemeRate / 100);
    result = n;
    breakdown = [
      { key: 'ceza', label: 'Trafik Cezası', val: n },
      { key: 'erken', label: `Erken Ödeme (%${erkenOdemeRate} indirimli)`, val: erkenOdeme, rate: erkenOdemeRate, editable: true, unit: '%' },
      { key: 'total', label: 'Ödenecek Tutar', val: n, bold: true },
    ];

  // ─── ARAÇ MUAYENE HARCI ──────────────────────────────────────
  // 2026 muayene ücret tarifesi
  } else if (type === 'muayene') {
    // n = araç tipi kodu (kullanıcı seçer, biz sabit tutar hesaplarız)
    // 0=otomobil, 1=minibüs, 2=kamyonet, 3=motosiklet
    const aracTipi = Math.round(overrides.aracTipi ?? 0);
    const ucretler = [
      { label: 'Otomobil', ilk: 1450, periyodik: 1085 },
      { label: 'Minibüs / Kamyonet', ilk: 1740, periyodik: 1305 },
      { label: 'Kamyon / Otobüs', ilk: 2320, periyodik: 1740 },
      { label: 'Motosiklet', ilk: 870, periyodik: 653 },
    ];
    const secilen = ucretler[aracTipi] || ucretler[0];
    result = secilen.periyodik;
    breakdown = [
      { key: 'aracTipi', label: 'Araç Tipi', val: aracTipi, editable: true, unit: secilen.label },
      { key: 'ilk', label: 'İlk Muayene Ücreti', val: secilen.ilk },
      { key: 'periyodik', label: 'Periyodik Muayene Ücreti', val: secilen.periyodik, bold: true },
    ];

  // ─── PASAPORT / KİMLİK HARCI ─────────────────────────────────
  // 492 sayılı Harçlar Kanunu — 2026 Tarifesi
  } else if (type === 'pasaport') {
    // Pasaport türüne göre sabit harçlar (2026)
    const tur = Math.round(overrides.tur ?? 0);
    const pasaportlar = [
      { label: 'Bordo Pasaport (10 yıl)', ucret: 3920 },
      { label: 'Bordo Pasaport (5 yıl)', ucret: 2547 },
      { label: 'Gri Pasaport (Hizmet)', ucret: 0 },
      { label: 'Nüfus Cüzdanı', ucret: 270 },
      { label: 'Ehliyet (Yeni/Yenileme)', ucret: 1085 },
    ];
    const secilen = pasaportlar[tur] || pasaportlar[0];
    result = secilen.ucret;
    breakdown = [
      { key: 'tur', label: 'Belge Türü', val: tur, editable: true, unit: secilen.label },
      { key: 'harç', label: 'Harç Tutarı', val: secilen.ucret },
      { key: 'total', label: 'Ödenecek Tutar', val: secilen.ucret, bold: true },
    ];
  }

  // ─── EK KALEMLER ─────────────────────────────────────────────
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
