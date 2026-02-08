#!/usr/bin/env python3
"""
Unit tests for blog post validation

Tests YAML frontmatter, markdown structure, and content validation
Usage: python3 tools/test_posts.py
"""

import re
import sys
from pathlib import Path

# ANSI colors
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
NC = '\033[0m'

class TestRunner:
    def __init__(self):
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0

    def pass_test(self, msg):
        self.tests_run += 1
        self.tests_passed += 1
        print(f"{GREEN}✓{NC} {msg}")

    def fail_test(self, msg, error):
        self.tests_run += 1
        self.tests_failed += 1
        print(f"{RED}✗{NC} {msg}")
        print(f"  {YELLOW}Error: {error}{NC}")

    def test_file(self, filepath):
        """Run all tests on a single file"""
        filename = filepath.name
        print(f"\nTesting: {filename}")
        print("=" * 50)

        try:
            content = filepath.read_text()
        except Exception as e:
            self.fail_test(f"{filename}: File readable", str(e))
            return

        self.test_filename_format(filename)
        self.test_frontmatter_exists(filename, content)
        self.test_required_fields(filename, content)
        self.test_date_format(filename, content)
        self.test_title_not_empty(filename, content)
        self.test_content_exists(filename, content)
        self.test_code_blocks_balanced(filename, content)
        self.test_headers_formatted(filename, content)

    def test_filename_format(self, filename):
        """Test: Filename matches YYYY-MM-DD-title.md format"""
        pattern = r'^\d{4}-\d{1,2}-\d{1,2}-.*\.md$'
        if re.match(pattern, filename):
            self.pass_test(f"{filename}: Filename format is valid")
        else:
            self.fail_test(f"{filename}: Filename format",
                          "Should follow pattern: YYYY-MM-DD-title.md")

    def test_frontmatter_exists(self, filename, content):
        """Test: YAML frontmatter exists"""
        count = content.count('\n---\n') + content.count('---\n', 0, 10)
        if count >= 2:
            self.pass_test(f"{filename}: Frontmatter exists")
        else:
            self.fail_test(f"{filename}: Frontmatter exists",
                          f"Missing or incomplete YAML frontmatter (found {count} delimiters)")

    def test_required_fields(self, filename, content):
        """Test: Required frontmatter fields present"""
        required = ['layout:', 'title:', 'date:', 'categories:', 'tags:']
        missing = [field for field in required if field not in content[:500]]

        if not missing:
            self.pass_test(f"{filename}: All required fields present")
        else:
            self.fail_test(f"{filename}: Required fields",
                          f"Missing: {', '.join(missing)}")

    def test_date_format(self, filename, content):
        """Test: Date format is valid (YYYY-MM-DD HH:MM:SS +ZZZZ)"""
        match = re.search(r'^date:\s*(.+)$', content, re.MULTILINE)
        if not match:
            self.fail_test(f"{filename}: Date format", "No date field found")
            return

        date_str = match.group(1).strip()
        pattern = r'^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$'
        if re.match(pattern, date_str):
            self.pass_test(f"{filename}: Date format is valid")
        else:
            self.fail_test(f"{filename}: Date format",
                          f"Invalid format: '{date_str}' (expected: YYYY-MM-DD HH:MM:SS +ZZZZ)")

    def test_title_not_empty(self, filename, content):
        """Test: Title is not empty"""
        match = re.search(r'^title:\s*(.+)$', content, re.MULTILINE)
        if match and match.group(1).strip().strip('"\''):
            self.pass_test(f"{filename}: Title is not empty")
        else:
            self.fail_test(f"{filename}: Title", "Title is empty or missing")

    def test_content_exists(self, filename, content):
        """Test: Post has content beyond frontmatter"""
        lines = content.split('\n')
        if len(lines) > 10:
            self.pass_test(f"{filename}: Post content exists")
        else:
            self.fail_test(f"{filename}: Post content",
                          f"File too short ({len(lines)} lines)")

    def test_code_blocks_balanced(self, filename, content):
        """Test: Code blocks are properly closed"""
        fence_count = len(re.findall(r'^```', content, re.MULTILINE))
        if fence_count % 2 == 0:
            self.pass_test(f"{filename}: Code blocks are balanced")
        else:
            self.fail_test(f"{filename}: Code blocks",
                          f"Unmatched code fence markers (found {fence_count})")

    def test_headers_formatted(self, filename, content):
        """Test: Headers have space after #"""
        invalid = re.findall(r'^#{1,6}[^# \n]', content, re.MULTILINE)
        if not invalid:
            self.pass_test(f"{filename}: Headers formatted correctly")
        else:
            self.fail_test(f"{filename}: Headers",
                          f"Found {len(invalid)} headers without space after #")

    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 50)
        print("Test Summary")
        print("=" * 50)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {GREEN}{self.tests_passed}{NC}")
        if self.tests_failed > 0:
            print(f"Tests failed: {RED}{self.tests_failed}{NC}\n")
            return 1
        else:
            print(f"Tests failed: {GREEN}0{NC}\n")
            print(f"{GREEN}All tests passed!{NC}")
            return 0


def main():
    print("Blog Post Validation Tests")
    print("=" * 50)

    runner = TestRunner()

    # Test specific changed files
    test_files = [
        Path("_posts/2025-9-15-Linux-usermod.md"),
        Path("_posts/2025-9-20-Poetry.md")
    ]

    for filepath in test_files:
        if filepath.exists():
            runner.test_file(filepath)
        else:
            print(f"{YELLOW}Warning: File not found: {filepath}{NC}")

    return runner.print_summary()


if __name__ == "__main__":
    sys.exit(main())