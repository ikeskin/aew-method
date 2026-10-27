# Deployment workflow
1. Discover provider, pipeline definitions, release mechanism, environments, approvals and rollback strategy.
2. Validate build/test artifacts, configuration references, migrations, secrets handling and deployment dependencies.
3. Propose smallest pipeline/release change; never overwrite existing workflows blindly.
4. Obtain explicit human authorization before executing remote mutations; production also requires platform-side approval/RBAC.
5. Execute only within granted scope. Record pipeline/run IDs, status, health checks and rollback evidence.
6. If access or evidence is missing, stop and report what remains unverified. Never claim deployment success based on an agent summary.

Apply project and technology profiles plus readability, comment and engineering-scope standards. Avoid unrelated reformatting and scope expansion.
