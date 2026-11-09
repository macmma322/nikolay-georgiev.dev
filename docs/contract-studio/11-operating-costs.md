# 11. Operating costs

Estimates, not quotes. Rates are from Railway's pricing page and Anthropic's model overview on 2026-11-09.

## Railway

Your workspace is on the Pro plan ($20 per month, which includes $20 of usage). Rates: $20 per vCPU-month, $10 per GB-month of RAM, $0.15 per GB-month of volume, $0.05 per GB of egress. Usage is billed by actual consumption and shared with your other projects, so this may add to the bill if they already use the included amount.

| Item                    | Assumed use             | Monthly            |
| ----------------------- | ----------------------- | ------------------ |
| Contract Studio service | about 0.02 vCPU, 150 MB | about $1.90        |
| PostgreSQL              | about 0.02 vCPU, 150 MB | about $1.90        |
| Volumes (2 × 1 GB)      |                         | $0.30              |
| Backups                 | incremental, small      | under $0.20        |
| **Total**               |                         | **about $4 to $5** |

Measured figures will replace these after deployment: `railway metrics`.

## Claude

Default `claude-sonnet-5-5`: $2 input, $10 output per million tokens; cache reads cost 5% of input.

A typical turn is roughly 6,000 to 15,000 input tokens and 500 to 1,500 output tokens, which comes to about $0.02 to $0.05. Fifty turns a month is about $1 to $3. A hard stop applies at `CLAUDE_MONTHLY_BUDGET_USD` (default $25).

## Everything else

No charge in this design for the portfolio's proxying, DataGrip beyond your existing licence, or the Windows tunnel.
