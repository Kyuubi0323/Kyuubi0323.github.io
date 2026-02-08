#!/usr/bin/env python3
"""
Unit tests for tools/install.sh

Tests shell script structure, command validation, and logic
without actually executing the installation commands

Usage: python3 tools/test_install.py
"""

import re
import subprocess
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


def test_install_sh(runner):
    """Run all tests on install.sh"""
    script_path = Path("tools/install.sh")

    print("\nBasic File Tests")
    print("=" * 50)

    # Test: File exists
    if script_path.exists():
        runner.pass_test("install.sh exists and is readable")
        content = script_path.read_text()
    else:
        runner.fail_test("install.sh exists", "File not found")
        return

    # Test: Has shebang
    lines = content.split('\n')
    if lines and lines[0].startswith('#!') and 'bash' in lines[0]:
        runner.pass_test("install.sh has valid bash shebang")
    else:
        runner.fail_test("install.sh has shebang", f"Missing or invalid: '{lines[0] if lines else ''}'")

    # Test: File is executable
    if script_path.stat().st_mode & 0o111:
        runner.pass_test("install.sh is executable")
    else:
        print(f"{YELLOW}⚠{NC} install.sh is not executable (consider: chmod +x install.sh)")
        runner.pass_test("install.sh executability check (not required)")

    # Test: Syntax check
    try:
        result = subprocess.run(['bash', '-n', str(script_path)],
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0:
            runner.pass_test("install.sh has no syntax errors")
        else:
            runner.fail_test("install.sh syntax check", f"Syntax errors: {result.stderr}")
    except Exception as e:
        runner.fail_test("install.sh syntax check", str(e))

    # Test: Line endings (no CRLF)
    if '\r\n' in content:
        runner.fail_test("install.sh line endings", "File has Windows (CRLF) line endings")
    else:
        runner.pass_test("install.sh has Unix line endings (LF)")

    print("\nCommand Validation Tests")
    print("=" * 50)

    # Test: Contains apt update
    if re.search(r'sudo apt update', content):
        runner.pass_test("install.sh updates package lists (sudo apt update)")
    else:
        runner.fail_test("install.sh apt update", "Missing 'sudo apt update' command")

    # Test: Installs required dependencies
    required_packages = ['git', 'curl', 'build-essential', 'libssl-dev', 'libreadline-dev', 'zlib1g-dev']
    install_line = re.search(r'sudo apt install.*', content)

    if install_line:
        install_text = install_line.group(0)
        missing = [pkg for pkg in required_packages if pkg not in install_text]
        if not missing:
            runner.pass_test("install.sh installs required dependencies")
        else:
            runner.fail_test("install.sh dependencies", f"Missing packages: {', '.join(missing)}")
    else:
        runner.fail_test("install.sh dependencies", "No 'apt install' command found")

    # Test: Clones rbenv
    if re.search(r'git clone.*rbenv/rbenv.*~/.rbenv', content):
        runner.pass_test("install.sh clones rbenv repository")
    else:
        runner.fail_test("install.sh rbenv clone", "Missing rbenv clone command")

    # Test: Clones ruby-build
    if re.search(r'git clone.*rbenv/ruby-build.*~/.rbenv/plugins/ruby-build', content):
        runner.pass_test("install.sh clones ruby-build plugin")
    else:
        runner.fail_test("install.sh ruby-build", "Missing ruby-build clone command")

    # Test: Adds rbenv to PATH
    if re.search(r'export PATH=.*\.rbenv/bin.*>>.*\.bashrc', content):
        runner.pass_test("install.sh adds rbenv to PATH in .bashrc")
    else:
        runner.fail_test("install.sh PATH", "Missing PATH export to .bashrc")

    # Test: Adds rbenv init
    if re.search(r'eval.*rbenv init.*>>.*\.bashrc', content):
        runner.pass_test("install.sh adds rbenv init to .bashrc")
    else:
        runner.fail_test("install.sh rbenv init", "Missing 'rbenv init' in .bashrc")

    # Test: Sources bashrc
    if re.search(r'source.*\.bashrc', content):
        runner.pass_test("install.sh sources .bashrc to reload configuration")
    else:
        runner.fail_test("install.sh source", "Missing 'source ~/.bashrc' command")

    # Test: Installs Ruby version
    ruby_install = re.search(r'rbenv install ([0-9]+\.[0-9]+\.[0-9]+)', content)
    if ruby_install:
        version = ruby_install.group(1)
        runner.pass_test(f"install.sh installs Ruby version ({version})")
    else:
        runner.fail_test("install.sh Ruby install", "Missing 'rbenv install' command")

    # Test: Sets global Ruby
    if re.search(r'rbenv global [0-9]+\.[0-9]+\.[0-9]+', content):
        runner.pass_test("install.sh sets global Ruby version")
    else:
        runner.fail_test("install.sh global Ruby", "Missing 'rbenv global' command")

    # Test: Installs bundler
    if re.search(r'gem install bundler', content):
        runner.pass_test("install.sh installs bundler gem")
    else:
        runner.fail_test("install.sh bundler", "Missing 'gem install bundler' command")

    print("\nScript Quality Tests")
    print("=" * 50)

    # Test: Non-interactive install
    if re.search(r'sudo apt install.*-y', content):
        runner.pass_test("install.sh uses -y flag for non-interactive install")
    else:
        runner.fail_test("install.sh -y flag", "apt install should use -y for automation")

    # Test: Version consistency
    install_version = re.search(r'rbenv install ([0-9]+\.[0-9]+\.[0-9]+)', content)
    global_version = re.search(r'rbenv global ([0-9]+\.[0-9]+\.[0-9]+)', content)

    if install_version and global_version:
        if install_version.group(1) == global_version.group(1):
            runner.pass_test(f"install.sh: Ruby version consistent ({install_version.group(1)})")
        else:
            runner.fail_test("install.sh version consistency",
                           f"Install {install_version.group(1)} != global {global_version.group(1)}")
    else:
        runner.fail_test("install.sh version check", "Could not extract versions")

    # Test: Command order
    apt_update_pos = content.find('sudo apt update')
    apt_install_pos = content.find('sudo apt install')
    rbenv_clone_pos = content.find('git clone https://github.com/rbenv/rbenv')
    path_export_pos = content.find('export PATH="$HOME/.rbenv/bin:$PATH"')
    rbenv_init_pos = content.find('rbenv init')
    source_pos = content.find('source ~/.bashrc')
    rbenv_install_pos = content.find('rbenv install')

    order_tests = [
        (apt_update_pos < apt_install_pos, "apt update runs before apt install"),
        (rbenv_clone_pos < path_export_pos, "rbenv cloned before PATH setup"),
        (path_export_pos < rbenv_init_pos, "PATH setup before rbenv init"),
        (source_pos < rbenv_install_pos, ".bashrc sourced before rbenv install")
    ]

    all_order_correct = True
    for check, desc in order_tests:
        if check:
            runner.pass_test(f"install.sh: {desc}")
        else:
            runner.fail_test(f"install.sh: Command order", desc)
            all_order_correct = False


def main():
    print("Installation Script Tests (install.sh)")
    print("=" * 50)

    runner = TestRunner()
    test_install_sh(runner)
    return runner.print_summary()


if __name__ == "__main__":
    sys.exit(main())