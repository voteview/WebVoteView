# WebVoteView

This is the source repository for WebVoteView, hosted at https://voteview.com and operated by UCLA Political Science. The site allows users to visualize congressional roll-call votes throughout history as well as classify legislators ideologically using the NOMINATE process. We are also a data clearinghouse for legislator ideology scores. 

Our site backend is NGINX, uWSGI, Python (Bottle), and MongoDB, and our frontend uses JQuery, D3, DC.js, Bootstrap, and other dependencies. For more information on our stack, please check the [Wiki](https://github.com/JeffreyBLewis/WebVoteView/wiki). We develop in the dev branch and deploy stable deployments to master.

We welcome external contributions; please open an issue if you find a bug or would like to contribute code, and direct all pull requests towards dev rather than master.

For more information or to contact us directly check the [About](https://voteview.com/about) page of our site.

## May 2026: major code revision

WebVoteView received a substantial overhaul in May 2026 that consolidated several long-running development branches and brought the codebase up to date on language runtime, dependencies, and accessibility. The site's data model and URL surface are unchanged; users should see no behavior change beyond the new features and accessibility improvements listed below.

| Area | Change |
|---|---|
| Runtime | Migrated from Python 2 to Python 3.11+ |
| Code layout | Renamed `model/` files from camelCase to snake_case (`bioData.py` → `bio_data.py`, etc.); split monolithic `searchVotes.py` into `search_votes.py` + `query_parser.py` |
| Database | MongoDB driver upgraded to pymongo 4.x; added connection pooling |
| Vote display | New superscript marks (`p`, `a`, `*`) on vote tables and member-vote pages flag paired, announced, and presidential entries, with hover tooltips explaining why each doesn't count toward the total |
| Committee pages | New committee overview and per-committee pages, including roster, party composition, and stacked DC.js charts |
| Person page | Member-votes table now uses server-side sort with paginated requests; improved "Subsequently / Previously served" rendering for members with multiple ICPSRs; career-vote totals shown on bio |
| Search | Wikipedia added as a key-vote source; presidents now appear correctly across multiple roles (House / Senate / President) in member search results |
| Accessibility | Site-wide WCAG 2.1 AA pass: visible focus states, semantic buttons instead of clickable spans, ARIA labels on icon controls, skip-to-content link, hidden labels for slider inputs |
| Security | Upgraded vulnerable transitive dependencies: bottle 0.13.4, urllib3 2.7.0, requests 2.34.2, certifi 2026.4.22, pymongo 4.17.0, uWSGI 2.0.31, idna 3.15, dnspython 2.8.0 |

The change set spans the merged PRs #427–#442 (with #428 / #429 / #430 carrying the bulk of the migration work).
