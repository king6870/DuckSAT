# Batch Question Generation Guide

This guide explains how to use the enhanced batch generation script (`run-generation-enhanced.js`) for automated question generation.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- DuckSAT server running (locally or remotely)
- Admin access (either logged in session or API key)

### Basic Usage

```bash
# Generate 10 questions with default settings
node run-generation-enhanced.js

# Generate 30 questions across 3 batches
QUESTION_COUNT=10 BATCH_COUNT=3 node run-generation-enhanced.js
```

## Configuration

The script is configured entirely through environment variables. See `.env.generation.example` for all options.

### Essential Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Server URL |
| `ADMIN_API_KEY` | - | Optional API key for authentication |
| `QUESTION_COUNT` | `10` | Questions per batch (1-50) |
| `BATCH_COUNT` | `1` | Number of batches |

### Content Filters

| Variable | Options | Description |
|----------|---------|-------------|
| `MODULE_TYPE` | `math`, `reading-writing` | Filter by module |
| `DIFFICULTY` | `easy`, `medium`, `hard` | Filter by difficulty |
| `TOPIC_ID` | UUID | Specific topic |
| `SUBTOPIC_ID` | UUID | Specific subtopic |

### AI Settings

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `TEMPERATURE` | `0.7` | 0-2 | AI creativity level |
| `MAX_TOKENS` | `4000` | 1000-8000 | Response length |
| `INCLUDE_CHARTS` | `true` | boolean | Include charts for math |
| `INCLUDE_PASSAGES` | `true` | boolean | Include reading passages |

### Reliability Settings

| Variable | Default | Description |
|----------|---------|-------------|
| `RETRY_ATTEMPTS` | `3` | Retries on failure |
| `RETRY_DELAY` | `5000` | Milliseconds between retries |
| `DELAY_BETWEEN_BATCHES` | `15000` | Milliseconds between batches |

## Use Cases

### Local Development

```bash
# Start dev server first
npm run dev

# In another terminal, run generation
node run-generation-enhanced.js
```

### Generate Math Questions Only

```bash
MODULE_TYPE=math \
QUESTION_COUNT=20 \
DIFFICULTY=hard \
BATCH_COUNT=2 \
node run-generation-enhanced.js
```

### Production/CI Pipeline

```bash
# Set environment variables
export BASE_URL=https://your-production-url.com
export ADMIN_API_KEY=your-secret-key
export QUESTION_COUNT=50
export BATCH_COUNT=10
export DELAY_BETWEEN_BATCHES=20000

# Run generation
node run-generation-enhanced.js
```

### Generate for Specific Subtopic

```bash
# Get subtopic ID from admin dashboard first
SUBTOPIC_ID=clq7654321 \
QUESTION_COUNT=25 \
BATCH_COUNT=5 \
node run-generation-enhanced.js
```

## Authentication

### Session-Based (Default)
1. Start dev server: `npm run dev`
2. Log in to admin account in browser
3. Run script in same environment

### API Key (Recommended for Automation)
1. Add API keys to `.env`:
   ```
   ADMIN_API_KEYS=key1,key2,key3
   ```
2. Set key in environment:
   ```bash
   ADMIN_API_KEY=key1 node run-generation-enhanced.js
   ```

## Output & Monitoring

The script provides detailed output:

### During Execution
- Configuration summary
- Server connection status
- Per-batch progress
- Real-time statistics

### Final Summary
- Total batches (successful/failed)
- Questions generated/accepted/rejected/stored
- Acceptance rate
- Storage success rate
- Total duration
- Average time per question
- Errors and warnings

### Example Output

```
🚀 Starting enhanced batch question generation...

📋 Configuration:
   Base URL: http://localhost:3000
   Question Count: 10 per batch
   Batch Count: 3
   ...

✅ Server is running and accessible

================================================================================
📦 Batch 1/3
================================================================================

🔄 Generating 10 questions (Math: 5, Reading: 5)...

✅ Batch completed successfully!
   Generated: 10
   Evaluated: 10
   Accepted: 8
   Rejected: 2
   Stored: 8
   Needs Review: 1
   Duration: 45s

⏳ Waiting 15s before next batch...

...

================================================================================
🎉 BATCH GENERATION COMPLETE!
================================================================================

📊 Final Statistics:
   Total Batches: 3
   Successful: 3 ✅
   Failed: 0 ❌

   Questions Generated: 30
   Questions Accepted: 24
   Questions Stored: 24
   Questions Needing Review: 3

   Acceptance Rate: 80.0%
   Storage Success Rate: 100.0%

   Total Duration: 3m 15s
   Average Time Per Stored Question: 8s

✅ Generation completed successfully
```

## Error Handling

### Automatic Retries
- Failed requests are automatically retried
- Configurable retry count and delay
- Exponential backoff recommended for production

### Common Errors

**"Cannot connect to server"**
- Server is not running
- Wrong BASE_URL
- Network/firewall issues

**"Authentication required"**
- Not logged in (session auth)
- Invalid API key
- API keys not configured in .env

**"Configuration errors"**
- Invalid parameter values
- Check error message for specifics

**HTTP 500 errors**
- Server-side issue
- Check server logs
- May be transient - retries will help

## Best Practices

### Development
- Start with small batches (5-10 questions)
- Use short delays (5-10 seconds)
- Monitor output for quality
- Test different configurations

### Production
- Use larger batches (20-50 questions)
- Add appropriate delays (15-30 seconds)
- Enable retry logic (3-5 attempts)
- Use API key authentication
- Run during off-peak hours
- Monitor logs and alerts

### Quality Assurance
- Review flagged questions regularly
- Track acceptance rates over time
- Adjust AI settings based on quality
- Use specific topic/subtopic filters
- Validate stored questions periodically

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Generate Questions

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  generate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Generate questions
        env:
          BASE_URL: ${{ secrets.PRODUCTION_URL }}
          ADMIN_API_KEY: ${{ secrets.ADMIN_API_KEY }}
          QUESTION_COUNT: 50
          BATCH_COUNT: 5
          DELAY_BETWEEN_BATCHES: 20000
        run: node run-generation-enhanced.js
```

## Troubleshooting

### Script won't start
```bash
# Check Node.js version (must be 18+)
node --version

# Verify syntax
node --check run-generation-enhanced.js

# Check dependencies
npm install
```

### Low acceptance rates
- Adjust `TEMPERATURE` (try 0.5-0.9)
- Increase `MAX_TOKENS` if responses seem cut off
- Check server logs for evaluation issues
- Verify topic/subtopic filters are correct

### Slow performance
- Increase `DELAY_BETWEEN_BATCHES`
- Reduce `QUESTION_COUNT` per batch
- Check server resources
- Verify network latency

### Authentication failures
- For session: Ensure you're logged in
- For API key: Verify key is valid and configured
- Check ADMIN_EMAILS in middleware
- Review server logs for auth errors

## Support

For issues:
1. Check this guide
2. Review `ADMIN_QUESTION_GENERATION.md`
3. Check server logs
4. File an issue on GitHub

## Related Documentation

- `ADMIN_QUESTION_GENERATION.md` - Full admin generation guide
- `.env.generation.example` - Configuration template
- API documentation for `/api/admin/enhanced-generate-questions`
- API documentation for `/api/admin/batch-adapter`
