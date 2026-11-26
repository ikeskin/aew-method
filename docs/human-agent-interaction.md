# AEW Control Center — Human–Agent Interaction

Status: proposed architecture; no implementation or runtime integration verified.

## Vision
Control Center is a bidirectional human–agent workspace, not a passive monitoring dashboard. The human owns product decisions and acceptance. The Manager is the primary conversational contact and delegates specialist work. Specialists may submit interaction requests via the Manager or a controlled direct channel.

## Interaction protocol
Define a provider-neutral, versioned typed message envelope with messageId, taskId, sessionId, agentId, correlationId, type, timestamp, payload, status and optional artifact references. Support chat, question, selection, form, diagram, image, audio, voice transcript, preview, annotation, code diff, approval and acceptance. Use validated component schemas rather than arbitrary agent-generated executable UI. The human response is a structured event correlated to its request; preserve the original input and explicit decision. Manager receives the response through the runtime adapter. Allow streaming, cancellation, reconnect and idempotent responses. Do not claim native support for modalities until verified; speech input/output can be separate services.

## State and enforcement
Task lifecycle and approval gates are controlled by the application, not agent assertions. Split plan and execution into separate authorized stages where necessary; do not assume a live CLI session can be paused at arbitrary tool boundaries. Bind approval to plan revision and acceptance to verified artifact/diff revision; invalidate stale approvals after changes. Human-only approval endpoint, authenticated session and audit log; isolate agent write permissions from approval storage. Treat agent files and generated artifacts as untrusted. Preview in isolated sandbox with restricted network and credentials; no arbitrary HTML/JS in trusted dashboard context. Explicit user acceptance is distinct from test success. External CLI sessions that bypass the dashboard cannot be claimed as enforced.

## Architecture
React UI -> local authenticated Control API -> interaction/task service -> provider adapter -> Manager/native subagents. Persist task records, interaction events and evidence references; use existing AEW records where compatible, separate protected decisions. Stream events via SSE or WebSocket as appropriate. Keep AEW CLI verification independent. First adapter target: Codex, subject to current official API and installed-version validation; do not invent runtime events or resume semantics.

## Delivery phases
P0: text, structured question/selection, plan approval, task state, delivery acceptance, actual verification evidence, runtime adapter capability spike. P1: artifact rendering, diagrams, diff, image annotation, isolated live web preview. P2: speech-to-text, text-to-speech, audio attachments and richer specialist collaboration. Token/cost telemetry only when provider exposes reliable usage. No new distributed infrastructure until justified.

## Acceptance tests
Human approves exact plan revision; agent cannot forge approval; rejected plan does not execute; responses route to originating task/session; reconnect does not duplicate decisions; stale acceptance is rejected; failed verification blocks delivery; unsupported modality is reported honestly; untrusted preview cannot access dashboard credentials; user can cancel and see actual runtime status.
