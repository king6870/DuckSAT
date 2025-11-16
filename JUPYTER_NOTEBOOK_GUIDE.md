# DuckSAT Question Generation - Jupyter Notebook Guide

## Overview

This guide explains how to use the `question_generation.ipynb` Jupyter notebook for generating SAT questions. The notebook provides a step-by-step, interactive workflow that makes it easy to track progress, identify errors, and understand each stage of the question generation process.

## Why Use the Jupyter Notebook?

The Jupyter notebook offers several advantages:

1. **Step-by-Step Execution**: Each step is isolated in its own cell, making it easy to run one step at a time
2. **Error Visibility**: Errors are clearly displayed in the cell output, making debugging straightforward
3. **Progress Tracking**: See real-time progress as questions are generated
4. **Interactive Results**: View results with collapsible JSON displays and formatted output
5. **Reproducibility**: Re-run any step without starting over
6. **Web-Based**: Works in any browser, including JupyterLab, Jupyter Notebook, VS Code, or cloud platforms

## Prerequisites

### 1. Install Jupyter

If you haven't already installed Jupyter:

```bash
# Using pip
pip install jupyter notebook

# Or using conda
conda install jupyter notebook
```

### 2. Install Required Python Packages

The notebook requires these Python packages:

```bash
pip install requests python-dotenv
```

### 3. Start the DuckSAT Server

The notebook connects to the DuckSAT API, so the server must be running:

```bash
npm run dev
```

The server should be running at `http://localhost:3000` (default).

## Getting Started

### Option 1: Local Jupyter Notebook

1. **Open the notebook**:
   ```bash
   cd /path/to/DuckSAT
   jupyter notebook question_generation.ipynb
   ```

2. This will open your browser with the Jupyter interface

3. Run cells one by one by clicking on a cell and pressing `Shift + Enter`

### Option 2: JupyterLab

1. **Start JupyterLab**:
   ```bash
   cd /path/to/DuckSAT
   jupyter lab
   ```

2. Navigate to `question_generation.ipynb` in the file browser

3. Execute cells sequentially

### Option 3: VS Code

1. Open the DuckSAT project in VS Code

2. Install the Jupyter extension if not already installed

3. Open `question_generation.ipynb`

4. Click "Run All" or run cells individually

### Option 4: Google Colab / Cloud Platforms

1. Upload `question_generation.ipynb` to Google Colab or your cloud platform

2. **Note**: You'll need to ensure the DuckSAT server is accessible from the cloud environment

3. Update the `BASE_URL` configuration to point to your server

## Configuration

### Environment Variables

The notebook can read configuration from environment variables or you can set them directly in the notebook:

- `BASE_URL` - Server URL (default: `http://localhost:3000`)
- `ADMIN_API_KEY` - Admin API key for authentication (optional)
- `QUESTION_COUNT` - Number of questions per batch (default: `10`)
- `BATCH_SIZE` - Questions per request (default: `5`)
- `BATCH_COUNT` - Number of batches (default: `1`)
- `DELAY_BETWEEN_BATCHES` - Milliseconds between batches (default: `15000`)
- `MODULE_TYPE` - Type of questions: `math`, `reading-writing`, or both (default: both)
- `DIFFICULTY` - Difficulty level: `easy`, `medium`, `hard`, or all (default: all)
- `TEMPERATURE` - AI temperature (default: `0.7`)
- `MAX_TOKENS` - Maximum tokens for generation (default: `4000`)
- `INCLUDE_CHARTS` - Include charts in math questions (default: `true`)
- `INCLUDE_PASSAGES` - Include passages in reading questions (default: `true`)

### Setting Configuration

You can configure the generation in multiple ways:

#### Method 1: Environment Variables (Recommended)

Create a `.env` file in the DuckSAT root directory:

```bash
BASE_URL=http://localhost:3000
ADMIN_API_KEY=your-api-key-here
QUESTION_COUNT=10
MODULE_TYPE=math
DIFFICULTY=medium
```

#### Method 2: Direct Modification

Edit the configuration cell in the notebook (Step 2) and change values directly:

```python
config = {
    'base_url': 'http://localhost:3000',
    'question_count': 20,
    'module_type': 'math',
    'difficulty': 'hard',
    # ... other settings
}
```

## Notebook Structure

The notebook is organized into 13 distinct steps:

### Step 1: Setup & Configuration
- Imports required libraries
- Loads environment variables

### Step 2: Configuration Parameters
- Sets all generation parameters
- Displays current configuration

### Step 3: Environment Validation
- Validates configuration values
- Shows errors if any parameters are invalid

### Step 4: Server Connection Test
- Tests connection to DuckSAT server
- Verifies authentication

### Step 5: Define Generation Functions
- Sets up helper functions for generation
- Implements retry logic

### Step 6: Initialize Statistics Tracking
- Creates data structures for tracking progress

### Step 7: Generate Questions - Main Loop
- **This is where the actual generation happens**
- Shows real-time progress for each batch
- Displays success/failure status

### Step 8: Display Final Summary
- Shows comprehensive statistics
- Calculates acceptance and storage rates

### Step 9: Display Errors
- Lists any errors encountered

### Step 10: Display Warnings
- Shows questions that need manual review

### Step 11: Display Batch Details
- Detailed results for each batch

### Step 12: Visualize Results
- Interactive JSON display of all results

### Step 13: Final Status
- Overall success/failure status
- Links to view generated questions

## Running the Notebook

### Quick Start (Run All)

To run the entire workflow at once:

1. Make sure the server is running
2. In Jupyter: Click "Cell" → "Run All"
3. Watch the progress in each cell

### Step-by-Step Execution (Recommended)

For better control and error tracking:

1. Run cells one at a time using `Shift + Enter`
2. Review the output of each cell before proceeding
3. If an error occurs, fix the issue and re-run that cell

### Common Workflow

```
1. Run Steps 1-3 (Setup and validation)
   ↓
2. Run Step 4 (Test server connection)
   ↓
3. If connection fails, start server and re-run Step 4
   ↓
4. Run Steps 5-6 (Initialize functions and tracking)
   ↓
5. Run Step 7 (Main generation loop) - THIS TAKES TIME
   ↓
6. Run Steps 8-13 (View results and analysis)
```

## Understanding Output

### Success Indicators

- ✅ Green checkmarks indicate successful operations
- Numbers show counts (generated, accepted, stored)
- Duration shows how long each step took

### Warning Indicators

- ⚠️ Yellow warnings indicate issues that need attention
- Common warnings: Questions need review, partial failures

### Error Indicators

- ❌ Red X marks indicate failures
- Error messages explain what went wrong
- Retry logic attempts to recover from transient errors

### Progress Tracking

During generation (Step 7), you'll see:

```
=================================================================================
📦 Batch 1/3
=================================================================================

🔄 Generating 10 questions (Math: 5, Reading: 5)...

✅ Batch completed successfully!
   Generated: 10
   Evaluated: 10
   Accepted: 8
   Rejected: 2
   Stored: 8
   Needs Review: 0
   Duration: 45s
```

## Troubleshooting

### Server Connection Errors

**Problem**: `❌ Cannot connect to server`

**Solution**:
1. Start the server: `npm run dev`
2. Verify it's running at the correct URL
3. Re-run Step 4 to test connection

### Authentication Errors

**Problem**: `⚠️ Authentication required`

**Solution**:
1. Set `ADMIN_API_KEY` in your environment
2. Or log in to the web application first
3. Re-run from Step 4

### Generation Timeout

**Problem**: Generation takes too long or times out

**Solution**:
1. Reduce `QUESTION_COUNT` (try 5 instead of 10)
2. Reduce `BATCH_COUNT` (try 1 instead of 3)
3. Check server logs for issues

### Configuration Errors

**Problem**: `❌ Configuration errors`

**Solution**:
1. Check the error message in Step 3 output
2. Fix the invalid values
3. Re-run Steps 2 and 3

### Rate Limiting

**Problem**: API rate limit exceeded

**Solution**:
1. Increase `DELAY_BETWEEN_BATCHES` (try 30000ms = 30s)
2. Reduce `BATCH_COUNT`
3. Wait and try again later

## Best Practices

### 1. Start Small
- Begin with `QUESTION_COUNT=5` and `BATCH_COUNT=1`
- Verify everything works before scaling up

### 2. Review Configuration
- Always run Steps 1-3 to verify your configuration
- Check that parameters are what you expect

### 3. Monitor Progress
- Watch Step 7 output closely during generation
- Note any warnings or errors immediately

### 4. Save Results
- After successful generation, save the notebook (Ctrl+S)
- Results are preserved in the cell outputs

### 5. Incremental Execution
- Run steps one at a time initially
- Use "Run All" only after you're familiar with the workflow

## Advanced Usage

### Generating Specific Question Types

**Math questions only**:
```python
config['module_type'] = 'math'
config['question_count'] = 10
```

**Reading questions only**:
```python
config['module_type'] = 'reading-writing'
config['question_count'] = 10
```

**Specific difficulty**:
```python
config['difficulty'] = 'hard'
```

### Large Batch Generation

For generating many questions:

```python
config['question_count'] = 10
config['batch_count'] = 10  # 100 total questions
config['delay_between_batches'] = 30  # 30 seconds between batches
```

### Filtering by Topic

If you have specific topic/subtopic IDs:

```python
config['topic_id'] = 'your-topic-id'
config['subtopic_id'] = 'your-subtopic-id'
```

## Comparison with Command-Line Script

| Feature | Jupyter Notebook | `run-generation-enhanced.js` |
|---------|-----------------|------------------------------|
| Step-by-step execution | ✅ Yes | ❌ No |
| Visual progress | ✅ Rich formatting | ⚠️ Console only |
| Error visibility | ✅ In-cell display | ⚠️ Console output |
| Partial execution | ✅ Run any step | ❌ All or nothing |
| Interactive results | ✅ JSON viewer | ❌ Plain text |
| Re-run failed steps | ✅ Easy | ❌ Start over |
| Web-based | ✅ Yes | ❌ No |
| Configuration | ✅ In notebook or env | ⚠️ Env only |

## Web Viewing

The notebook is designed to work well in web-based Jupyter environments:

### JupyterHub / Cloud Platforms

1. Upload the notebook to your environment
2. Ensure the DuckSAT server is accessible
3. Update `BASE_URL` to your server address
4. Run cells as normal

### Sharing Results

You can share the notebook with results:

1. Run all cells to completion
2. Save the notebook (Ctrl+S)
3. Share the `.ipynb` file
4. Results are preserved in the file

### Viewing on GitHub

GitHub renders Jupyter notebooks automatically:

1. Push the notebook to your repository
2. View it on GitHub to see outputs
3. Others can download and run it

## Tips for Web Usage

1. **Connection Stability**: Ensure stable internet when using cloud platforms
2. **Save Frequently**: Save after each successful batch
3. **Timeout Settings**: Cloud platforms may have different timeouts
4. **Resource Limits**: Be aware of compute time limits on free tiers

## Next Steps

After generating questions:

1. **Review Questions**: Visit `http://localhost:3000/admin/questions`
2. **Check Flagged Questions**: Review any that need manual review
3. **Analyze Results**: Use the JSON output to understand patterns
4. **Adjust and Re-run**: Modify configuration and generate more

## Support

If you encounter issues:

1. Check the Troubleshooting section above
2. Review the error messages in cell outputs
3. Check the DuckSAT server logs
4. Refer to the main documentation

## Related Documentation

- `BATCH_GENERATION_GUIDE.md` - Command-line batch generation
- `AI_QUESTION_GENERATION.md` - AI generation system overview
- `ADMIN_QUESTION_GENERATION.md` - Web UI for generation
- `README.md` - Main project documentation
