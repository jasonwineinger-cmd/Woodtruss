export interface AxialSecantReading {
  readingId: string;
  specimenId: string;
  datumId: string;
  forceLb: number;
  lengthChangeIn: number;
}

export interface RepeatedAxialSecantInput {
  specimenId: string;
  datumId: string;
  fromForceLb: number;
  toForceLb: number;
  /** Supplied displacement range threshold; not a measurement accuracy claim. */
  minimumAbsoluteTravelIn: number;
  trials: readonly { trialId: string; from: AxialSecantReading; to: AxialSecantReading }[];
}

const identity = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;

/** Descriptive measured force/displacement secants, not intrinsic material stiffness.
 * Ordered force endpoints preserve the tested direction, including unloading.
 * No rate, fixture compliance, linearity, or independence is inferred. */
export function summarizeRepeatedAxialSecants(input: RepeatedAxialSecantInput) {
  const { specimenId, datumId, fromForceLb, toForceLb, minimumAbsoluteTravelIn, trials } = input;
  const changeInForceLb = toForceLb - fromForceLb;
  if (!identity(specimenId) || !identity(datumId) ||
      ![fromForceLb, toForceLb, changeInForceLb, minimumAbsoluteTravelIn].every(Number.isFinite) ||
      changeInForceLb === 0 || minimumAbsoluteTravelIn <= 0 ||
      !Array.isArray(trials) || trials.length < 2 || trials.length > 1000) {
    throw new Error("A specimen, datum, finite directed force window, positive travel threshold, and 2–1000 trials are required");
  }

  const usedTrials = new Set<string>();
  const usedReadings = new Set<string>();
  const results = Array.from(trials, trial => {
    if (!trial || !identity(trial.trialId) || usedTrials.has(trial.trialId)) {
      throw new Error("Each trial must have a unique identity");
    }
    usedTrials.add(trial.trialId);
    const { from, to } = trial;
    for (const [reading, expectedForceLb] of [[from, fromForceLb], [to, toForceLb]] as const) {
      if (!reading || !identity(reading.readingId) || usedReadings.has(reading.readingId) ||
          reading.specimenId !== specimenId || reading.datumId !== datumId ||
          reading.forceLb !== expectedForceLb || !Number.isFinite(reading.lengthChangeIn)) {
        throw new Error("Each endpoint must be a distinct reading at the expected specimen, datum and directed force");
      }
      usedReadings.add(reading.readingId);
    }
    const travelIn = to.lengthChangeIn - from.lengthChangeIn;
    const secantLbPerIn = changeInForceLb / travelIn;
    if (!Number.isFinite(travelIn) || Math.abs(travelIn) < minimumAbsoluteTravelIn ||
        !Number.isFinite(secantLbPerIn) || secantLbPerIn <= 0) {
      throw new Error("Travel must be resolved, numerically usable, and in the same signed direction as the force change");
    }
    const reportReading = ({ readingId, forceLb, lengthChangeIn }: AxialSecantReading) =>
      ({ readingId, forceLb, lengthChangeIn });
    return { trialId: trial.trialId, from: reportReading(from), to: reportReading(to), travelIn, secantLbPerIn };
  });
  const slopes = results.map(row => row.secantLbPerIn);
  const minLbPerIn = Math.min(...slopes);
  const maxLbPerIn = Math.max(...slopes);
  return {
    status: "PRELIMINARY_MEASURED_SECANTS_ONLY" as const, specimenId, datumId, fromForceLb, toForceLb,
    changeInForceLb, minimumAbsoluteTravelIn, trials: results,
    scatter: { minLbPerIn, maxLbPerIn, rangeLbPerIn: maxLbPerIn - minLbPerIn },
    observationsIndependentlyVerified: false as const, approvedForStructuralUse: false as const,
    limitations: [
      "Readings and travel threshold are caller-supplied. Distinct IDs do not verify independent measurements.",
      "These secants include the measured setup response; no material modulus, design value, or structural suitability is derived.",
    ],
  };
}
