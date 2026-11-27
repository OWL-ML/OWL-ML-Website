# How the site is hosted

The site is a folder of static files (`dist/`) produced by `npm run build`. It is published with
**GitHub Pages** by the workflow `.github/workflows/deploy-pages.yml`, which builds `main` and
uploads the result, on every merge to `main`. It can also be started by hand (Actions → Deploy to
GitHub Pages → Run workflow). It builds for the custom domain set in Settings → Pages, so
canonical links, the sitemap and share images always match the address the site is served at.
Changing that domain does not rebuild the site: run the workflow by hand once afterwards.

## Address and DNS

- Main address: `https://owl-ml.com`, set in `src/lib/site-url.ts` (canonical links, sitemap,
  share images) for local builds. A build can override it with the environment variable
  `SITE_URL`; the deploy workflow sets it to the Pages custom domain, and has a field to build for
  another address when started by hand.
- DNS for `owl-ml.com` is hosted at **Bluehost** (name servers `ns1/ns2.bluehost.com`), which also
  hosts the old WordPress site and the `@owl-ml.com` email (`mail.owl-ml.com`). Keep the Bluehost
  account: cancelling it would also take down the domain's DNS and email.
- `owl-ml.uni-bremen.de` belongs to the university; its DNS is managed by ZfN (Zentrum für Netze).
  It points to the Bluehost server; from the launch on, a redirect there sends it to `owl-ml.com`
  (step 3 below).
- GitHub Pages serves a site under one domain only. Every other address must redirect to it.
- Without a custom domain, GitHub would serve the site under a sub-path
  (`owl-ml.github.io/OWL-ML-Website/`), where its root-relative links do not work. Preview changes
  locally with `npm run dev`, and test on GitHub at a subdomain (step 1).

## Launch checklist

As of November 2026: GitHub's addresses for Pages are 185.199.108.153, 185.199.109.153,
185.199.110.153 and 185.199.111.153 (IPv6: 2606:50c0:8000::153, 2606:50c0:8001::153,
2606:50c0:8002::153, 2606:50c0:8003::153). Check GitHub's documentation ("Managing a custom
domain for your GitHub Pages site") before changing DNS, in case they change.

**1. Set up and test at `new.owl-ml.com`** (about an hour, plus waiting for DNS and the certificate)

- Create the public repository from the current files only (`git archive main | tar -x -C <new
  folder>`, one commit). Never make the old repository public: its history holds files that were
  removed on purpose.
- Repository settings: Pages → Source "GitHub Actions"; labels `content`, `demo` and `bug` (used
  by the issue forms); protect `main` (pull request and the passing `build` check required).
- Organisation settings → Pages → add and verify `owl-ml.com`. GitHub shows a TXT record to add
  at Bluehost. Verification stops anyone else from using the domain on GitHub.
- At Bluehost, add a CNAME `new` → `owl-ml.github.io`.
- Repository settings → Pages → custom domain `new.owl-ml.com`. Once the certificate is issued,
  tick **Enforce HTTPS**.
- Actions → Deploy to GitHub Pages → Run workflow (address field empty: it builds for the custom
  domain, `https://new.owl-ml.com`). Test there. From now on every merge updates the test copy.

**2. Switch `owl-ml.com` to GitHub Pages** (15 minutes, plus up to an hour until HTTPS works)

- At least 4 hours before (the longest TTL there was 4 hours): at Bluehost, lower the TTL of the
  `owl-ml.com` (A) and `www` (CNAME) records to 15 minutes, Bluehost's shortest, so the change
  spreads quickly. Point `webmail`, `cpanel` and `ftp`, which Bluehost created as CNAMEs to
  `owl-ml.com`, to `mail.owl-ml.com` instead, so they stay on the Bluehost server. Bluehost's name
  servers can take a while to agree: check with `dig <name> @ns1.bluehost.com` (and `ns2`), asking
  several times.
- Repository settings → Pages → custom domain `owl-ml.com`. Then run the deploy workflow by hand,
  address field empty: it now builds for `https://owl-ml.com`.
- At Bluehost: `owl-ml.com` A records → GitHub's four addresses (and AAAA → the IPv6 ones);
  `www` CNAME → `owl-ml.github.io` (GitHub redirects `www` to `owl-ml.com`). Leave the email
  records (MX, `mail`, the SPF TXT record) unchanged.
- Once the certificate is issued, tick **Enforce HTTPS**. Remove the `new` record.
- If something goes badly wrong: point the records back to Bluehost (162.241.219.107 in November
  2026); the old site returns within the TTL.

**3. Redirect `owl-ml.uni-bremen.de`** (10 minutes)

The address still reaches the Bluehost server. Replace the old WordPress site there with this
`.htaccess` (in the site's folder), which sends every request for `owl-ml.uni-bremen.de` to the
same path on `owl-ml.com`. The condition matters: for a while after step 2, some visitors still
reach Bluehost under `owl-ml.com` (old DNS answers), and a redirect to the same address would
loop.

```apache
RewriteEngine On
RewriteCond %{HTTP_HOST} ^owl-ml\.uni-bremen\.de$ [NC]
RewriteRule ^ https://owl-ml.com%{REQUEST_URI} [R=301,L]
```

Later, ZfN can make the redirect independent of Bluehost: point `owl-ml.uni-bremen.de` to a
university server that redirects it the same way.

## Moving the main address to `owl-ml.uni-bremen.de` later

Possible at any time; nothing in the site depends on the address except `src/lib/site-url.ts`
(for local builds) and the Pages custom domain (for the deployed site).

1. Ask ZfN for a CNAME `owl-ml.uni-bremen.de` → `owl-ml.github.io`, and for the TXT record that
   verifies the domain for the organisation (organisation settings → Pages). If `uni-bremen.de`
   has a CAA record, it must allow `letsencrypt.org`.
2. Change the address in `src/lib/site-url.ts` (one pull request).
3. Repository settings → Pages → custom domain `owl-ml.uni-bremen.de`, then run the deploy
   workflow by hand; tick **Enforce HTTPS** once the certificate is issued.
4. Redirect `owl-ml.com` and `www` to the new address, keeping the path: point them to the
   Bluehost server again, with the `.htaccess` above changed accordingly (condition
   `^(www\.)?owl-ml\.com$`, target `https://owl-ml.uni-bremen.de`).

Links shared in the meantime keep working through the redirect.

## Redirects

Old addresses from the WordPress site, and pages that moved, are listed in
`src/data/redirects.yml`. The build turns each entry into a small redirect page, which works on
any host. It also writes `.htaccess` rules, including patterns such as old `/wp-content/…` links
and addresses with a query (`/?p=123`); these only work on an Apache server, not on GitHub Pages.
Add single entries to `redirects.yml` for old links that matter.

## Privacy

The privacy statement (`/legal/`) names GitHub as the host and describes its server logs. It must be
updated, and approved again, if the site moves to another host.

## Moving to other hosting

Any host that serves static files works; nothing on the site needs a server. For university web
space (ZfN), deploy from GitHub Actions with rsync over SSH, using a deploy key stored as repository
secrets (host, user, path, key). Ask ZfN whether connections from GitHub's runners are allowed
through the university firewall. Apache then also applies the `.htaccess` redirects. Switch DNS
only once the new copy is complete, and keep the old host until the address works with HTTPS.
