# @prodmind/llm-adapter

Provider abstraction boundary for engines.

Current state:
- scaffold only
- compile/test scripts wired

Boundary:
- may depend on provider SDKs in future
- must not leak provider-specific details into engine contracts
- must not depend on app shells

TODO:
- implement minimal contract in `docs/llm-adapter-contract.md`

