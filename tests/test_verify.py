"""Behavioral checks for false success, stale evidence, and bounded execution."""

from contextlib import redirect_stdout
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/verify.py"
SPEC = importlib.util.spec_from_file_location("verify", SCRIPT)
verify = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(verify)


class VerificationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.write(".gitignore", ".artifacts/\n__pycache__/\n")
        subprocess.run(["git", "init", "-q"], cwd=self.root, check=True)
        subprocess.run(["git", "add", ".gitignore"], cwd=self.root, check=True)
        subprocess.run([
            "git", "-c", "user.name=Verification test", "-c", "user.email=test@example.invalid",
            "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
            "commit", "-qm", "Test fixture",
        ], cwd=self.root, check=True)
        self.commands = {
            name: {"command": [sys.executable, "-c", "print('checked')"], "timeout_seconds": 5}
            for name in verify.SLOTS
        }
        self.save_commands()

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)

    def save_commands(self):
        self.write("verification/commands.json", json.dumps(self.commands))

    def run_product(self):
        with redirect_stdout(io.StringIO()):
            code = verify.verify(self.root, "product")
        report = json.loads((self.root / ".artifacts/verification/product/report.json").read_text())
        return code, report

    def test_success_has_commit_fingerprint_and_limited_claim(self):
        code, report = self.run_product()
        self.assertEqual(code, 0)
        self.assertEqual(report["status"], "Passed")
        self.assertEqual(len(report["tested_state"]["commit"]), 40)
        self.assertEqual(len(report["tested_state"]["source_sha256"]), 64)
        self.assertTrue(report["tested_state"]["changes"])
        self.assertIn("separate evidence", report["note"])

    def test_missing_suite_blocks_and_replaces_previous_green_report(self):
        self.assertEqual(self.run_product()[0], 0)
        self.commands["browser"]["command"] = None
        self.save_commands()
        code, report = self.run_product()
        self.assertEqual(code, 2)
        self.assertEqual(report["status"], "Blocked")
        self.assertEqual(report["checks"][-1]["status"], "Blocked")

    def test_failed_suite_does_not_hide_other_results_or_logs(self):
        self.commands["rules"]["command"] = [sys.executable, "-c", "print('wrong score'); raise SystemExit(7)"]
        self.save_commands()
        code, report = self.run_product()
        self.assertEqual(code, 1)
        self.assertEqual(len(report["checks"]), 4)
        self.assertEqual(report["checks"][1]["exit_code"], 7)
        self.assertEqual(report["checks"][-1]["status"], "Passed")
        self.assertIn("wrong score", (self.root / ".artifacts/verification/product/rules.log").read_text())

    def test_missing_executable_blocks(self):
        self.commands["rules"]["command"] = [str(self.root / "missing-executable")]
        self.save_commands()
        self.assertEqual(self.run_product()[0], 2)

    def test_timeout_fails_and_returns_promptly(self):
        self.commands["browser"] = {
            "command": [sys.executable, "-c", "import time; time.sleep(60)"],
            "timeout_seconds": 1,
        }
        self.save_commands()
        code, report = self.run_product()
        self.assertEqual(code, 1)
        self.assertIn("Timed out", report["checks"][-1]["detail"])
        self.assertLess(report["checks"][-1]["seconds"], 5)

    def test_command_arguments_are_not_interpreted_by_a_shell(self):
        self.commands["build"]["command"] = [
            sys.executable, "-c", "import sys; print(sys.argv[1])", "; touch unexpected",
        ]
        self.save_commands()
        self.assertEqual(self.run_product()[0], 0)
        self.assertFalse((self.root / "unexpected").exists())

    def test_source_change_during_checks_fails(self):
        self.commands["build"]["command"] = [
            sys.executable, "-c", "from pathlib import Path; Path('source.txt').write_text('changed')",
        ]
        self.save_commands()
        code, report = self.run_product()
        self.assertEqual(code, 1)
        self.assertEqual(report["checks"][-1]["name"], "source-stability")

    def test_dirty_source_content_changes_fingerprint_even_with_same_status(self):
        self.write("source.txt", "first")
        before = verify.snapshot(self.root)
        self.write("source.txt", "other")
        after = verify.snapshot(self.root)
        self.assertEqual(before["changes"], after["changes"])
        self.assertNotEqual(before["source_sha256"], after["source_sha256"])

    def test_invalid_or_incomplete_config_cannot_pass(self):
        for value in ({}, [], {"build": {}}, {**self.commands, "extra": {}}):
            with self.subTest(value=value):
                self.write("verification/commands.json", json.dumps(value))
                code, report = self.run_product()
                self.assertEqual(code, 1)
                self.assertEqual(report["status"], "Failed")

    def test_duplicate_config_keys_are_rejected(self):
        self.write("verification/commands.json", '{"build": null, "build": null}')
        self.assertEqual(self.run_product()[0], 1)

    def test_invalid_command_and_timeout_rejected(self):
        for command, timeout in [("echo pass", 5), ([], 5), ([""], 5), (["echo"], True), (["echo"], 0)]:
            with self.subTest(command=command, timeout=timeout):
                self.commands["build"] = {"command": command, "timeout_seconds": timeout}
                self.save_commands()
                with self.assertRaises(ValueError):
                    verify.load_commands(self.root)

    def test_document_links_and_criteria_fail_on_missing_evidence(self):
        self.write("SPEC.md", "| AC-01 | First |\n| AC-01 | Duplicate |\n")
        self.write("README.md", "[Missing](missing.md)\nAC-99\n[Web](https://example.invalid/)\n")
        errors = verify.check_documents(self.root)
        self.assertTrue(any("unique AC IDs" in error for error in errors))
        self.assertTrue(any("missing link target missing.md" in error for error in errors))
        self.assertTrue(any("undefined criterion AC-99" in error for error in errors))
        self.assertFalse(any("example.invalid" in error for error in errors))

    def test_empty_test_suite_cannot_pass(self):
        self.write("scripts/verify.py", SCRIPT.read_text())
        self.write("tests/test_empty.py", "# No tests\n")
        run = subprocess.run(
            [sys.executable, "scripts/verify.py", "self-test"], cwd=self.root,
            capture_output=True, text=True,
        )
        self.assertNotEqual(run.returncode, 0)
        self.assertIn("No verification tests found", run.stderr)

    def test_setup_detects_whitespace_in_committed_branch_changes(self):
        base = verify.git(self.root, "rev-parse", "HEAD").strip()
        self.write("README.md", "Trailing whitespace   \n")
        subprocess.run(["git", "add", "README.md"], cwd=self.root, check=True)
        subprocess.run([
            "git", "-c", "user.name=Verification test", "-c", "user.email=test@example.invalid",
            "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
            "commit", "-qm", "Introduce whitespace",
        ], cwd=self.root, check=True)
        with redirect_stdout(io.StringIO()):
            verify.verify(self.root, "setup", base=base)
        report = json.loads((self.root / ".artifacts/verification/setup/report.json").read_text())
        whitespace = next(check for check in report["checks"] if check["name"] == "whitespace")
        self.assertEqual(whitespace["status"], "Failed")


if __name__ == "__main__":
    unittest.main()
