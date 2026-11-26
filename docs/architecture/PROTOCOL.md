# Provider-neutral communication protocol

Status: draft v1; not a published wire API.

Agent -> Manager only: STATUS, REQUEST, DECISION_REQUEST, RESULT, ERROR.
Manager -> Agent only: ASSIGN, RESPOND, STEER, PAUSE, RESUME, CANCEL. Unsupported commands must be rejected or reported as unsupported; never pretend execution succeeded.

Envelope: schemaVersion, messageId, sessionId, taskId, authenticated sender identity, type, timestamp (Manager-assigned receipt time), summary, payload, correlationId (when responding), sequence (Manager-assigned). No agent-supplied destination or authoritative role. Validate schema, task scope, identity, allowed type and idempotency before persistence. Reject unauthorized or malformed messages.

Decision requests contain question, rationale, options with stable IDs, recommendation, risks, scope, impacted tasks and evidence references. Results contain artifact references and verification evidence, not just a success claim. Requests may be blocking or nonblocking; Manager decides.

Persist events before publishing; dashboard reconnects by sequence and reads missed events. Transport proposal: API commands and SSE event stream. Keep decision status separate from execution status.
