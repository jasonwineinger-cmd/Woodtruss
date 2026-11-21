# Woodtruss engineering completion gates

**Current release status: PRELIMINARY_NOT_ENGINEERED. No fabrication authorization.**
Maximum supported planning span: **50 ft**. Passing software tests does not establish structural adequacy.

## 1. NDS-based lumber design
- Acquire licensed, edition-specific NDS Supplement design values with species, grade, size, and provenance.
- Implement and independently benchmark applicable duration, wet-service, temperature, size, incising, repetitive-member and other factors, including exclusions and interactions.
- Implement compression stability, effective unbraced lengths, tension, bending, shear, bearing, combined loading, and serviceability.
- Verify against worked examples and independent engineer review before marking a candidate as structurally adequate.
- Current: catalog provenance and preliminary axial stress ranking; **not NDS sizing**.

## 2. Connector plates
- Obtain manufacturer-approved plate data, orientation, grip, tooth embedment, joint-force transfer, and applicable TPI design rules.
- Validate plate sizing, placement, lumber species, splices, joints, press process, and inspection requirements.
- Current: per-joint inventory and required-check checklist; **no plate capacities**.

## 3. Truss families
- Common/scissor: preliminary pin-jointed structural models, not production design.
- Attic: room clearance only; needs floor loading, web topology, member checks, and connection design.
- Agricultural: roof outline only; needs purlin loading, unbalanced wind/snow/uplift, stability, bracing, bearings, and connections.
- Additional mono/hip profiles need their own verified topology and analysis.

## 4. Automatic member optimization
- Current: deterministic candidate ranking by material area with axial demand stresses, always unapproved.
- Future: only select members after all applicable strength, buckling, interaction, serviceability, and plate constraints pass; account for stock lengths, waste, and manufacturing constraints.
- No optimization result may set fabricationAuthorized=true without trusted independent engineering approval.

## 5. Shop drawings and fabrication
- Current: watermarked SVG schematic and schematic centerline length reports.
- Future: controlled revisioned shop drawings, verified saw cuts and angles, heel/bearing details, plate schedules and orientation, bracing notes, traceability, QA checks, and machine-safe exports.
- Existing C-press capacity and connector plate approval must be verified before any manufacturing workflow.
- Fabrication release remains fail-closed pending trusted signed engineering approval.

## Verification protocol
1. Run `npm run check` on each batch and record exact passing/failing counts in `TEST_STATUS.md`.
2. Keep independent calculation benchmarks separate from tests that simply repeat implementation assumptions.
3. Do not present preliminary calculations, SVGs, candidate rankings, or centerline lengths as engineered plans.
