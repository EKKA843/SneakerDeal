// Computes the net (post-discount) price for one size entry using each
// platform's discount rule. Right now every platform uses a flat
// percentage-off code applied to every size the same way; platform-specific
// rules (tiered coupons, free shipping thresholds, etc.) should branch on
// offer.type here later.
function computeNetPrice(price, discount) {
  return Math.round(price * (1 - (discount || 0)));
}

module.exports = { computeNetPrice };
