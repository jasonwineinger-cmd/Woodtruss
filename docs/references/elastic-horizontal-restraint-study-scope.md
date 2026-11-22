# Elastic frame horizontal-restraint sensitivity

Start from one stable, preauthored linear frame, its exact physical load state, and a named Cartesian roller that restrains **only global Y**. The roller's X direction must remain free and its joint rotation unrestrained in the base model. This study does not reinterpret an inclined support, add a support to an unverified structure, or change the base model's solver constraints. The positive X direction is defined in the frame coordinate system, not relative to a truss heel or connector.

Solve the base state to obtain roller displacement `u0` in global X. On the same geometry, properties, releases, and supports, use a separate +1 lb global-X perturbation at that node to determine horizontal flexibility `f`, in in/lb. The displacement difference isolates the unit response only if it is numerically resolved; a unit-only solve with the same stiffness is preferable when base motion is large. A stable supported frame must give a finite positive flexibility for this free coordinate. Reject a mechanism, a nonfinite result, or an unresolved response; do not assign a substitute flexibility.

| Diagnostic limit | Predicted X motion `u` | Opposing X action `H` on the frame |
| --- | --- | --- |
| Free | `u0` | zero |
| Explicit bilateral finite stiffness `k > 0`, lb/in | `u0/(1+k*f)` | `-k*u` |
| Ideal rigid X limit | zero | `-u0/f` |

These follow from `u = u0 + f*H` and, in the finite case, `H = -k*u`. A positive free displacement therefore calls for a negative opposing action. The rigid line is a mathematical limit, not authorization to assume an infinitely stiff or physical support.

To audit the response, inject the separately identified action at the roller node and solve afresh **without changing the base restraint flags**. The solver's reactions at its originally modeled restraints remain physical reactions of the replayed ideal model; the injected action is not a newly solved X reaction at the Y-only roller. For the interpreted restraint diagnostic, show the opposing action separately as the force supplied by the assumed restraint. Count it once, not on both sides of the applied-action/support ledger, and include its moment about the same named reference node. Check signed force and moment closure and the actual returned roller motion against the analytic prediction, rather than forcing a reported zero.

For large stiffness, evaluate the finite action as the rigid-limit action multiplied by `t/(1+t)`, where `t=k*f`; use an overflow-safe ratio and avoid forming `k*u0`. Check motion without subtracting nearly equal terms unnecessarily, retain sign, and hold unrepresentable or unresolved intermediates. Useful checks include zero/free, sign reversal, moderate finite stiffness, convergence toward the rigid limit, and redistribution of the original support reactions. Equilibrium alone does not verify the predicted local movement.

The [USDA measured scissors-truss study](https://www.fpl.fs.usda.gov/documnts/fplrp/fplrp499.pdf) discusses horizontal movement and restraint effects that differ between individual and roof-assembly tests. Its stiffness measurements use truss reactions versus the mean of three measured vertical node displacements. Neither those slopes nor qualitative restraint observations supply a spring constant for this model, identify a compatible boundary condition, or validate an assumed spring. Keep that research separate from these analytic limiting cases.

This is bilateral linear sensitivity only. It does not fit a spring, infer connection behavior, model one-way contact, uplift or compression-only bearing, or approve supports, code loads, capacity, attachment, fabrication, or release.
