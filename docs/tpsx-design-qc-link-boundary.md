# TPSX v0.9.4 design-to-QC link boundary

[SBCA’s official TPSX page](https://www.sbcacomponents.com/tpsx) describes
TPSX in the context of its Digital QC program. The Woodtruss check is
narrower: it reviews a bounded, locally extracted **v0.9.4 identity-only
plain-data projection**. It does not open the TPSX archive, import a design,
validate the complete external schema, or support another version.

- Provide the selected component and QC records plus the manifest identity
  list. This check requires the same exact component ID, name, and version
  in all three projections. It does not authenticate that selection against
  a separate expected archive. Nearby names or matching geometry are not
  substitutes. The manifest quantity is declared component
  quantity, not a count of files, drawings, physical trusses, or checks.
- Design plate IDs link to the plate declarations referenced by plating
  rows. Preserve each declared face category, `FrontBack` or `TopBottom`;
  neither category proves which physical faces were built or inspected.
- Joint records link to exact plating placement IDs and explicit contacted
  member IDs in the selected design. This bounded profile requires one
  joint row per placement, every member referenced by a joint, and
  separate complete `MemberQC` coverage. Larger formats or different
  record cardinalities are not inferred. A recorded contact or QC
  link is not a measured connection, observed inspection, or evidence
  that the referenced work was performed.

A match documents identity links in the supplied projection only. It does
not establish source authenticity or licensing, validate full TPSX or
vendor interoperability, certify this software, or verify design,
resistance, plate capacity, QC observations, or physical construction.
It grants no fabrication, shipping, or machine-release authority. No
external schema, sample archive, or vendor file is reproduced here.
