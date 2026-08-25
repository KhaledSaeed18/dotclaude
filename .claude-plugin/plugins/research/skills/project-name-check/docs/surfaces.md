# Surfaces to check

Two groups: **universal** surfaces every software project should clear, and **ecosystem** surfaces picked by how the thing ships. Each entry gives the authoritative check first; fall back down the list only when the one above is unavailable.

Read every check by status: `404` / `E404` / `NXDOMAIN` means free, `200` means taken. Where a check needs a browser or a login, mark the surface **unverified** rather than guessing.

Follow redirects on every HTTP lookup: `rdap.org` answers `302` and redirects to the authoritative registry, so an unfollowed request reads as neither taken nor free. Use `curl -sL -o /dev/null -w '%{http_code}'`, never a bare request.

## Universal

| Surface | Authoritative check | Notes |
| ------- | ------------------- | ----- |
| Domain `.com` | `https://rdap.org/domain/<name>.com` (404 = unregistered) | `whois <name>.com` as fallback. DNS not resolving proves nothing; parked and for-sale both mean registered. |
| Domain `.dev` / `.io` / `.app` / `.sh` | Same RDAP path per TLD | `.io` and `.ai` are pricey; `.dev` and `.app` force HTTPS. Check the ccTLD of the target market too. |
| GitHub user/org handle | `https://api.github.com/users/<name>` (404 = free) | The org handle usually matters more than any single repo name. |
| GitHub project collisions | `https://github.com/search?q=<name>&type=repositories&s=stars` | Sort by stars. A big archived repo still owns the name in practice. |
| Web search | Bare name, plus name + category word ("<name> cli", "<name> app") | Judges findability and surfaces competitors no registry knows about. |
| Social handle | `https://x.com/<name>`, `https://www.reddit.com/r/<name>` | Only for public-facing products. Often the first surface to run out. |

## Trademark signals

Not a clearance search, and not legal advice. Report hits and links; recommend a lawyer for anything close.

| Register | Where | Classes that matter |
| -------- | ----- | ------------------- |
| US (USPTO) | `https://tmsearch.uspto.gov` | 9 (software), 42 (SaaS), 38 (comms) |
| EU (EUIPO) | `https://www.tmdn.org/tmview/` | same |
| WIPO global | `https://branddb.wipo.int` | same |

## Ecosystem

Pick by distribution channel. Several can apply to one project.

### JavaScript / TypeScript

| Surface | Check |
| ------- | ----- |
| npm | `npm view <name>` (`E404` = free), or `https://registry.npmjs.org/<name>` |
| npm scope | `https://registry.npmjs.org/-/org/<scope>` , or check `@<scope>/*` packages |
| JSR | `https://jsr.io/@<scope>/<name>` |
| VS Code Marketplace | `https://marketplace.visualstudio.com/search?term=<name>&target=VSCode` |

### Python

| Surface | Check |
| ------- | ----- |
| PyPI | `https://pypi.org/pypi/<name>/json` (404 = free) |
| conda-forge | `https://anaconda.org/conda-forge/<name>` |

Note PyPI normalization: `foo_bar`, `foo-bar`, and `Foo.Bar` are the same name.

### Rust / Go / JVM / Ruby / PHP / .NET

| Surface | Check |
| ------- | ----- |
| crates.io | `https://crates.io/api/v1/crates/<name>` |
| Go modules | `https://pkg.go.dev/<module-path>` (name lives in the repo path) |
| Maven Central | `https://search.maven.org/solrsearch/select?q=a:<name>` |
| RubyGems | `https://rubygems.org/api/v1/gems/<name>.json` |
| Packagist | `https://repo.packagist.org/p2/<vendor>/<name>.json` |
| NuGet | `https://api.nuget.org/v3-flatcontainer/<name>/index.json` |

### CLI tools and containers

| Surface | Check |
| ------- | ----- |
| Homebrew formula/cask | `brew info <name>`, or `https://formulae.brew.sh/api/formula/<name>.json` |
| Docker Hub | `https://hub.docker.com/v2/repositories/library/<name>` and `.../<user>/<name>` |
| Shell command collision | `command -v <name>` locally, plus a search for `<name> command` — colliding with a coreutils or a popular binary is a hard no |
| Debian/Ubuntu package | `https://packages.debian.org/search?keywords=<name>` |
| AUR | `https://aur.archlinux.org/rpc/v2/info?arg[]=<name>` |

### Apps

| Surface | Check |
| ------- | ----- |
| Apple App Store / Mac App Store | `https://itunes.apple.com/search?term=<name>&entity=software&limit=10` (also `macSoftware`) |
| Google Play | `https://play.google.com/store/search?q=<name>&c=apps` |
| Chrome Web Store | `https://chromewebstore.google.com/search/<name>` |
| Firefox add-ons | `https://addons.mozilla.org/api/v5/addons/search/?q=<name>` |
| Microsoft Store | `https://apps.microsoft.com/search?query=<name>` |

App store *display names* are not unique the way registry names are, so the verdict here is about confusion with an existing app, not a hard block. Bundle identifiers are the unique key, and they are yours to pick under a domain you control.

### Hosted products and platforms

| Surface | Check |
| ------- | ----- |
| Product listings | `https://www.producthunt.com/search?q=<name>` |
| Company/product name in use | Web search for `<name>` plus the category, and for `<name>` plus "raises" or "acquired" |
| Claude Code / MCP / plugin registries | Search the relevant registry when shipping into an agent ecosystem |
