# Woodtruss engineering completion gates

**Current release status: PRELIMINARY_NOT_ENGINEERED. No fabrication authorization.**
Maximum supported planning span: **50 ft**. Passing software tests does not establish structural adequacy.

## 1. NDS-based lumber design
- Acquire licensed, edition-specific NDS Supplement design values with species, grade, size, and provenance.
- Implement and independently benchmark applicable duration, wet-service, temperature, size, incising, repetitive-member and other factors, including exclusions and interactions.
- Implement compression stability, effective unbraced lengths, tension, bending, shear, bearing, combined loading, and serviceability.
- Verify against worked examples and independent engineer review before marking a candidate as structurally adequate.
- Current: exact edition, addendum and quantity receipts; local document-byte checks; preliminary axial demand and schematic stock comparisons. These are **not NDS sizing** and do not establish applicability or authorization.

## 2. Connector plates
- Obtain manufacturer-approved plate data, orientation, grip, tooth embedment, joint-force transfer, and applicable TPI design rules.
- Validate plate sizing, placement, lumber species, splices, joints, press process, and inspection requirements.
- Current: exact joint/revision/load cases and signed member-end demands, separate unsigned geometry angles, and optional local maker-document identity. **No plate capacities, recommended placement or manufacturer approval.**

## 3. Truss families
- Common and scissor: selected preliminary pin-jointed models, including a level-bearing unequal-pitch common reference. No production design.
- Attic: room-clearance schematic; the open room bay is not qualified for a pin-jointed solve. Floor loading, stability and connections are unverified.
- Mono: a narrow four-panel preliminary model with authored point loads and level end supports. No raised heel or cantilever analysis.
- Agricultural: a narrow level-bearing tied-gable preliminary model. Purlin loading, site wind/snow, bearings, connections and bracing remain open.
- Hip: bounded rectangular roof envelope and transverse section references only. A reviewed source-patch ledger models explicit load ownership separately. Neither is hip-truss topology, load-path validation or shop geometry.

## 4. Automatic member optimization
- Current: deterministic schematic stock trade-offs with explicitly matched case and catalog evidence. Area and waste are comparison quantities, not a structural optimization result.
- Future: only select members after all applicable strength, buckling, interaction, serviceability, and plate constraints pass; account for stock lengths, waste, and manufacturing constraints.
- No optimization result may set fabricationAuthorized=true without trusted independent engineering approval.

## 5. Shop drawings and fabrication
- Current: standalone common and mono previews, dimensionless watermarked SVG, schematic centerline records and revision-aware external review identity. No manufacturing export or production Panelizer connection.
- Future: controlled revisioned shop drawings, verified saw cuts and angles, heel/bearing details, plate schedules and orientation, bracing notes, traceability, QA checks, and machine-safe exports.
- Existing C-press capacity and connector plate approval must be verified before any manufacturing workflow.
- Fabrication release remains fail-closed pending trusted signed engineering approval.

See [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md) for the exact verified implementation and next batch.

## Verification protocol
1. Run `npm run check` on each batch and record exact passing/failing counts in `TEST_STATUS.md`.
2. Keep independent calculation benchmarks separate from tests that simply repeat implementation assumptions.
3. Do not present preliminary calculations, SVGs, candidate rankings, or centerline lengths as engineered plans.
