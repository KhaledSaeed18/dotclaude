# Surfaces to check

Four groups: **core** surfaces every brand should clear, **social handles**, **channel** surfaces picked by how the business reaches customers, and **jurisdiction** surfaces picked by where it incorporates and trades.

Read every check by status: `404` / `NXDOMAIN` means free, `200` means taken. Where a check needs a login or trips a bot wall, mark the surface **unverified** and put the direct link in the report's "not checked" list so a human can close it in seconds.

## Core

| Surface | Authoritative check | Notes |
| ------- | ------------------- | ----- |
| Domain `.com` | `https://rdap.org/domain/<name>.com` (404 = unregistered) | `whois <name>.com` as fallback. Still the default a customer types, whatever else you buy. Parked or for-sale means registered. |
| Domain, market ccTLDs | Same RDAP path per TLD | `.co.uk`, `.de`, `.fr`, `.com.au`, `.ae`, `.eg` and so on, for every market that matters. Some ccTLDs restrict registration to local entities; note it when so. |
| Domain, category TLDs | Same RDAP path per TLD | `.co`, `.shop`, `.store`, `.studio`, `.agency`, `.io`, `.ai`. Treat as a fallback, not a substitute for the `.com`. |
| Cross-jurisdiction company search | `https://opencorporates.com/companies?q=<name>` | Fast first pass over many national registers at once. Confirm any hit in the national register itself. |
| Web search | Bare name, plus name + category, plus name + city or country | Finds the trading business no register or platform will show you. |
| Trademark signals | See the jurisdiction table below | Report class, status, owner, link. Signal scan, not a clearance search. |

## Social handles

Check the **same** handle across all of these, and score them as a set (see step 4 of the skill). Free-form display names are not unique on any of these; the handle in the URL is.

| Platform | Check | Notes |
| -------- | ----- | ----- |
| X | `https://x.com/<handle>` | Frequently login-walled; expect `unverified`. |
| Instagram | `https://www.instagram.com/<handle>/` | 404 = free. Login wall is common. |
| TikTok | `https://www.tiktok.com/@<handle>` | |
| Facebook page | `https://www.facebook.com/<handle>` | Page usernames are unique; page display names are not. |
| YouTube | `https://www.youtube.com/@<handle>` | |
| LinkedIn company | `https://www.linkedin.com/company/<handle>` | Almost always login-walled. |
| Bluesky | `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=<handle>.bsky.social` | Real public API, so an authoritative answer. |
| Reddit | `https://www.reddit.com/r/<name>/about.json` and `/user/<name>/about.json` | JSON endpoints answer without a login. Check the subreddit too if community matters. |
| Threads | `https://www.threads.net/@<handle>` | |
| Pinterest | `https://www.pinterest.com/<handle>/` | Matters for visual and retail brands. |
| Telegram | `https://t.me/<handle>` | |
| Twitch | `https://www.twitch.tv/<handle>` | |
| Snapchat | `https://www.snapchat.com/add/<handle>` | |
| GitHub org | `https://api.github.com/users/<name>` | Only for technical brands; see the `project-name-check` skill for the rest of that sweep. |

## Channel

Pick by how the business actually sells.

### Online store and marketplaces

| Surface | Check |
| ------- | ----- |
| Shopify store subdomain | `https://<name>.myshopify.com` (resolves = taken) |
| Etsy shop | `https://www.etsy.com/shop/<name>` |
| Amazon | Search the storefront for the name; Brand Registry itself is not publicly searchable, so treat this as a competitor check |
| eBay store | `https://www.ebay.com/str/<name>` |
| Squarespace / Wix subdomain | `https://<name>.squarespace.com`, `https://<user>.wixsite.com/<name>` |
| Big Cartel / Gumroad | `https://<name>.bigcartel.com`, `https://<name>.gumroad.com` |

### Creator, content, and services

| Surface | Check |
| ------- | ----- |
| Substack | `https://<name>.substack.com` |
| Patreon | `https://www.patreon.com/<name>` |
| Ko-fi | `https://ko-fi.com/<name>` |
| Linktree | `https://linktr.ee/<name>` |
| Medium publication | `https://medium.com/<name>` |

### Local and physical presence

| Surface | Check |
| ------- | ----- |
| Google Business Profile | Search Google Maps for the name plus the city; an existing listing in the same trade area is a hard collision |
| Yelp | `https://www.yelp.com/search?find_desc=<name>&find_loc=<city>` |
| Trustpilot | `https://www.trustpilot.com/review/<domain>` |
| Apple / Google Maps listings | Search each for name plus city |

### Funding and industry visibility

| Surface | Check |
| ------- | ----- |
| Crunchbase | `https://www.crunchbase.com/textsearch?q=<name>` |
| Product Hunt | `https://www.producthunt.com/search?q=<name>` |
| Press | Web search for `<name>` plus "raises", "acquired", "lawsuit" |

## Jurisdiction

Check the register of the country of incorporation, plus every market where the brand will trade under its own name. This list is a starting set, not a limit: find the official register for any jurisdiction not listed here.

### Company registers

| Jurisdiction | Register |
| ------------ | -------- |
| United States | The Secretary of State entity search of the state of formation, e.g. `https://icis.corp.delaware.gov/ecorp/entitysearch/namesearch.aspx`, `https://bizfileonline.sos.ca.gov/search/business` |
| United Kingdom | `https://find-and-update.company-information.service.gov.uk/search?q=<name>` |
| European Union | `https://e-justice.europa.eu/business-registers-search` , plus the national register (Handelsregister, Infogreffe, KVK, and so on) |
| Canada | `https://ised-isde.canada.ca/cc/lgcy/fdrlCrpSrch.html` |
| Australia | `https://connectonline.asic.gov.au` and `https://abr.business.gov.au` |
| India | `https://www.mca.gov.in/mcafoportal/companyLLPMasterData.do` |
| Singapore | `https://www.bizfile.gov.sg` |
| UAE | The emirate's economic department, e.g. Dubai DED trade-name search |
| Egypt | GAFI commercial register trade-name search |

### Trademark registers

Search the classes covering what the business sells, not just the identical wordmark. Common classes: 9 software goods, 25 apparel, 30 food, 35 retail and advertising, 41 education and entertainment, 42 SaaS and technical services, 43 restaurants and hospitality.

| Register | Where |
| -------- | ----- |
| United States (USPTO) | `https://tmsearch.uspto.gov` |
| European Union (EUIPO) | `https://www.tmdn.org/tmview/` |
| United Kingdom (IPO) | `https://trademarks.ipo.gov.uk/ipo-tmtext` |
| Global (WIPO) | `https://branddb.wipo.int` |

Report each hit with its class, live or dead status, owner, and link. Anything identical or close in a relevant class goes to a trademark attorney before money is spent on the brand.
