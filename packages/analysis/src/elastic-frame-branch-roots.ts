// A finite binary64 is an exact integer times a power of 2. Because the
// supported degree is at most 3, exact Sturm signs have small bounded work
// even for cancellation and subnormals, unlike tolerance-based root tests.
type Polynomial = bigint[];
type Dyadic = { numerator: bigint; exponent: number };
const mantissaMask = (1n << 52n) - 1n;
const oneBits = 0x3ff0000000000000n;
const abs = (n: bigint) => n < 0n ? -n : n;
const sign = (n: bigint) => n < 0n ? -1 : n === 0n ? 0 : 1;

const view = new DataView(new ArrayBuffer(8));
function numberBits(value: number) {
  view.setFloat64(0, value);
  return view.getBigUint64(0);
}
function fromBits(bits: bigint) {
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}
function dyadic(bits: bigint): Dyadic {
  const expBits = Number((bits >> 52n) & 0x7ffn);
  const fraction = bits & mantissaMask;
  const magnitude = expBits === 0 ? fraction : (1n << 52n) + fraction;
  return { numerator: (bits >> 63n) !== 0n ? -magnitude : magnitude,
    exponent: expBits === 0 ? -1074 : expBits - 1075 };
}
const lead = (p: Polynomial) => p.at(-1)!;
function trim(p: Polynomial): Polynomial {
  while (p.length && lead(p) === 0n) p.pop();
  return p;
}
function gcd(a: bigint, b: bigint): bigint {
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}
function primitive(p: Polynomial): Polynomial {
  const d = p.reduce((divisor, x) => gcd(divisor, abs(x)), 0n);
  return d > 1n ? p.map(x => x / d) : p;
}
function derivative(p: Polynomial): Polynomial {
  return p.slice(1).map((coefficient, i) => coefficient * BigInt(i + 1));
}
function remainder(a: Polynomial, b: Polynomial): Polynomial {
  // Positive pseudo-division factors preserve signs of the rational remainder.
  let r = a.slice();
  const scale = abs(lead(b)), direction = BigInt(sign(lead(b)));
  while (r.length >= b.length) {
    const shift = r.length - b.length, factor = lead(r) * direction;
    r = primitive(trim(r.map((coefficient, i) => coefficient * scale -
      (i >= shift ? b[i - shift] * factor : 0n))));
  }
  return r;
}
function sturmChain(polynomial: Polynomial) {
  const chain = [polynomial, primitive(derivative(polynomial))];
  while (chain.at(-1)!.length > 1) {
    const next = remainder(chain.at(-2)!, chain.at(-1)!).map(x => -x);
    if (next.length === 0) break;
    chain.push(next);
  }
  return chain;
}
function at(p: Polynomial, x: Dyadic): bigint {
  const { numerator, exponent } = x;
  if (numerator === 0n) return p[0] ?? 0n;
  if (exponent >= 0) {
    const integral = numerator << BigInt(exponent);
    return p.reduceRight((value, coefficient) => value * integral + coefficient, 0n);
  }
  let current = lead(p);
  const shift = BigInt(-exponent);
  let offset = shift;
  for (let i = p.length - 2; i >= 0; i--) {
    current = current * numerator + (p[i] << offset);
    offset += shift;
  }
  return current;
}
function limitSign(p: Polynomial, x: Dyadic, direction: -1 | 1) {
  let order = 0;
  for (let q = p; q.length; q = derivative(q), order++) {
    const s = sign(at(q, x));
    if (s) return order % 2 ? s * direction : s;
  }
  return 0;
}
function variations(chain: Polynomial[], x: Dyadic, direction: -1 | 1) {
  let previous = 0, count = 0;
  for (const p of chain) {
    const s = limitSign(p, x, direction);
    if (!s) continue;
    if (previous && previous !== s) count++;
    previous = s;
  }
  return count;
}
function dyadicMidpoint(a: Dyadic, b: Dyadic): Dyadic {
  const exp = Math.min(a.exponent, b.exponent);
  return { numerator: (a.numerator << BigInt(a.exponent - exp)) +
    (b.numerator << BigInt(b.exponent - exp)), exponent: exp - 1 };
}

const ambiguous = () => new Error("Distinct interior branch roots cannot be represented reliably in binary64");
export type ElasticFrameBranchRoots = { roots: readonly number[]; flat: boolean };

/** Isolate all distinct roots of the supplied normalized-branch derivative,
 * including sign changes and stationary touches. Coefficients are ascending in
 * powers of t and are interpreted exactly as supplied binary64 values. Endpoints
 * t=0 and t=1 are not included. Nonrepresentable interior roots are rounded to
 * the nearer binary64 value; if that hides a distinction or reaches an endpoint,
 * throw rather than claiming a complete list. A zero polynomial is explicitly flat. */
export function isolateElasticFrameBranchRoots(coefficients: readonly number[]): ElasticFrameBranchRoots {
  if (!Array.isArray(coefficients) || coefficients.length < 1 || coefficients.length > 4 ||
      Reflect.ownKeys(coefficients).length !== coefficients.length + 1 ||
      Array.from(coefficients).some((v, i) => !Object.hasOwn(coefficients, i) || !Number.isFinite(v))) {
    throw new Error("One to four finite dense branch polynomial coefficients are required");
  }
  const values = Array.from(coefficients, coefficient => dyadic(numberBits(coefficient)));
  const exponent = Math.min(...values.map(v => v.exponent));
  const p = primitive(trim(values.map(({ numerator, exponent: e }) => numerator << BigInt(e - exponent))));
  if (p.length < 2) return { roots: [], flat: p.length === 0 };

  const chain = sturmChain(p);
  const roots: number[] = [];
  function emit(bits: bigint) {
    if (bits === 0n || bits === oneBits) throw ambiguous();
    const root = fromBits(bits);
    if (roots.length && root <= roots.at(-1)!) throw ambiguous();
    roots.push(root);
  }
  function bisect(lo: bigint, hi: bigint, loFromRight: number, hiFromLeft: number) {
    const count = loFromRight - hiFromLeft;
    if (!count) return;
    if (count < 0 || count > 3) throw ambiguous();
    if (hi - lo === 1n) {
      if (count !== 1) throw ambiguous();
      const midpoint = dyadicMidpoint(dyadic(lo), dyadic(hi));
      if (at(p, midpoint) === 0n) {
        // Round nearest, ties to even, matching binary64 conversion.
        emit((lo & 1n) === 0n ? lo : hi);
      } else {
        emit(loFromRight > variations(chain, midpoint, -1) ? lo : hi);
      }
      return;
    }
    // Binary64 bit rank is monotonic on [0,1]; this also bounds the depth
    // for very small roots without thousands of arithmetic half steps.
    const mid = (lo + hi) >> 1n;
    const x = dyadic(mid);
    bisect(lo, mid, loFromRight, variations(chain, x, -1));
    if (at(p, x) === 0n) emit(mid);
    bisect(mid, hi, variations(chain, x, 1), hiFromLeft);
  }
  bisect(0n, oneBits, variations(chain, dyadic(0n), 1), variations(chain, dyadic(oneBits), -1));
  return { roots, flat: false };
}
