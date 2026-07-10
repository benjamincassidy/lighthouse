# Vendored Typst assets

Bundled locally so PDF export via WASM Typst (see `src/core/tools/TypstRunner.ts`) never
needs a runtime network call — both the `cmarker` package and default font are hard
requirements for compilation to succeed at all, not optional extras.

## `cmarker/`

The `@preview/cmarker:0.1.8` Typst package (CommonMark → Typst rendering), used by
`TypstRunner`'s compile shim exactly as it was with the native Typst CLI.

- Source: `https://packages.typst.org/preview/cmarker-0.1.8.tar.gz`
- License: MIT (see `cmarker/LICENSE`)
- To upgrade: download the new version's tarball from the same URL pattern
  (`https://packages.typst.org/preview/cmarker-<version>.tar.gz`), replace these files, and
  update the version pin in `TypstRunner.ts`'s shim template (`#import "@preview/cmarker:X.Y.Z"`).

## `fonts/`

Liberation Serif Regular — metric-compatible with Times New Roman, explicitly built for free
redistribution.

- Source: `https://github.com/liberationfonts/liberation-fonts/files/7261482/liberation-fonts-ttf-2.1.5.tar.gz`
- License: SIL Open Font License (see `fonts/LICENSE`)
- This is an interim default bundled with the plugin itself, not the full per-theme font
  system (see GitHub issue #79) — additional weights/styles or per-theme fonts should be
  added there, not here.
