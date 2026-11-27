"""Tokenise Alice's Adventures in Wonderland (Lewis Carroll, 1865, public domain) for the
next-word demo. Source: carroll-alice.txt from NLTK's Gutenberg corpus
(https://github.com/nltk/nltk_data, packages/corpora/gutenberg.zip).

usage: python3 make_alice_corpus.py gutenberg.zip > alice-tokens.txt

Output: one line of space-separated lower-case tokens; words keep inner hyphens and
apostrophes, and . , ! ? are separate tokens. Chapter headings and the title line are dropped."""
import re, sys, zipfile
text = zipfile.ZipFile(sys.argv[1]).read("gutenberg/carroll-alice.txt").decode("utf-8")
lines = [l for l in text.splitlines() if not l.startswith("[") and not re.match(r"^CHAPTER [IVXL]+\.", l)]
toks = re.findall(r"[a-z]+(?:[-'][a-z]+)*|[.,!?]", "\n".join(lines).lower())
sys.stdout.write(" ".join(toks))
