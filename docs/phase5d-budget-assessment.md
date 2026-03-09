# Phase 5D Budget Assessment

## Decision

Defer budget guardrail implementation in Phase 5D.

## Evidence Reviewed

- Current system scope is still internal pilot, single-user.
- Phase 5C introduced minimal usage/cost visibility.
- Phase 5D strengthens operator visibility and smoke guidance.
- There is no repository evidence of sustained pilot spend incidents or operator pain severe enough to justify guardrails now.

## Assessment Dimensions

### Current pilot usage level

Still limited. Real-provider execution is opt-in and not the default path.

### Cost visibility sufficiency

Minimal but adequate for current pilot maturity:

- provider/model
- request count
- token visibility when available
- estimated cost when reasonable

### Operator pain points

The main current gap was reliability clarity, not spend control. Phase 5D addresses routing and policy visibility first.

### Risk of uncontrolled spend

Present but not yet evidenced as urgent in current pilot scope.

## Conclusion

Implementing budget guardrails now would likely produce a partial billing system without strong evidence it is needed.

## Recommended Trigger for Reassessment

Reassess in the next phase if one or more of these become true:

- regular real-provider pilot traffic increases
- operators report spend uncertainty despite current visibility
- fallback usage materially increases call volume
- there is evidence of uncontrolled or surprising spend
