// Workers provides crypto.subtle.timingSafeEqual. Bun 1.4 does not, so tests
// install the same fixed-width compare before any request runs.
const subtle = crypto.subtle as SubtleCrypto & {
  timingSafeEqual?: (left: ArrayBuffer, right: ArrayBuffer) => boolean;
};

if (typeof subtle.timingSafeEqual !== "function") {
  subtle.timingSafeEqual = (left: ArrayBuffer, right: ArrayBuffer) => {
    const a = new Uint8Array(left);
    const b = new Uint8Array(right);
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let index = 0; index < a.length; index += 1) diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
    return diff === 0;
  };
}
