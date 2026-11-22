const MAX_ROWS = 10_000;
const MAX_CONTACTS = 100_000;
function exact<K extends string>(value: unknown, keys: readonly K[]): value is Record<K, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}
const id = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512 &&
  value.trim() === value && !/\p{Cc}/u.test(value);

/** Counts exact requirement records in a bounded pre-snapshotted join.
 * Literal zeros carry no meaning about observed physical quality or sufficiency. */
export function countTpsxDesignQcRequirementRows(linkedJoints: unknown, requirementJoints: unknown) {
  if (!Array.isArray(linkedJoints) || !Array.isArray(requirementJoints) ||
      linkedJoints.length < 1 || linkedJoints.length > MAX_ROWS || linkedJoints.length !== requirementJoints.length) return null;
  const joints = new Map<string, { platingId: string; members: Set<string> }>();
  const plating = new Set<string>();
  let contactCount = 0, zeroTeethCount = 0, zeroAreaCount = 0, bothZeroCount = 0, grossJointCount = 0, netJointCount = 0;
  for (const row of linkedJoints as unknown[]) {
    if (!exact(row, ["JointLabel", "PlatingId", "JointMembers"])) return null;
    const { JointLabel, PlatingId, JointMembers } = row;
    if (!id(JointLabel) || !id(PlatingId) || joints.has(JointLabel) || plating.has(PlatingId) ||
        !Array.isArray(JointMembers) || JointMembers.length < 2 || JointMembers.length > MAX_ROWS ||
        contactCount + JointMembers.length > MAX_CONTACTS) return null;
    const members = new Set<string>();
    for (const contact of JointMembers as unknown[]) {
      if (!exact(contact, ["MemberId"]) || !id(contact.MemberId) || members.has(contact.MemberId)) return null;
      members.add(contact.MemberId);
    }
    joints.set(JointLabel, { platingId: PlatingId, members });
    plating.add(PlatingId);
    contactCount += members.size;
  }
  const seen = new Set<string>();
  for (const row of requirementJoints as unknown[]) {
    if (!exact(row, ["JointLabel", "PlatingId", "AreaMethod", "JointMembers"])) return null;
    const { JointLabel, PlatingId, AreaMethod, JointMembers } = row;
    const linked = id(JointLabel) ? joints.get(JointLabel) : undefined;
    if (!linked || !id(JointLabel) || seen.has(JointLabel) || linked.platingId !== PlatingId ||
        (AreaMethod !== "Gross" && AreaMethod !== "Net") ||
        !Array.isArray(JointMembers) || JointMembers.length !== linked.members.size) return null;
    const members = new Set<string>();
    for (const contact of JointMembers as unknown[]) {
      if (!exact(contact, ["MemberId", "RequiredTeeth", "RequiredArea"])) return null;
      const { MemberId, RequiredTeeth, RequiredArea } = contact;
      if (!id(MemberId) || !linked.members.has(MemberId) || members.has(MemberId) ||
          typeof RequiredTeeth !== "number" || !Number.isSafeInteger(RequiredTeeth) || RequiredTeeth < 0 ||
          typeof RequiredArea !== "number" || !Number.isFinite(RequiredArea) || RequiredArea < 0) return null;
      members.add(MemberId);
      if (RequiredTeeth === 0) zeroTeethCount++;
      if (RequiredArea === 0) zeroAreaCount++;
      if (RequiredTeeth === 0 && RequiredArea === 0) bothZeroCount++;
    }
    seen.add(JointLabel);
    if (AreaMethod === "Gross") grossJointCount++;
    else netJointCount++;
  }
  return { jointCount: joints.size, contactCount, zeroTeethCount, zeroAreaCount, bothZeroCount, grossJointCount, netJointCount };
}
