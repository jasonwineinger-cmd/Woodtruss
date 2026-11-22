# Catalog elastic member stiffness boundary

`auditCatalogElasticMemberStiffness` is a library-only documentary and
arithmetic check. It compares the independently expected model ID and
revision, then checks every exact directed member's authored gross area
(`A`), second moment of area (`I`), and modulus of elasticity (`E`) against
the assigned full catalog record. An equal dimension or reference ID alone
does not authorize a replacement member, a reversed direction, altered
catalog values, or a stale model receipt.

- Each assignment explicitly identifies the section axis, `about-width`
  or `about-depth`, and the `catalog-mean` or `catalog-minimum` modulus
  field. The check does not infer either choice or recommend either modulus
  for a design check.
- Arithmetic tolerance applies to the independent gross section comparisons
  for `A` and `I` only. It does not broaden the exact record, member, or
  modulus comparisons. Gross section agreement does not describe a notch,
  hole, net section, or assembled section.
- Present shear properties hold the audit because this evidence supplies no
  shear modulus or effective shear area. Both end-release flags must still
  be explicitly authored Booleans; that does not verify physical joint
  behavior or connector fixity.

The existing axial stiffness audit is unchanged. The elastic documentary
audit does not run a solver, choose or substitute stock, authenticate or
license the catalog, verify allowable stresses or code compliance, certify
a design, or authorize manufacturing and release.
