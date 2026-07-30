# TapTap 单日新增组合图 Design QA

- Source visual truth: `/var/folders/0h/486cy7ns6rq8tykhsnywhpyw0000gn/T/codex-clipboard-a8c1bf51-8fc8-4764-9297-8daceda19954.png`
- Implementation URL: `http://127.0.0.1:5177/#heartopia`
- Final desktop screenshot: `/Users/gucong/.codex/visualizations/2026/07/27/019fa1b6-be19-70f3-babe-3d51fc5d94ea/taptap-daily-bars/implementation-total-download-pass2.png`
- Final pinned-state screenshot: `/Users/gucong/.codex/visualizations/2026/07/27/019fa1b6-be19-70f3-babe-3d51fc5d94ea/taptap-daily-bars/implementation-total-download-pinned-pass2.png`
- Final mobile screenshot: `/Users/gucong/.codex/visualizations/2026/07/27/019fa1b6-be19-70f3-babe-3d51fc5d94ea/taptap-daily-bars/implementation-mobile-pass2.png`
- Viewports: desktop 1556 × 1000 CSS px; mobile 390 × 844 CSS px
- Source pixels: 3112 × 1044, normalized from a 2× desktop capture
- Implementation pixels: 1556 × 1000 at 1×; trend panel crop 1336 × 459
- State: Heartopia dashboard, 总下载 selected, latest daily snapshot selected

## Full-view comparison evidence

- Normalized component comparison: `/Users/gucong/.codex/visualizations/2026/07/27/019fa1b6-be19-70f3-babe-3d51fc5d94ea/taptap-daily-bars/comparison-desktop-pass2.png`

The implementation preserves the reference card’s header, metric tabs, three-column summary, teal cumulative line and area, axis rhythm, footer, spacing, typography, and restrained surface treatment. The requested daily additions are encoded as low-saturation blue-gray columns on an independent right axis, so they remain visually subordinate to the cumulative line.

## Focused region comparison evidence

A separate focused crop was not needed because the source visual truth is already the single TapTap trend component. The normalized comparison shows the entire component and its chart region at the same 1336 px width. The pinned-state screenshot separately verifies the tooltip, selected bar, selected line point, and guide line.

## Interaction and responsive checks

- PC 下载, 总下载, 关注数: daily columns and right axis render for count metrics.
- 近期评分: daily columns, right axis, and combination-chart legend are removed; the existing line-only treatment remains.
- Date selection: clicking 2026-07-24 updates the summary, cumulative point, daily column, guide, and tooltip together.
- Tooltip collision: the chart legend hides while a tooltip is visible and returns when the selection is released.
- Mobile: 390 px viewport has no horizontal overflow; tabs, summary, chart, footer, and columns remain inside the card.
- Accessibility: chart description now explains the line/column encoding; each date remains keyboard-focusable with its value and day-over-day change in the accessible name.
- Browser console errors: none.
- Static checks: `npm run check` passed.

## Comparison history

### Pass 1

- [P2] The pinned tooltip could overlap the in-chart legend around middle/right dates.
- Fix: added a legend visibility state tied to tooltip visibility.

### Pass 2

- The pinned 2026-07-24 state shows the tooltip without legend collision.
- The selected column and cumulative point stay synchronized.
- No actionable P0, P1, or P2 findings remain.

## Follow-up polish

- None required for the requested scope.

final result: passed
