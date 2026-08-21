# Composer Files

Adds a document button and file drop target to the DeepSeek Harness composer.
Supported text-like files are read in the browser; PDFs are converted to text by
the local Harness host. The editor shows each document as a 64-pixel file tile
inside the same attachment rail used by native image thumbnails; mixed documents
and images share one row. Extracted content is serialized into the normal prompt
when the draft is submitted. Send, queue, and steering therefore keep using the
shipped conversation path without exposing transport markup in the editor.

## Limits

- Up to 8 files in one pick or drop
- Text files: 2 MiB each
- PDFs: 12 MiB each and 300 pages
- 180,000 extracted characters per file
- 240,000 attached characters per composer session

The plugin never renders uploaded text as HTML. Images keep using the Harness's
native image attachment control. PDF extraction uses the local `pdftotext`
binary from Poppler; the active Harness machine already provides it.
