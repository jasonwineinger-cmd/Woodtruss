# Selected cuts can change when unselected stiffness changes

The paired ordinary Double Fink review compares freshly solved preliminary section demands at the same signed, directed cuts. A catalog provenance match for the selected members is **not** verification of the rest of the frame. In a redundant model, different stiffness elsewhere can redistribute forces without changing the applied load, external equilibrium, or selected catalog documentation. A different model revision must not reuse an earlier cut result.

The library input is `{baseline, alternative}`; each is a complete ordinary Double Fink catalog-bound cut-review input. The model ID is the same, revisions differ, and each side's assignment, expected source and receipt bind its own revision. Supports, actions, ordered cases and cuts, member directions and releases, and catalog details must otherwise match. Only gross area, second moment of area or modulus may vary, and only on at least one unselected member. Success lists the exact directed changed members and property names. If either review holds or the finite results cannot be matched cut by cut, the pair withholds all cut vectors and changed-member details. The comparison does not infer material properties for changed members. A sensitivity delta is alternative minus baseline at the same cut, not a component envelope, uncertainty bound, governing value, acceptance criterion or recommended change.

## Exact ordinary Double Fink check

For the diagnostic 20-ft frame, release all member end rotations and author both endpoints restrained in X and Y. Apply +100 lb X at B1 and select bottom-B1-B2. Conceptually free the right X restraint: the applied force gives +100 lb tension in bottom-L-B1 only, while a unit right-end +X force gives +1 lb tension in each of the eight collinear bottom segments. Restore right-end X compatibility. For equal areas and lengths and common modulus in the seven right-hand segments, the right reaction is `-100/(1+7 E_left/E_common)` lb. It equals the selected cut's axial force: -12.5 lb at uniform modulus and -100/15 lb when only unselected bottom-L-B1's modulus doubles. Shear and moment stay zero. The two-end horizontal restraint is an intentionally idealized redundancy, not evidence of a real bearing.

## Independent synthetic cross-check

Use four pin-jointed nodes in inches: A=(0,0), B=(48,0), C=(48,36), D=(0,36). Connect AB, BC, AD, DC, AC and BD; the crossing of AC and BD is **not** a joint. Pin A, hold global Y at B, and load C in global +X by 120 lb. The baseline axial stiffness EA/L of each bar is 1,000 lb/in. Double only unselected BD's modulus, leaving its area and geometry unchanged. Both authored models have reactions A=(-120,-90) lb and B=(0,+90) lb.

Let the signed tensile force in BD be q and its stiffness ratio to baseline be r. Joint equilibrium gives AB=-0.8q, BC=-90-0.6q, AD=-0.6q, DC=-0.8q, and AC=150+q in pounds. Stationary complementary energy with respect to q gives 204+(3+1/r)q=0. This gives the following independent expectations:

| Value | Baseline | Double BD modulus |
| --- | ---: | ---: |
| BD axial force (lb) | -51 | -58.2857142857 |
| Selected AB midspan axial force (lb) | +40.8 | +46.6285714286 |
| Selected AC midspan axial force (lb) | +99 | +91.7142857143 |
| C global X displacement (in) | +0.1683 | +0.155914285714 |

This rectangle is a generic mechanics regression, not the Double Fink geometry, and its fixture stiffness is not a lumber design value. Neither review verifies actual stock, connection restraint, source publications, structural adequacy or engineering approval. The 50-foot maximum and fabrication, shipping and machine-release locks are unchanged.
