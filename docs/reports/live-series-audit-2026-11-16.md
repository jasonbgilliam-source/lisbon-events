# Live listing dry run — November 16, 2026

Read-only public audit of https://lisbon-events-psi.vercel.app/. No database writes, migrations, deployment, or environment publication were performed. Organizer/ticket verification remains incomplete because the proxy blocks the linked source hosts.

## Coverage and evidence

| Public read | Result |
| --- | --- |
| `/api/events/list/?limit=2000` | HTTP 200; 18 upcoming database records, below requested limit |
| `/events.csv` | HTTP 200; 698 CSV records, including historical records |
| `/api/events/combined/?from=2025-12-01&to=2027-01-01` | HTTP 200; 17,340 calendar entries, all labeled `source: csv`, representing 632 distinct slugs |
| Exact title `Life in Lisboa` | No records, including the historical exact-match API query |
| Exact title `Quiz Knights` | No records, including the historical exact-match API query |
| Exact venue `Selva` | No records, including the historical exact-match API query |
| Calendar and CSV search for Life in Lisboa, Selva, Quiz Knights | No matching titles |
| Linked Visit Lisboa / AgendaLX sources | Proxy rejected CONNECT with HTTP 403 |

The date range is a bounded calendar audit, not a full private database export. Exact-title and venue queries do not establish the absence of spelling variants or records hidden by other API restrictions. These observations cannot verify the requested Selva December 12/19 times or the Quiz Knights venue schedules. No year, time or recurrence has been inferred for those examples.

The JSON reports include capture timestamps, public source URLs and SHA-256 hashes of the downloaded inputs. `csv:<slug>` identifiers identify CSV rows, **not database UUIDs**.

## Proposed grouping, pending source verification

| Listing / venue | Records that would share one listing | Schedule information preserved |
| --- | --- | --- |
| Anna Maria Maiolino / MAAT - Museu de Arte, Arquitetura e Tecnologia / Lisboa | `anna-maria-maiolino` and `anna-maria-maiolino-2` (public CSV slugs) | Both carry March 25–August 31, 2026. Preserve that observed date-only run once; no confirmed clock time is available. Do not convert it to midnight showtimes or infer daily performances. |

Both Anna records point to the general AgendaLX events API, not an event-specific organizer/ticket page. The grouping matches title, venue, city and dates, but remains a proposal until the source and exhibit schedule are checked. No data consolidation command has been executed.

See [CSV proposal and all original schedule fields](live-csv-series-2026-11-16.json).

## Database records requiring manual investigation

Four upcoming records share the title `This is Michael`, start `2026-11-20T00:00:00+00:00`, and a missing venue:

| Database ID | Slug |
| --- | --- |
| `bd89d259-0971-46ba-80c3-c8518b0bf280` | `camoes-epic-lyrical-universal` |
| `4fe8d40b-0289-4ddd-9efa-05cd45fac272` | `this-is-michael` |
| `ea58ab08-6083-4bbd-9176-89a498541cf4` | `tide-line-cam-s-collection` |
| `259a2943-791e-4a77-b139-5c7e4252aec8` | `ah-amalia-living-experience` |

All point to the general Visit Lisboa events page. The inconsistent slugs may indicate incorrect attribution rather than four genuine performances. **Do not merge these automatically.** The title, venue, date, actual start time and original event identities must be checked against event-specific sources. The recorded midnight timestamp is unverified, not a confirmed performance time.

See [database candidate report](live-upcoming-series-2026-11-16.json).

## Additional CSV clusters requiring venue/source review

The report flags 12 repeated title clusters with at least one missing venue: Avenida 211; Ana, Carolina e Adelaide: ainda estamos aqui; Concerto delle donne; Movie Experiments, Los Angeles; Suede; Festival Criasons; In the Heights; Evita; Scorpions; Belle and Sebastian; ModaLisboa - Lisboa Fashion Week'26; and James Taylor Quartet. Each cluster contains two records. The JSON preserves each slug, venue, source URL, start and end; none are automatic grouping proposals.

These may include separate venues, editions, runs, or incorrectly labeled records. A common title alone is insufficient evidence to group them.

## Next actions

Allow `www.visitlisboa.com` and `www.agendalx.pt` for source inspection. Obtain the organizer/ticket URLs or the correct preview/snapshot containing Life in Lisboa and Quiz Knights. Follow event-specific organizer/ticket links and retain the confirmed starts individually, including distinct same-day performances. Only then finalize a live consolidation proposal. Changing live data or deploying still requires explicit user approval.
