const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isPromotion, normalize } = require('../extension/rules.js');

for (const text of [
  '3 people viewed your profile. See the full list with Premium. Premium benefit',
  '3 people viewed your profile. See the full list with Premium.',
  'Try LinkedIn Premium for free', 'Unlock your full potential with Premium',
  'Get Premium', 'Start your Premium free trial', 'Save 50% on Premium',
  'PREMIUM BENEFIT', 'See who viewed your profile with LinkedIn Premium'
]) test(`blocks sales copy: ${text}`, () => assert.equal(isPromotion({ text }), true));
for (const text of [
  'Alex sent you a message', 'Your job alert has 12 new jobs',
  'Three people viewed your profile', 'Sarah is a Premium member',
  'Alex commented on your post about premium coffee',
  'Your connection shared a post', 'Premium Support Engineer at Acme',
  'Premium members attended your event'
]) test(`preserves normal copy: ${text}`, () => assert.equal(isPromotion({ text }), false));
test('normalizes whitespace and zero-width characters', () => {
  assert.equal(normalize(' Premium\u200b\n benefit '), 'Premium benefit');
  assert.equal(isPromotion({ labels: 'Premium benefit' }), true);
});
test('requires CTA copy with a LinkedIn sales destination', () => {
  assert.equal(isPromotion({ text: 'Upgrade today', links: ['/premium/products/'] }), true);
  assert.equal(isPromotion({ text: 'Sarah is a Premium member', links: ['/premium/'] }), false);
  assert.equal(isPromotion({ text: 'Upgrade today', links: ['https://linkedin.com.evil.test/premium/'] }), false);
});
