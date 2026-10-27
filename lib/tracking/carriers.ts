/** Public tracking page for a carrier, falling back to 17TRACK (covers 2,000+ carriers). */
export function carrierTrackingUrl(carrier: string, trackingNumber: string): string {
  const n = encodeURIComponent(trackingNumber);
  const c = carrier.toLowerCase();

  if (c.includes('correos express')) return `https://t.17track.net/en#nums=${n}`;
  if (c.includes('correos')) return `https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=${n}`;
  if (/\bups\b/.test(c)) return `https://www.ups.com/track?tracknum=${n}`;
  if (c.includes('fedex')) return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
  if (c.includes('usps')) return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
  if (c.includes('dhl express') || c === 'dhl') return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${n}`;
  if (c.includes('gls')) return `https://gls-group.com/ES/es/seguimiento-envio/?match=${n}`;
  return `https://t.17track.net/en#nums=${n}`;
}

/** Carriers offered as quick picks when the number alone can't tell. */
export const COMMON_CARRIERS = [
  'Correos', 'SEUR', 'MRW', 'GLS', 'DHL Express', 'UPS', 'FedEx',
  'Amazon Logistics', 'Correos Express', 'CTT Express', 'InPost', 'Cainiao',
];
