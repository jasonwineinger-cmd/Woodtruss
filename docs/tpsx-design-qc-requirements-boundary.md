# TPSX v0.9.4 design-to-QC requirements boundary

[SBCA’s official TPSX page](https://www.sbcacomponents.com/tpsx) describes
the source format in the context of Digital QC. The library-only
`reviewTpsxDesignQcRequirements` checks a separate, locally supplied
v0.9.4 requirements declaration in inches against the exact selected
component from the [identity-only link review](tpsx-design-qc-link-boundary.md).
It does not read an archive, validate a full TPSX file, or import vendor data.

- Bind the declared requirements to the same component identity, exact plating placement
  ID and joint label, and exact participating member IDs. A matching joint label,
  similarly shaped truss, or matching values from another component do not
  establish that link.
- Declare the area method explicitly as `Gross` or `Net`. Area and required
  teeth are separate fields and both must be present: area must be finite
  and nonnegative, and tooth count must be a nonnegative safe integer.
  Zero is an explicit declaration, not an omitted requirement.
- Do not infer or convert area from the tooth count, infer a count from area,
  infer gross from net or vice versa, or derive a requirement from geometry,
  placement, or an inspection. The review compares the supplied declaration;
  it does not establish that its values are correct or adequate.

A documented match is not an observed measurement, a passing inspection,
an allowable resistance, a capacity check, or certification of the source or
software. It grants no shipping, fabrication, or machine-release authority.
No external schema, vendor files, or sample archives are reproduced.
