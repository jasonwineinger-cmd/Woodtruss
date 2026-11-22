const MAX_ROWS = 10_000;
const MAX_CONTACTS = 100_000;
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= 512 &&
  value.trim() === value && !/\p{Cc}/u.test(value);
function exact<K extends string>(value: unknown, keys: readonly K[]): value is Record<K, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value) &&
    Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
}

/** Link exact authored identity rows in this bounded, pre-snapshotted profile.
 * Counts describe records, not physical contact or an inspection. */
export function countTpsxDesignQcJointLinks(
  joints: unknown, memberQC: unknown, memberIds: ReadonlySet<string>, platingIds: ReadonlySet<string>,
): { jointCount: number; contactCount: number; memberQcCount: number } | null {
  if (!Array.isArray(joints) || !Array.isArray(memberQC) ||
      joints.length < 1 || joints.length > MAX_ROWS || joints.length !== platingIds.size ||
      memberQC.length < 2 || memberQC.length > MAX_ROWS || memberQC.length !== memberIds.size) return null;
  const labels = new Set<string>(), plating = new Set<string>(), jointMembers = new Set<string>();
  let contactCount = 0;
  for (const row of joints as unknown[]) {
    if (!exact(row, ["JointLabel", "PlatingId", "JointMembers"])) return null;
    const { JointLabel, PlatingId, JointMembers } = row;
    if (!text(JointLabel) || labels.has(JointLabel) || !text(PlatingId) ||
        plating.has(PlatingId) || !platingIds.has(PlatingId) || !Array.isArray(JointMembers) ||
        JointMembers.length < 2 || JointMembers.length > MAX_ROWS ||
        contactCount + JointMembers.length > MAX_CONTACTS) return null;
    const incident = new Set<string>();
    for (const contact of JointMembers as unknown[]) {
      if (!exact(contact, ["MemberId"]) || !text(contact.MemberId) ||
          !memberIds.has(contact.MemberId) || incident.has(contact.MemberId)) return null;
      incident.add(contact.MemberId);
      jointMembers.add(contact.MemberId);
    }
    labels.add(JointLabel);
    plating.add(PlatingId);
    contactCount += incident.size;
  }
  if (jointMembers.size !== memberIds.size) return null;
  const qc = new Set<string>();
  for (const row of memberQC as unknown[]) {
    if (!exact(row, ["MemberId"]) || !text(row.MemberId) || !memberIds.has(row.MemberId) || qc.has(row.MemberId)) return null;
    qc.add(row.MemberId);
  }
  return { jointCount: labels.size, contactCount, memberQcCount: qc.size };
}
