# Recurring example source verification — November 16, 2026

Life in Lisboa and Quiz Knights are verification/test examples supplied by the user. They have **not** been imported into the live site. Their absence from the earlier live audit is expected and is not a data defect. No preview or missing live snapshot is required.

## Evidence read

| Source | Observed dates and times (Europe/Lisbon) | Decision |
| --- | --- | --- |
| [Hapsy: Life in Lisboa](https://hapsy.co/e/life-in-lisboa-2) | December 12 and 19, **2026**. Structured/visible schedule: **20:30–22:30** on each date. Description: doors **20:30**, comedy starts **21:00**, ends **22:30**. Venue: Selva, Rua Luís de Camões 112 A. | Two candidate dates for one show listing. Do not treat doors-open and show-start as two performances. The clock-time conflict needs ticket confirmation before importing either as an authoritative showtime. |
| [Selva's official Linktree](https://linktr.ee/selvacomedycafe) | The currently visible Life in Lisboa link is for **November 14**, listed **20:30–22:30**, and points to Fienta. No December 12/19 Life in Lisboa links were visible. | Establishes the official ticket-link provenance for the November show; does not independently confirm December dates/times. |
| [Quiz Knights at LX Brewery](https://www.meetup.com/lisbon-retired-meetup-group/events/317255249/) | **November 21, 2026, 20:00–22:00**; `EventScheduled`; venue **LX Brewery - LX BEER**, Rua ilha terceira 42D, Lisbon. | Scheduled performance verified from organizer Meetup page and JSON-LD. New import would still require manual approval. |
| [Quiz Knights at Kossies](https://www.meetup.com/lisbon-retired-meetup-group/events/317144479/) | **November 15, 2026, 14:00–16:00**; visible “This event was canceled” and JSON-LD `https://schema.org/EventCancelled`; venue **Kossies café**, R. da Rosa 240, Lisboa. | Exclude this canceled session. Do not generate future sessions from its “Every 2 weeks” text. Other confirmed sessions at Kossies would have a different listing identity from LX Brewery. |

November/December timestamps in the Meetup/Hapsy structured data carry UTC or `+00:00`, consistent with Lisbon's winter offset. Meetup's visible page also prints “WEST”; the ISO timestamps and numeric local clock times are recorded explicitly, rather than relying on that inconsistent abbreviation.

## Ticket links followed, but blocked

- Selva → [Fienta November show](https://fienta.com/life-in-lisboa-a-cultural-comedy-show-212511): environment proxy rejected CONNECT with HTTP 403; no ticket contents were read.
- Hapsy “Get tickets” → [Eventbrite](https://www.eventbrite.com/e/life-in-lisboa-english-standup-comedy-tickets-1990568662454): environment proxy rejected CONNECT with HTTP 403; no ticket contents were read. Hapsy's “Original event source” also names a different Eventbrite ID, `2004320131468`, which must be checked rather than assuming both links identify the same performance.
- Selva → [official website](https://selvacomedycafe.com): environment proxy rejected CONNECT with HTTP 403.

Ticket confirmation is **incomplete**. In particular, 21:00 is the show start stated in Hapsy's description, not an independently verified December ticket start. No December showtime has been silently resolved, published or imported.

## Regression coverage and fix

The Kossies page reproduced a bug: the cancellation helper recognized plain `cancelled` strings but missed the Schema.org `eventStatus` URL. It now recognizes `EventCancelled`/`EventCanceled` in `eventStatus`, `event_status` and `status`, while preserving existing boolean/plain-string handling. Source normalization preserves this cancellation before CSV export. This prevents canceled sessions from becoming pending imports or public performances.

The minimized evidence fixture stores source URLs, capture time, page hashes, relevant event fields and the conflicting Hapsy schedule text. It does not store full pages, attendee information, tracking scripts or credentials.

- `node tests/workflow/source-evidence-check.mjs` checks the actual source timestamps/statuses, venue distinction, exclusion of the canceled Kossies event, cancellation through source normalization/export, and the unresolved doors/show conflict.
- `bash tests/workflow/run.sh` passed a production build and isolated PostgreSQL/PostgREST/browser workflows. Its added canceled-session case uses the exact Meetup status URL and venue, with a clearly synthetic year for repeatable future-date tests. Existing tests retain separate synthetic active venues; those are not claims that the canceled Kossies session is active.
- `node tests/workflow/report-check.mjs` passed the existing read-only report regression suite.

To finish December ticket verification, allow `fienta.com` and `www.eventbrite.com` in environment networking. No live data changes, production deployment or environment publication are authorized by these findings.
