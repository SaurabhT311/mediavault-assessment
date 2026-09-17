# Submission

Keep this tight. Bullet points are fine. We read this before we read your code,
and a clear account of your reasoning carries real weight — including where you
chose not to do something.

## Video walkthrough

Paste your Loom (or equivalent) link here. 5–10 minutes.

**Link:**

---

## How to run it

Anything we need to know beyond `npm install && npm run dev`.
Install `npm i tanstack/react-query`

## Time spent

Roughly, and how you split it.
Codebase and API understanding: ~25%
Data fetching, caching and state management: ~20%
Bulk status handling and API edge cases: ~25%
Performance and rendering:
Accessibility and UI states: 
Final testing and cleanup:

The most time was spent understanding the existing code and API constraints before making changes, especially the 50-ID bulk-status limit, cursor behaviour, partial failures, retryable conflicts, and stale/out-of-order responses.

---

## Baseline defects found

| # | Defect | Where | Fixed / left / out of scope |
| --- | --- | --- | --- |
| 1 | Bulk update sends >50 ids in one call | `App.tsx` | Fixed — IDs are split into batches of 50 |
| 2 | Bulk operation does not account for partial per-item failures | Bulk status handling | Fixed — applied, failed, and individual results are handled |
| 3 | Card information was hidden  | styles.css | Fixed- Remove overflow: hidden property |
| 4 | Retryable conflict response is present in the API contract   | Bulk status handling   | Left intentionally — the API documents it as retryable, but automatic retry was not required for this task |
| 5 | Search can fire a request for every keystroke | App.tsx | Fixed — Implemented debounced |
| 6 | Older search requests can remain in flight after the query changes | Asset API / App.tsx | Fixed — TanStack Query's signal is passed to fetch so obsolete requests can be aborted using signal. |
| 7 | Filter/sort state was not part of the API query | App.tsx | Fixed — query includes search, status, kind, tag and sort state where those controls are available |


---

## Key decisions

For each significant choice: what you did, what you rejected, and why. Three to
six of these is about right.

**Data fetching and caching**
- Used TanStack React Query for server state instead of storing fetched asset data entirely in local React state.
- Used query invalidation after bulk status updates so the server remains the source of truth.
- Kept UI-only state such as selected IDs and notices in local React state rather than introducing another global state layer.
- Rejected manually updating every cached asset after a bulk operation because the API supports partial failures and per-item results.

**Stale response handling**

**Virtualization approach**

**Optimistic updates and rollback**

**Retry and backoff policy**

**State placement and URL sync**

---

## Performance

Fill in real measurements, not estimates. Say which machine and browser.

| Metric | Before | After | How measured |
| --- | --- | --- | --- |
| Rendered DOM nodes at 5,000 rows loaded | | | |
| Cards re-rendered when toggling one selection | | | |
| Longest task during sustained scroll | | | |
| Requests fired while typing a 6-character query | | | |
| Production bundle, gzipped | | | |

What was the actual bottleneck, and how did you find it?

---

## Accessibility

- Keyboard model you implemented, in one paragraph.
- How you tested it, including any screen reader.
- Known gaps.

---

## Interface decisions

Three or four sentences: what you were optimising for, and the decisions that
follow from it. Then briefly:

- **Visual system.** Your colour, spacing and type decisions, and where they live.
- **Status treatment.** How the four statuses read as a progression, and how they
  stay distinguishable without relying on colour.
- **States.** What you did with loading, empty, error, offline and partial
  failure.
- **Contrast.** What you checked against, and with what.
- **Copy.** Any user-facing message you rewrote and why.

Screenshots in the repo are welcome — link them here.

---

## Trade-offs and cuts

What you deliberately did not do, and what you would do with another day.

- I implemented the API's 50-ID constraint and partial-success handling. I didn't add a retry layer because the existing request abstraction doesn't expose the response headers needed for Retry-After, and I wanted to avoid introducing a larger networking abstraction for this task.

## Critique of the API

What you would change about the backend contract, and what it forced you to do in
the client that you would rather not have.

## Anything you would like us to look at

Code you are proud of, or a decision you are unsure about and want to discuss.
