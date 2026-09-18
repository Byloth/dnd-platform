# phb14-stub

A *stub* of the private `phb14` package (Player's Handbook 2014), kept in the
public repository so that the loader, the validator and the reference Monk
fixture can exercise the private-package path in CI.

It contains the structure of the Way of Shadow subclass only, and every text
is a placeholder written for this project. Nothing from the book is
reproduced, which is why the manifest says `redistributable: true` while
`visibility: private` exercises the visibility handling. The real package,
transcribed for personal use, lives in `content-private/phb14/` and is never
committed (see `docs/phase-0/06-private-packages.md`).
