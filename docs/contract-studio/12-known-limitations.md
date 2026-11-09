# 12. Known limitations

## Legal

- **Every template is unreviewed.** They are working drafts and have not been reviewed by a lawyer. See the open questions in [05](05-bulgarian-contract-templates.md).
- Official statute portals could not be read during research; several provisions were verified only through secondary publications. Each template's `sources` and clause notes say which.
- Nothing here guarantees enforceability, and exporting or printing is not signing.
- Tax and social-contribution treatment is not calculated. It is a separate matter from drafting.
- There is no field for EGN or national ID. Bulgarian contracts with individuals often identify them this way. Whether you need it, and how to hold it lawfully, is a question for your lawyer. Adding a field is a small change once decided.
- Check your employment contract with DXC (IP, exclusivity, outside work) before taking client work.

## Product

- One user and one replica; rate limits are in memory.
- The six template types can be edited per contract in the app. Changing a template itself means editing its JSON, bumping the version and redeploying.
- Payments are not tracked, so the dashboard shows no outstanding amounts.
- No electronic signature integration.
- The interface is in English; documents are Bulgarian or English.

## Documents

- DOCX files name the font Noto Serif but do not embed it. Word substitutes another font on machines without it, which can shift page breaks. PDFs embed the font.
- A DOCX is not byte-identical between runs.

## Operations

- Rate limits reset on restart.
- `15432` on this machine is used by the Zone tunnel, so Contract Studio's tunnel uses `15433`.
- `/data` documents and the database are backed up separately and may differ slightly in time.
- The repository is public. See the note in [10-testing-and-release.md](10-testing-and-release.md) before pushing this branch.
