import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface PDFData {
  title: string;
  type: string;
  amount: number;
  result: number;
  breakdown: { label: string; val: number; bold?: boolean }[];
  clientName: string;
  notes: string;
  lawyerName: string;
  firmName: string;
  referenceNo: string;
  date: string;
}

const TYPE_LABELS: Record<string, string> = {
  tapu: 'Tapu Harcı Hesaplama Raporu',
  damga: 'Damga Vergisi Hesaplama Raporu',
  kdv: 'KDV Hesaplama Raporu',
  kdv10: 'KDV (%10) Hesaplama Raporu',
  noter: 'Noter Harcı Hesaplama Raporu',
  avukatlik: 'Avukatlık Ücreti Hesaplama Raporu',
  custom: 'Özel Formül Hesaplama Raporu',
};

function formatTL(n: number): string {
  return '₺' + Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function generateHTML(data: PDFData): string {
  const typeLabel = TYPE_LABELS[data.type] || 'Hukuki Hesaplama Raporu';

  const breakdownRows = data.breakdown.map(row => `
    <tr class="${row.bold ? 'total-row' : ''}">
      <td>${row.label}</td>
      <td class="amount-cell">${formatTL(row.val)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Georgia', serif;
      color: #1a1a2e;
      background: #ffffff;
      font-size: 13px;
      line-height: 1.6;
    }

    /* ── HEADER ── */
    .header {
      background: #1a1a2e;
      color: white;
      padding: 32px 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo-icon {
      width: 48px;
      height: 48px;
      background: #C9A96E;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }

    .logo-text h1 {
      font-size: 22px;
      font-weight: 700;
      color: #C9A96E;
      letter-spacing: 1px;
    }

    .logo-text p {
      font-size: 11px;
      color: #8892a4;
      margin-top: 2px;
    }

    .ref-area {
      text-align: right;
    }

    .ref-area .ref-label {
      font-size: 10px;
      color: #8892a4;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .ref-area .ref-no {
      font-size: 14px;
      color: #C9A96E;
      font-weight: 600;
      margin-top: 4px;
    }

    .ref-area .ref-date {
      font-size: 11px;
      color: #8892a4;
      margin-top: 4px;
    }

    /* ── GOLD DIVIDER ── */
    .gold-bar {
      height: 4px;
      background: linear-gradient(90deg, #C9A96E, #e8c882, #C9A96E);
    }

    /* ── DOCUMENT TITLE ── */
    .doc-title {
      background: #f8f9fb;
      padding: 20px 40px;
      border-bottom: 1px solid #e8eaf0;
    }

    .doc-title h2 {
      font-size: 17px;
      font-weight: 700;
      color: #1a1a2e;
    }

    .doc-title .subtitle {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* ── CONTENT ── */
    .content {
      padding: 32px 40px;
    }

    /* ── PARTIES ── */
    .parties {
      display: flex;
      gap: 20px;
      margin-bottom: 28px;
    }

    .party-box {
      flex: 1;
      border: 1px solid #e8eaf0;
      border-radius: 10px;
      padding: 16px;
    }

    .party-box .party-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #9ca3af;
      margin-bottom: 8px;
      font-family: 'Arial', sans-serif;
    }

    .party-box .party-name {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a2e;
    }

    .party-box .party-detail {
      font-size: 11px;
      color: #6b7280;
      margin-top: 4px;
    }

    /* ── SECTION HEADER ── */
    .section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
      margin-top: 24px;
    }

    .section-header .section-line {
      flex: 1;
      height: 1px;
      background: #e8eaf0;
    }

    .section-header .section-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #9ca3af;
      font-family: 'Arial', sans-serif;
      white-space: nowrap;
    }

    /* ── TABLE ── */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    thead tr {
      background: #1a1a2e;
      color: white;
    }

    thead th {
      padding: 10px 16px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.5px;
      font-family: 'Arial', sans-serif;
    }

    thead th.amount-cell {
      text-align: right;
    }

    tbody tr {
      border-bottom: 1px solid #f3f4f6;
    }

    tbody tr:nth-child(even) {
      background: #f9fafb;
    }

    tbody td {
      padding: 10px 16px;
      font-size: 13px;
      color: #374151;
    }

    .amount-cell {
      text-align: right;
      font-family: 'Courier New', monospace;
    }

    /* ── TOTAL ROW ── */
    .total-row {
      background: #1a1a2e !important;
    }

    .total-row td {
      color: white !important;
      font-weight: 700;
      font-size: 14px;
      padding: 14px 16px;
    }

    .total-row .amount-cell {
      color: #C9A96E !important;
      font-size: 16px;
    }

    /* ── SUMMARY BOX ── */
    .summary-box {
      background: #f8f9fb;
      border: 1px solid #e8eaf0;
      border-left: 4px solid #C9A96E;
      border-radius: 8px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
    }

    .summary-label {
      font-size: 12px;
      color: #6b7280;
    }

    .summary-value {
      font-size: 13px;
      font-weight: 600;
      color: #1a1a2e;
      font-family: 'Courier New', monospace;
    }

    .summary-divider {
      height: 1px;
      background: #e8eaf0;
      margin: 8px 0;
    }

    .summary-total-label {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a2e;
    }

    .summary-total-value {
      font-size: 18px;
      font-weight: 700;
      color: #C9A96E;
      font-family: 'Courier New', monospace;
    }

    /* ── NOTES ── */
    .notes-box {
      background: #fffbf0;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }

    .notes-box .notes-label {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #92400e;
      margin-bottom: 6px;
      font-family: 'Arial', sans-serif;
    }

    .notes-box .notes-text {
      font-size: 12px;
      color: #78350f;
      line-height: 1.6;
    }

    /* ── FOOTER ── */
    .footer {
      margin-top: 40px;
      padding: 24px 40px;
      border-top: 1px solid #e8eaf0;
      background: #f8f9fb;
    }

    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .footer-left .disclaimer {
      font-size: 10px;
      color: #9ca3af;
      line-height: 1.5;
      max-width: 400px;
    }

    .footer-right {
      text-align: right;
    }

    .footer-right .powered-by {
      font-size: 10px;
      color: #9ca3af;
      margin-bottom: 4px;
    }

    .footer-right .lexcalc-brand {
      font-size: 13px;
      font-weight: 700;
      color: #C9A96E;
      letter-spacing: 1px;
    }

    .footer-right .lexcalc-url {
      font-size: 10px;
      color: #9ca3af;
      margin-top: 2px;
    }

    .signature-area {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #1a1a2e;
      display: inline-block;
      min-width: 220px;
    }

    .signature-name {
      font-size: 13px;
      font-weight: 700;
      color: #1a1a2e;
    }

    .signature-title {
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">⚖</div>
      <div class="logo-text">
        <h1>LexCalc</h1>
        <p>Hukuki Hesaplama Platformu</p>
      </div>
    </div>
    <div class="ref-area">
      <div class="ref-label">Referans No</div>
      <div class="ref-no">${data.referenceNo}</div>
      <div class="ref-date">${data.date}</div>
    </div>
  </div>

  <div class="gold-bar"></div>

  <!-- DOCUMENT TITLE -->
  <div class="doc-title">
    <h2>${typeLabel}</h2>
    <div class="subtitle">${data.title}</div>
  </div>

  <!-- CONTENT -->
  <div class="content">

    <!-- PARTIES -->
    <div class="parties">
      <div class="party-box">
        <div class="party-label">Hesaplamayı Yapan</div>
        <div class="party-name">${data.lawyerName}</div>
        ${data.firmName ? `<div class="party-detail">${data.firmName}</div>` : ''}
      </div>
      ${data.clientName ? `
      <div class="party-box">
        <div class="party-label">Müvekkil</div>
        <div class="party-name">${data.clientName}</div>
      </div>
      ` : ''}
    </div>

    <!-- BREAKDOWN TABLE -->
    <div class="section-header">
      <div class="section-title">Hesaplama Detayı</div>
      <div class="section-line"></div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Kalem</th>
          <th class="amount-cell">Tutar</th>
        </tr>
      </thead>
      <tbody>
        ${breakdownRows}
      </tbody>
    </table>

    <!-- SUMMARY -->
    <div class="section-header">
      <div class="section-title">Özet</div>
      <div class="section-line"></div>
    </div>

    <div class="summary-box">
      <div class="summary-row">
        <span class="summary-label">İşlem Bedeli</span>
        <span class="summary-value">${formatTL(data.amount)}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row">
        <span class="summary-total-label">Toplam Vergi / Harç</span>
        <span class="summary-total-value">${formatTL(data.result)}</span>
      </div>
    </div>

    ${data.notes ? `
    <!-- NOTES -->
    <div class="notes-box">
      <div class="notes-label">Notlar</div>
      <div class="notes-text">${data.notes}</div>
    </div>
    ` : ''}

    <!-- SIGNATURE -->
    <div class="signature-area">
      <div class="signature-name">${data.lawyerName}</div>
      <div class="signature-title">${data.firmName || 'Avukat'}</div>
    </div>

  </div>

  <!-- FOOTER -->
  <div class="footer">
    <div class="footer-content">
      <div class="footer-left">
        <div class="disclaimer">
          Bu rapor bilgilendirme amaçlı hazırlanmıştır. Hesaplamalar, belirtilen tarihteki
          yürürlükteki mevzuata göre yapılmıştır. Kesin harç ve vergi tutarları için ilgili
          kurum ve kuruluşlara başvurunuz.
        </div>
      </div>
      <div class="footer-right">
        <div class="powered-by">Hazırlanma aracı</div>
        <div class="lexcalc-brand">LexCalc</div>
        <div class="lexcalc-url">lexcalc.net</div>
      </div>
    </div>
  </div>

</body>
</html>
  `;
}

export async function generateAndSharePDF(data: PDFData): Promise<void> {
  const html = generateHTML(data);

  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${data.title} - PDF Rapor`,
      UTI: 'com.adobe.pdf',
    });
  }
}

export type { PDFData };
