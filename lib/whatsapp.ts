import { Linking, Alert } from 'react-native';

interface ShareData {
  title: string;
  type: string;
  amount: number;
  result: number;
  breakdown: { label: string; val: number; bold?: boolean }[];
  clientName?: string;
  lawyerName?: string;
  firmName?: string;
  date?: string;
}

const TYPE_LABELS: Record<string, string> = {
  tapu: 'Tapu Harcı Hesaplama',
  damga: 'Damga Vergisi Hesaplama',
  kdv: 'KDV Hesaplama (%20)',
  kdv10: 'KDV Hesaplama (%10)',
  noter: 'Noter Harcı Hesaplama',
  avukatlik: 'Avukatlık Ücreti Hesaplama',
  custom: 'Özel Formül Hesaplama',
};

function formatTL(n: number): string {
  return '₺' + Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildWhatsAppMessage(data: ShareData): string {
  const typeLabel = TYPE_LABELS[data.type] || 'Hukuki Hesaplama';
  const date = data.date || new Date().toLocaleDateString('tr-TR');

  // Breakdown satırları — sadece bold olmayanlar (ara toplamlar), son bold satır ayrı gösterilecek
  const detailLines = data.breakdown
    .filter(r => !r.bold)
    .map(r => `  • ${r.label}: *${formatTL(r.val)}*`)
    .join('\n');

  const lines = [
    `⚖️ *LexCalc Hesaplama Raporu*`,
    ``,
    `📋 *${typeLabel}*`,
    data.clientName ? `👤 Müvekkil: ${data.clientName}` : null,
    data.lawyerName ? `🏛 Hazırlayan: ${data.lawyerName}${data.firmName ? ` — ${data.firmName}` : ''}` : null,
    `📅 Tarih: ${date}`,
    ``,
    `💰 *İşlem Bedeli:* ${formatTL(data.amount)}`,
    ``,
    detailLines ? `📊 *Detay:*\n${detailLines}` : null,
    ``,
    `✅ *Toplam Vergi / Harç: ${formatTL(data.result)}*`,
    ``,
    `_LexCalc ile hesaplandı • lexcalc.net_`,
  ].filter(l => l !== null).join('\n');

  return lines;
}

export async function shareViaWhatsApp(data: ShareData): Promise<void> {
  const message = buildWhatsAppMessage(data);
  const encoded = encodeURIComponent(message);
  const url = `whatsapp://send?text=${encoded}`;

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    // WhatsApp yüklü değilse web versiyonunu dene
    const webUrl = `https://wa.me/?text=${encoded}`;
    await Linking.openURL(webUrl);
    return;
  }

  await Linking.openURL(url);
}
