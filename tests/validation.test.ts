import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTracking, verifyS10, verifyUps, verifyGs1, validateTracking, extractFromUrl, parseTrackingInput,
} from '../lib/utils/validation.ts';
import { carrierTrackingUrl } from '../lib/tracking/carriers.ts';

test('normalize strips spaces, dashes and invisibles and uppercases', () => {
  assert.equal(normalizeTracking(' rr-123 456​785.es '), 'RR123456785ES');
});

test('UPU S10 check digit', () => {
  assert.ok(verifyS10('RR123456785ES'));
  assert.ok(verifyS10('LX348295109CN'));
  assert.ok(!verifyS10('RR123456784ES'));
});

test('UPS 1Z check digit', () => {
  assert.ok(verifyUps('1Z999AA10123456784'));
  assert.ok(!verifyUps('1Z999AA10123456785'));
});

test('GS1 mod-10 (GS1 reference GTIN 629104150021-3)', () => {
  assert.ok(verifyGs1('6291041500213'));
  assert.ok(!verifyGs1('6291041500214'));
});

test('S10 numbers name the postal operator from the country suffix', () => {
  const r = validateTracking('RR123456785ES');
  assert.equal(r.confidence, 'verified');
  assert.equal(r.carrier, 'Correos');
  assert.equal(validateTracking('LX348295109CN').carrier, 'China Post');
});

test('a mistyped S10 number is flagged but can be forced', () => {
  const r = validateTracking('RR123456784ES');
  assert.equal(r.valid, false);
  assert.equal(r.confidence, 'invalid');
  assert.equal(r.canForce, true);
});

test('UPS numbers are verified, a typo is caught', () => {
  assert.equal(validateTracking('1Z 999 AA1 01 2345 6784').confidence, 'verified');
  assert.equal(validateTracking('1Z999AA10123456785').confidence, 'invalid');
});

test('digit-only numbers are only a guess, never a hard UPS/FedEx clash', () => {
  const twelve = validateTracking('774899256420');
  assert.equal(twelve.valid, true);
  assert.equal(twelve.confidence, 'likely');
  assert.equal(twelve.carrier, 'FedEx');
  assert.equal(validateTracking('1234567890').carrier, 'DHL Express');
  assert.equal(validateTracking('12345678901').carrier, 'GLS');
});

test('known prefixed formats', () => {
  assert.equal(validateTracking('TBA123456789012').carrier, 'Amazon Logistics');
  assert.equal(validateTracking('LP00123456789012').carrier, 'Cainiao');
  assert.equal(validateTracking('YT1234567890123456').carrier, 'YunExpress');
});

test('USPS 420+ZIP routing prefix is stripped', () => {
  // Build a USPS number with a correct GS1 check digit
  const body = '940011189922319742849';
  let sum = 0;
  for (let i = 0; i < body.length; i++) sum += Number(body[i]) * ((body.length - 1 - i) % 2 === 0 ? 3 : 1);
  const usps = body + ((10 - (sum % 10)) % 10);
  assert.equal(validateTracking(usps).confidence, 'verified');
  const r = validateTracking('420' + '28001' + usps); // 420 + 5-digit ZIP
  assert.equal(r.normalized, usps);
  assert.equal(r.carrier, 'USPS');
  assert.equal(r.confidence, 'verified');
});

test('unknown formats are allowed with a warning', () => {
  const r = validateTracking('ABCD1234XYZ');
  assert.equal(r.valid, true);
  assert.equal(r.confidence, 'unknown');
  assert.ok(r.warning);
});

test('empty and too-short input', () => {
  assert.equal(validateTracking('   ').canForce, false);
  assert.equal(validateTracking('AB12').valid, false);
});

test('tracking numbers are pulled out of carrier links', () => {
  assert.equal(extractFromUrl('https://www.ups.com/track?tracknum=1Z999AA10123456784')?.trackingNumber, '1Z999AA10123456784');
  assert.equal(extractFromUrl('https://t.17track.net/en#nums=RR123456785ES')?.trackingNumber, 'RR123456785ES');
  assert.equal(extractFromUrl('https://www.correos.es/es/es/herramientas/localizador/envios/detalle?tracking-number=RR123456785ES')?.trackingNumber, 'RR123456785ES');
  assert.equal(extractFromUrl('https://example.com/track/RR123456785ES')?.trackingNumber, 'RR123456785ES');
  assert.equal(extractFromUrl('not a url'), null);
});

test('the best number is picked out of a pasted shipping email', () => {
  assert.equal(parseTrackingInput('Your order #4411 has shipped! Track it: RR123456785ES. Thanks'), 'RR123456785ES');
  assert.equal(parseTrackingInput('Your order has shipped! Track: 774899256420'), '774899256420');
  assert.equal(parseTrackingInput('rr 123 456 785 es'), 'RR123456785ES');
});

test('carrier links', () => {
  assert.match(carrierTrackingUrl('Correos', 'RR123456785ES'), /correos\.es/);
  assert.match(carrierTrackingUrl('UPS', '1Z999AA10123456784'), /ups\.com/);
  assert.match(carrierTrackingUrl('Correos Express', 'X'), /17track/);
  assert.match(carrierTrackingUrl('Groups Inc', 'X'), /17track/);   // "ups" inside a word is not UPS
  assert.match(carrierTrackingUrl('Unknown', 'X'), /17track/);
});
