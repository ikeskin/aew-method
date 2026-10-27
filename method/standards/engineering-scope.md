# Engineering scope and proportionality

- Respect the requested change boundary and the project's actual size, maturity, team capacity, risks and operational needs.
- A small fix needs a minimal patch and focused verification, not a platform redesign.
- A feature should reuse established patterns and add only justified structure.
- A new project starts with the simplest sustainable solution; do not prescribe microservices, CQRS or DDD layers by default.
- A high-risk migration/security/payment change requires explicit evidence, risk review, approval and rollback planning.
- Do not assume every contributor is a senior engineer. Prefer understandable patterns, explicit reasoning and maintainable handoff.
- Complexity is acceptable only when a demonstrated requirement warrants it. Explain the trade-off before expanding scope.
- Do not change deployment or production resources without explicit human authorization.
