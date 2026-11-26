# Manager Control Center

Status: proposed UX.

Primary view: active tasks, blocked tasks, pending human decisions, Manager activity. Views: Tasks, Requests, Decisions, Communication. Show chronological events with actor, type, summary, timestamp and correlation to tasks/decisions. Raw provider logs are secondary.

Decision card: question, reason, alternatives/tradeoffs, recommendation, risks, affected tasks/files, revision, authority, approval status and separate implementation status. Actions: approve specific option/revision, reject, request revision. Show persisted confirmation only; stale actions refresh the record.

Request card: originating task, missing information, blocking flag, Manager resolution and whether human action is needed. Do not expose agent-to-agent chat or routing controls.

Distinguish agent-reported result from independently checked evidence. Dashboard disconnect does not stop or lose work; reconnect by persisted sequence. Human actions go through Manager API.
