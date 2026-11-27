# Hero figure: the network loop

`owlml_network_loop.py` is the lab's script for the animated figure "Machine learning that keeps
learning" (open-world dot field → network that grows and shrinks → uncertain predictions). It
writes GIFs and stills for slides.

The website draws the same figure in the browser: `src/components/home/network-loop.ts` is a
line-by-line port (same seed, layout, timing and drawing order), on the dark hero panel. Its colours
are those in `brand-dark.json`, taken from `src/styles/tokens.css`. To render the website version
with the script, e.g. for a slide:

```bash
python3 owlml_network_loop.py hero.gif --no-labels --brand brand-dark.json
```

If the script changes, port the change to `network-loop.ts`; `tests/network-loop.test.mjs` checks
the size, the seamless loop and the colours.
