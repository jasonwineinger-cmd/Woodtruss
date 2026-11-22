import { solveElasticFrame, type ElasticFrameInput } from "./elastic-frame-solve.js";
import { selectElasticFrameStressCases } from "./elastic-frame-stress-case-selection.js";

type SharedFrame = Pick<ElasticFrameInput, "nodes" | "members" | "supports">;
type CaseActions = Pick<ElasticFrameInput, "loads" | "memberLoads" | "memberPointLoads">;
type StressRequest = NonNullable<ElasticFrameInput["memberRectangularStressExtrema"]>[number];
export type AuthoredElasticFrameStressCase = CaseActions & { caseId: string };
export type AuthoredElasticFrameStressCasesInput = {
  modelId: string;
  modelRevision: string;
  frame: SharedFrame;
  cases: readonly AuthoredElasticFrameStressCase[];
  members: readonly StressRequest[];
};
const validId = (id: unknown): id is string =>
  typeof id === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,79}$/u.test(id);
const exact = (value: unknown, keys: readonly string[]) =>
  !!value && typeof value === "object" && !Array.isArray(value) &&
  (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) &&
  Reflect.ownKeys(value).length === keys.length &&
  keys.every(key => Object.prototype.propertyIsEnumerable.call(value, key));
const dense = (rows: unknown, maximum: number) =>
  Array.isArray(rows) && rows.length > 0 && rows.length <= maximum &&
  Reflect.ownKeys(rows).length === rows.length + 1 &&
  Array.from(rows).every((_, i) => Object.hasOwn(rows, i));
const caseFields = ["caseId", "loads"];
const caseOptions = ["memberLoads", "memberPointLoads"];

/** Independently solve each explicitly authored action case on one unchanged
 * frame and one member/rectangle scope. No case factors/defaults or supplied
 * solved responses are accepted. A failure withholds the whole review. */
export function studyAuthoredElasticFrameStressCases(input: AuthoredElasticFrameStressCasesInput) {
  if (!exact(input, ["modelId", "modelRevision", "frame", "cases", "members"]) ||
      !validId(input.modelId) || !validId(input.modelRevision) ||
      !exact(input.frame, ["nodes", "members", "supports"])) {
    throw new Error("Exact authored frame model identity and shared frame geometry/support fields required");
  }
  const { modelId, modelRevision, frame, cases, members } = input;
  if (!dense(cases, 16) || !dense(members, 100)) {
    throw new Error("One to 16 dense authored cases and one to 100 exact stress member requests are required");
  }
  const caseIds = new Set<string>();
  for (const row of cases) {
    if (!exact(row, [...caseFields, ...caseOptions.filter(key => row && Object.hasOwn(row, key))]) ||
        !validId(row.caseId) || caseIds.has(row.caseId)) {
      throw new Error("Unique exact authored case IDs and explicit loads are required; combinations or solved responses are not accepted");
    }
    caseIds.add(row.caseId);
  }
  const memberIds = new Set<string>();
  for (const request of members) {
    if (!exact(request, ["memberId", "rectangle"]) || !validId(request.memberId) || memberIds.has(request.memberId) ||
        !exact(request.rectangle, ["actualWidthIn", "actualDepthIn"])) {
      throw new Error("Unique stress member IDs and exact actual rectangle fields are required");
    }
    memberIds.add(request.memberId);
  }

  const caseResults = cases.map(({ caseId, ...actions }) => {
    try {
      const { memberRectangularStressExtrema } = solveElasticFrame({
        ...frame, ...actions, memberRectangularStressExtrema: members,
      });
      return { caseId, memberRectangularStressExtrema };
    } catch (error) {
      throw new Error(`Authored frame stress case ${caseId} failed: ${error instanceof Error ? error.message : "invalid elastic frame result"}`,
        { cause: error });
    }
  });
  return {
    modelId, modelRevision, caseResults,
    memberEnvelope: selectElasticFrameStressCases(caseResults, [...memberIds]),
    status: "PRELIMINARY_NOT_ENGINEERED" as const, fabricationAuthorized: false as const,
  };
}
