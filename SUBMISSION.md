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
install `npm i sass`
install `npm install @tanstack/react-virtual`

## Time spent

Roughly, and how you split it.
Codebase and API understanding: ~25%
Data fetching, caching and state management: ~20%
Bulk status handling and API edge cases: ~25%
Performance and rendering:
Accessibility and UI states: 
Final testing and cleanup:

The most time was spent understanding the existing code and API behaviour before making changes, especially the cursor-based pagination, filtering/sorting behaviour, partial bulk-update responses, and how optimistic updates should interact with the existing cached pages.

A significant amount of time was also spent implementing and refining the row-based virtualization approach so the asset grid could handle large result sets while keeping the rendered DOM limited to the visible rows. I also spent time profiling card selection and refining the optimistic bulk-status flow so updates appear immediately without causing a full list refetch or losing the user's current position in a large result set.

---

## Baseline defects found

| # | Defect | Where | Fixed / left / out of scope |
| --- | --- | --- | --- |
| 1 | Bulk update sends >50 ids in one call | `App.tsx` | Fixed — IDs are split into batches of 50 |
| 2 | Bulk operation does not account for partial per-item failures | `Bulk status handling` | Fixed — applied, failed, and individual results are handled |
| 3 | Card information was hidden  | `styles.css` | Fixed- Remove overflow: hidden property |
| 4 | Retryable conflict response is present in the API contract   | `Bulk status handling`   | Left intentionally — the API documents it as retryable, but automatic retry was not required for this task |
| 5 | Search can fire a request for every keystroke | `App.tsx` | Fixed — Implemented debounced |
| 6 | Older search requests can remain in flight after the query changes | `Asset API / App.tsx` | Fixed — TanStack Query's signal is passed to fetch so obsolete requests can be aborted using signal. |
| 7 | Filter/sort state was not part of the API query | `App.tsx` | Fixed — query includes search, status, kind, tag and sort state where those controls are available |
| 8 | Asset grid renders the full loaded asset list without virtualization | `AssetGrid.tsx` | Fixed — implemented row-based virtualization using @tanstack/react-virtual, so only rows around the viewport are rendered |
| 9 | Selecting one card caused other visible cards to re-render  | `AssetCard.tsx / AssetGrid.tsx`  | Fixed — memoized AssetCard and kept selection callbacks stable so only the affected card re-renders   |
| 10 | Optimistic status changes were not implemented | `App.tsx` | Fixed — selected assets update immediately before the API responds |
| 11 | Optimistic updates could cause the entire asset list to be refreshed after the API response  | `Bulk status handling` | Fixed — the existing query cache is reconciled using the per-asset API results instead of invalidating and refetching the full list |
| 12 | Failed bulk updates need to restore only the affected assets | `Bulk status Handling, App.tsx` | Fixed — successful assets keep their server response while failed assets are rolled back to their previous state |
| 13 | Multi-selection needed to support selecting a continuous range efficiently | `AssetGrid.tsx / AssetCard.tsx` | Fixed — implemented Shift-click range selection and select-all for currently loaded assets |
| 14 | Shown/total asset counts could become incorrect after optimistic bulk status updates | `App.tsx/client.ts` | Fixed — The TanStack Query cache and filtered totals are reconciled immediately without requiring a full refetch |
| 15 | Selected assets could remain selected after their status filter was removed | `useAssetFilter.ts / App.tsx`  | Fixed — When a status filter is removed, selected assets belonging to that status are automatically removed from the selection |
| | | |


---

## Key decisions

For each significant choice: what you did, what you rejected, and why. Three to
six of these is about right.

**Selection model**

- Implemented Shift-click range selection so users can select a continuous range of assets without clicking every card individually.
- The selection logic uses the currently loaded asset order to determine the range between the previously selected asset and the clicked asset.
- Used a Set for selected IDs so checking, adding and removing selections remains efficient when selecting hundreds of assets.
- Added a way to select all currently loaded assets.
- Kept selection state in App.tsx so the grid remains responsible for presentation while the parent owns the selection state and bulk-action behaviour.

**Data fetching and caching**
- Used TanStack React Query for server state instead of storing fetched asset data entirely in local React state.
- Used query invalidation after bulk status updates so the server remains the source of truth.
- Kept UI-only state such as selected IDs and notices in local React state rather than introducing another global state layer.
- Kept the existing loaded pages in the React Query cache during bulk updates rather than invalidating and refetching the entire asset list after every operation.
- Rejected a full query refetch after a bulk update because it could rebuild the loaded result set while the user was browsing deep in the list and make them lose their current position/context.
- The server remains the source of truth by reconciling the existing cache with the per-asset results returned by the bulk API.

**Stale response handling**
- Passed TanStack Query's signal to the asset fetch so obsolete requests can be aborted when the query changes.
- Kept search, filter and sort values as part of the query so changing them produces the appropriate result set instead of allowing an older request to become the current data.
- Used TanStack Query's query-key model to keep different search/filter/sort combinations isolated from each other

**Virtualization approach**
- Used @tanstack/react-virtual for row-based virtualization instead of rendering every loaded asset card.
- The number of columns is calculated dynamically from the available grid width rather than being hardcoded to a fixed number of cards per row.
- Kept card width and height in CSS instead of duplicating those layout rules in JavaScript.
- Used row measurement through TanStack Virtual so the virtualizer can account for the rendered row size.
- Added a small overscan value so rows just outside the viewport are available during scrolling.
- Kept the scroll container separate from selection and detail-panel state so selection changes and opening/closing the detail panel do not intentionally reset the scroll position.

**Optimistic updates and rollback**
- Bulk status changes are applied optimistically to the existing React Query cache so the UI updates immediately instead of waiting for the server response.
- The original state of the selected assets is captured before the optimistic update so failed assets can be restored.
- The API returns per-asset results, so successful assets are reconciled with the server-returned asset while failed assets are rolled back individually.
- Avoided invalidating the complete assets query after the response because doing so can replace the currently loaded result set and negatively affect a user who is browsing deep in a large list.
- When a status filter is active, the optimistic update also reapplies that filter. For example, changing a Draft asset to In Review immediately removes it from the Draft result rather than waiting for a refetch.

**Retry and backoff policy**

**State placement and URL sync**

---

## Performance

Fill in real measurements, not estimates. Say which machine and browser.

| Metric | Before | After | How measured |
| --- | --- | --- | --- |
| Rendered DOM nodes at 5,000 rows loaded | | | |
| Cards re-rendered when toggling one selection | 11 cards | 1 card | React DevTools Profiler |
| Longest task during sustained scroll | | | |
| Requests fired while typing a 6-character query | 6 | 1 | Browser Network panel |
| Production bundle, gzipped | | | |

What was the actual bottleneck, and how did you find it?

- The main rendering bottleneck was the asset card grid. Rendering the full loaded asset list means the amount of DOM and rendering work grows as more assets are loaded.
- To address this, the asset grid was changed to use row-based virtualization with @tanstack/react-virtual. The virtualizer renders only the rows around the current viewport while maintaining the overall scrollable height. This keeps the rendered portion of the grid bounded by the viewport instead of rendering every loaded asset.
- The number of columns is calculated from the available grid width, so the implementation does not rely on a hardcoded number of cards per row. Card dimensions remain controlled by CSS.
- I also used React.memo at the AssetCard boundary and a stable useCallback for selection. Profiling confirmed that changing one selection no longer causes all visible cards to re-render which improved the performance from 48 to 86.
- The 48 → 86 result is a Lighthouse performance score comparison and is not being used as a substitute for the DOM-node, React re-render, long-task, or bundle-size measurements above.
- I also verified that selecting a large number of assets {eg: >500} does not cause noticeable UI stutter because selection uses a Set and the grid remains virtualized.
- The optimistic bulk-status flow was also refined to avoid invalidating and refetching the entire asset query after a successful bulk operation. This is important for large lists because a full refetch can replace the loaded result set while the user is browsing deep in the list and make them lose their current context.
- Successful and failed bulk results are reconciled directly into the existing cached pages, so the user's loaded pages and scroll context are preserved instead of rebuilding the entire list.

---

## Accessibility

- Keyboard model you implemented, in one paragraph.
- How you tested it, including any screen reader.
- Known gaps.

---

## Interface decisions

Three or four sentences: what you were optimising for, and the decisions that
follow from it. Then briefly:
- Kept the existing overall MediaVault layout rather than introducing a new visual system
- Separated the filter UI into its own component without moving unrelated header/search logic.
- Kept bulk actions in a dedicated BulkAssetSelection so selection-related actions are visually separated from   filtering.
- Used existing CSS for card dimensions rather than introducing JavaScript-driven width/height calculations.
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
- I did not introduce Redux Toolkit or Zustand because the current state can be handled cleanly with TanStack Query and React state.
- I did not add optimistic bulk updates because partial per-item failures make rollback more complicated and the server response is the source of truth.

## Critique of the API

What you would change about the backend contract, and what it forced you to do in
the client that you would rather not have.

## Anything you would like us to look at
The main areas I would recommend reviewing are the virtualization approach and the card-level rendering optimization.

- The grid uses dynamic row-based virtualization while leaving card dimensions entirely to CSS. I also used React DevTools Profiler to verify that selection changes only re-render the affected card rather than the complete visible grid.

- I intentionally kept the overall architecture simple: TanStack Query handles server state, React handles local UI state, and feature-specific components/hooks handle the asset UI and data flow without introducing another global state library.

- For bulk status changes, the UI updates optimistically and then reconciles the existing React Query cache with the per-asset API response. Successful assets keep the server-returned version, failed assets are rolled back individually, and the full asset query is not invalidated. This was an intentional decision to avoid unnecessary list re-renders and to preserve the user's scroll position and loaded result context while working with a large dataset.

- I intentionally kept the overall architecture simple: TanStack Query handles server state, React handles local UI state, and feature-specific components/hooks handle the asset UI and data flow without introducing another global state library.

- Code I am particularly interested in discussing is the virtualization strategy and the optimistic bulk-status reconciliation, especially the trade-off between keeping the implementation simple and preserving cache, scroll, and partial-failure behaviour.

Code you are proud of, or a decision you are unsure about and want to discuss.
