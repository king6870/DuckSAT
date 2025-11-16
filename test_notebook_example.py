#!/usr/bin/env python3
"""
Example output demonstration for the question_generation.ipynb notebook.
This shows what users will see when running the notebook.
"""

import json
from datetime import datetime

def print_section(title):
    """Print a formatted section header."""
    print(f"\n{'=' * 80}")
    print(f"{title}")
    print(f"{'=' * 80}\n")

def main():
    print("=" * 80)
    print("EXAMPLE OUTPUT FROM question_generation.ipynb")
    print("=" * 80)
    print()
    print("This demonstrates what the notebook displays when run successfully.")
    print()

    # Step 1: Setup
    print_section("Step 1: Setup & Configuration")
    print("✅ Loaded environment variables from .env file")
    print("✅ Libraries imported successfully")

    # Step 2: Configuration
    print_section("Step 2: Configuration Parameters")
    print("📋 Configuration:")
    print("   Base URL: http://localhost:3000")
    print("   Admin API Key: ***key1")
    print("   Question Count: 10 per batch")
    print("   Batch Size: 5 questions per request")
    print("   Batch Count: 1 batches")
    print("   Delay Between Batches: 15.0s")
    print("   Module Type: Both")
    print("   Difficulty: All")
    print("   Topic ID: Not specified")
    print("   Subtopic ID: Not specified")
    print("   Temperature: 0.7")
    print("   Max Tokens: 4000")
    print("   Include Charts: True")
    print("   Include Passages: True")
    print("   Retry Attempts: 3")
    print()
    print("✅ Configuration loaded successfully")

    # Step 3: Validation
    print_section("Step 3: Environment Validation")
    print("✅ Configuration validated successfully")

    # Step 4: Connection Test
    print_section("Step 4: Server Connection Test")
    print("🔍 Testing server connection...")
    print("✅ Server is running and accessible")
    print()
    print("✅ Ready to generate questions")

    # Step 5: Functions
    print_section("Step 5: Define Generation Functions")
    print("✅ Generation functions defined")

    # Step 6: Statistics
    print_section("Step 6: Initialize Statistics Tracking")
    print("✅ Statistics tracking initialized")
    print(f"   Start time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Step 7: Main Generation
    print_section("Step 7: Generate Questions - Main Loop")
    print("🚀 Starting question generation...\n")
    print("📊 Generation Plan:")
    print("   Total Questions: 10 per batch")
    print("   Math Questions: 5")
    print("   Reading Questions: 5")
    print("   Number of Batches: 1")
    print()
    print("=" * 80)
    print("📦 Batch 1/1")
    print("=" * 80)
    print()
    print("🔄 Generating 10 questions (Math: 5, Reading: 5)...")
    print()
    print("✅ Batch completed successfully!")
    print("   Generated: 10")
    print("   Evaluated: 10")
    print("   Accepted: 8")
    print("   Rejected: 2")
    print("   Stored: 8")
    print("   Needs Review: 0")
    print("   Duration: 45s")
    print()
    print()
    print("✅ Generation loop completed")

    # Step 8: Summary
    print_section("Step 8: Display Final Summary")
    print("=" * 80)
    print("🎉 BATCH GENERATION COMPLETE!")
    print("=" * 80)
    print()
    print("📊 Final Statistics:")
    print("   Total Batches: 1")
    print("   Successful: 1 ✅")
    print("   Failed: 0 ❌")
    print()
    print("   Questions Generated: 10")
    print("   Questions Evaluated: 10")
    print("   Questions Accepted: 8")
    print("   Questions Rejected: 2")
    print("   Questions Stored: 8")
    print("   Questions Needing Review: 0")
    print()
    print("   Acceptance Rate: 80.0%")
    print("   Storage Success Rate: 100.0%")
    print()
    print("   Total Duration: 45s")
    print("   Average Time Per Stored Question: 5s")
    print()

    # Step 9: Errors
    print_section("Step 9: Display Errors (if any)")
    print("✅ No errors encountered")

    # Step 10: Warnings
    print_section("Step 10: Display Warnings")
    print("✅ No questions need review")

    # Step 11: Batch Details
    print_section("Step 11: Display Batch Details")
    print()
    print("📦 Batch Details:")
    print()
    print("Batch 1:")
    print("   ✅ Success")
    print("   Generated: 10")
    print("   Accepted: 8")
    print("   Rejected: 2")
    print("   Stored: 8")
    print("   Duration: 45s")
    print()

    # Step 12: Interactive JSON
    print_section("Step 12: Visualize Results (Interactive)")
    print("[In the notebook, this displays an interactive JSON viewer]")
    print()
    example_data = {
        'configuration': {
            'base_url': 'http://localhost:3000',
            'question_count': 10,
            'batch_count': 1,
            'module_type': 'both',
            'difficulty': 'all',
        },
        'statistics': {
            'total_batches': 1,
            'successful_batches': 1,
            'failed_batches': 0,
            'total_generated': 10,
            'total_accepted': 8,
            'total_rejected': 2,
            'total_stored': 8,
            'total_needs_review': 0,
            'total_duration_seconds': 45.2,
        },
        'batches': [
            {
                'batch': 1,
                'success': True,
                'summary': {
                    'generated': 10,
                    'evaluated': 10,
                    'accepted': 8,
                    'rejected': 2,
                    'stored': 8,
                    'needsReview': 0
                },
                'duration': 45.2
            }
        ],
        'errors': []
    }
    print(json.dumps(example_data, indent=2))

    # Step 13: Final Status
    print_section("Step 13: Final Status")
    print("✅ Generation completed successfully!")
    print("   8 questions stored in database")
    print()
    print("View questions at: http://localhost:3000/admin/questions")

    print()
    print("=" * 80)
    print("END OF EXAMPLE OUTPUT")
    print("=" * 80)

if __name__ == '__main__':
    main()
