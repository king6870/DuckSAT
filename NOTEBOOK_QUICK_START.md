# Quick Start: Question Generation Jupyter Notebook

## 🚀 Quick Setup (3 Steps)

### 1. Install Dependencies
```bash
pip install jupyter notebook requests python-dotenv
```

### 2. Start the Server
```bash
npm run dev
```

### 3. Open the Notebook
```bash
jupyter notebook question_generation.ipynb
```

## 📝 Basic Usage

### Running the Notebook

1. **In Jupyter**: Click each cell and press `Shift + Enter` to run
2. **Or**: Click "Cell" → "Run All" to run everything at once

### What You'll See

Each step shows clear status indicators:
- ✅ Success - Step completed without issues
- ⚠️ Warning - Minor issues or items needing attention
- ❌ Error - Something went wrong

Example output:
```
📋 Configuration:
   Base URL: http://localhost:3000
   Question Count: 10 per batch
   Module Type: Both
   
✅ Configuration loaded successfully

🔍 Testing server connection...
✅ Server is running and accessible

🚀 Starting question generation...

📦 Batch 1/1
✅ Batch completed successfully!
   Generated: 10
   Accepted: 8
   Stored: 8
   
🎉 BATCH GENERATION COMPLETE!
```

## ⚙️ Quick Configuration

### Option 1: Environment Variables (Recommended)

Create a `.env` file:
```bash
BASE_URL=http://localhost:3000
QUESTION_COUNT=10
MODULE_TYPE=math
DIFFICULTY=medium
```

### Option 2: Edit in Notebook

In Step 2, modify the config:
```python
config = {
    'question_count': 20,
    'module_type': 'math',  # 'math', 'reading-writing', or None for both
    'difficulty': 'hard',   # 'easy', 'medium', 'hard', or None for all
    # ... other settings
}
```

## 🎯 Common Use Cases

### Generate 10 Mixed Questions
```python
# Default settings - just run all cells
```

### Generate Math Questions Only
```python
config['module_type'] = 'math'
config['question_count'] = 10
```

### Generate Reading Questions Only
```python
config['module_type'] = 'reading-writing'
config['question_count'] = 10
```

### Generate Hard Difficulty Questions
```python
config['difficulty'] = 'hard'
config['question_count'] = 15
```

### Large Batch Generation (100 questions)
```python
config['question_count'] = 10
config['batch_count'] = 10
config['delay_between_batches'] = 30  # 30 seconds between batches
```

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| ❌ Cannot connect to server | Run `npm run dev` in project directory |
| ⚠️ Authentication required | Set `ADMIN_API_KEY` in .env or log in to admin |
| ⏱️ Generation timeout | Reduce `question_count` to 5 |
| 🔒 Rate limiting | Increase `delay_between_batches` to 30 |

## 📊 Understanding Results

### Statistics Shown
- **Generated**: Total questions created by AI
- **Evaluated**: Questions reviewed for quality
- **Accepted**: Questions that passed quality checks
- **Rejected**: Questions that didn't meet standards
- **Stored**: Questions saved to database
- **Needs Review**: Questions flagged for manual review

### Success Rates
- **Acceptance Rate**: (Accepted / Generated) × 100%
  - Good: > 70%
  - Typical: 60-80%
- **Storage Rate**: (Stored / Accepted) × 100%
  - Should be: ~100%

## 🎓 Step-by-Step Breakdown

| Step | Purpose | Time |
|------|---------|------|
| 1-2 | Setup and configuration | < 1s |
| 3 | Validate settings | < 1s |
| 4 | Test server connection | 1-2s |
| 5-6 | Initialize functions | < 1s |
| 7 | **Main generation** | 30-60s per batch |
| 8-13 | Display results | < 1s |

**Total Time**: ~1-2 minutes for 10 questions

## 💡 Pro Tips

1. **Start Small**: Begin with 5 questions to test setup
2. **Watch Step 7**: This is where most time is spent
3. **Save Often**: Use `Ctrl+S` after successful batches
4. **Check Errors**: Step 9 shows any problems
5. **Review Warnings**: Step 10 flags items needing attention
6. **Use JSON View**: Step 12 provides detailed results

## 🔗 Next Steps

- See `JUPYTER_NOTEBOOK_GUIDE.md` for detailed documentation
- See `BATCH_GENERATION_GUIDE.md` for command-line alternative
- See `AI_QUESTION_GENERATION.md` for system overview

## 📸 Example Output

Run `python3 test_notebook_example.py` to see a complete example of what the notebook displays.

## 🆘 Need Help?

1. Check the Troubleshooting section in `JUPYTER_NOTEBOOK_GUIDE.md`
2. Review error messages in Step 9 of the notebook
3. Verify server is running: `http://localhost:3000`
4. Check configuration in Step 2

## 🌐 Web Platforms

The notebook works on:
- Local Jupyter Notebook / JupyterLab
- VS Code (with Jupyter extension)
- Google Colab
- JupyterHub
- Any Jupyter-compatible platform

Just ensure the DuckSAT server is accessible from your environment.
