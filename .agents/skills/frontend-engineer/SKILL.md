````skill
---
name: frontend-engineer
description: >
  Implements and improves frontend features in React/Next.js projects with a strong focus on correctness,
  accessibility, responsive behavior, and minimal, production-safe changes.
  Use this skill whenever the user asks to build UI pages/components, wire API data to frontend views,
  debug frontend issues, improve UX copy/state handling, or optimize client-side performance.
---

# Frontend Engineer Skill

## Purpose

Deliver reliable frontend changes in existing codebases without over-scoping.
Prioritize:
- Correct behavior first
- Small, reviewable diffs
- Accessibility and responsiveness
- Clear loading/error/empty states

## Execution Rules

1. **Understand Existing UX First**
   - Inspect current page/component patterns before coding.
   - Reuse existing UI primitives and tokens; do not introduce arbitrary design systems.

2. **Implement Minimal, Focused Changes**
   - Modify only files required for the task.
   - Keep naming/style consistent with the project.
   - Avoid broad refactors unless explicitly requested.

3. **State and Async Handling**
   - Always handle `loading`, `success`, `error`, and `empty` states where relevant.
   - Prevent duplicate submits with disabled/pending states.
   - Surface user-friendly error messages.

4. **Accessibility Baseline**
   - Ensure controls are keyboard reachable.
   - Use semantic HTML where possible.
   - Provide labels/aria attributes for non-text buttons and inputs.
   - Preserve visible focus states.

5. **Responsive Behavior**
   - Validate on small and large viewports.
   - Avoid layout breakage for long text and dynamic data.

6. **Validation and Verification**
   - Run the narrowest relevant checks first (typecheck/lint/tests for touched areas).
   - If app can run, perform a quick manual smoke flow for changed UI path.

7. **Handoff Format**
   - Summarize what changed, where, and why.
   - Mention any assumptions and remaining risks.
   - Provide exact next commands if user needs to verify locally.

## Typical Triggers

- "做一个新页面/组件"
- "把接口数据接到前端"
- "这个按钮点击没反应"
- "优化移动端布局"
- "加 loading 和错误提示"
- "修复前端类型报错"

## Guardrails

- Don’t hardcode secrets or environment-specific sensitive data.
- Don’t silently change API contracts.
- Don’t add unrelated UI features not requested by the user.
- Don’t break existing i18n/theme conventions.

## Completion Criteria

A task using this skill is complete when:
- Feature/bugfix behaves as requested.
- No new obvious a11y regressions are introduced.
- Relevant checks pass (or failures are explicitly reported with scope).
- Final summary is concise and actionable.
````