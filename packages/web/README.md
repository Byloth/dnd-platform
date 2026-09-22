# @byloth/dnd-platform-web

The web application of the platform (docs/phase-1/01-web-application.md): Nuxt 4, client-rendered, generated as static
files and published on GitHub Pages. Everything runs in the browser; the SRD ships with the site, every other package
is loaded by the user.

From the repository root, after `pnpm build` (the workspace packages are consumed from their `dist`):

```sh
pnpm web:prepare-content     # public/content/: the SRD bundle and the sample character (git-ignored)
pnpm web:dev                 # development server
pnpm web:generate            # static site in packages/web/.output/public/
pnpm web:preview             # serve the generated site
pnpm web:lint && pnpm web:typecheck && pnpm web:test
```

The site path is `NUXT_APP_BASE_URL` (default `/dnd-platform/`, the repository name: https://byloth.github.io/dnd-platform/).
