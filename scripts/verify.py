#!/usr/bin/env python3
"""Run explicit checks and retain evidence. Uses only Python 3.11+ and Git."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import signal
import subprocess
import sys
import time
import unittest
from urllib.parse import unquote, urlsplit

SLOTS = ("build", "rules", "realtime", "browser")
ROOT = Path(__file__).resolve().parents[1]


def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root).decode("utf-8")


def source_files(root):
    names = git(root, "ls-files", "-z", "--cached", "--others", "--exclude-standard")
    return sorted(set(name for name in names.split("\0") if name))


def snapshot(root):
    digest = hashlib.sha256()
    for name in source_files(root):
        path = root / name
        if path.is_symlink():
            data = os.readlink(path).encode()
        elif path.is_file():
            data = path.read_bytes()
        else:
            data = b"<deleted>"
        digest.update(name.encode() + b"\0" + hashlib.sha256(data).digest())
    return {
        "commit": git(root, "rev-parse", "HEAD").strip(),
        "changes": git(root, "status", "--porcelain", "--untracked-files=all").splitlines(),
        "source_sha256": digest.hexdigest(),
    }


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f"Duplicate configuration key: {key}")
        result[key] = value
    return result


def load_commands(root):
    path = root / "verification/commands.json"
    config = json.loads(path.read_text(), object_pairs_hook=unique_object)
    if not isinstance(config, dict) or set(config) != set(SLOTS):
        raise ValueError("Configuration must contain build, rules, realtime, and browser.")
    for name, item in config.items():
        if not isinstance(item, dict) or set(item) != {"command", "timeout_seconds"}:
            raise ValueError(f"{name}: expected command and timeout_seconds.")
        command = item["command"]
        if command is not None and (
            not isinstance(command, list) or not command
            or not all(isinstance(arg, str) and "\0" not in arg for arg in command)
            or not command[0].strip()
        ):
            raise ValueError(f"{name}: command must be null or a nonempty argument array.")
        timeout = item["timeout_seconds"]
        if type(timeout) is not int or not 1 <= timeout <= 600:
            raise ValueError(f"{name}: timeout_seconds must be an integer from 1 to 600.")
    return config


def check_documents(root):
    errors = []
    required = (
        "AGENTS.md", "README.md", "SPEC.md", "QUALITY.md",
        ".agents/skills/team-workflow/SKILL.md", "templates/SPEC.md",
        "templates/SPIKE.md", "templates/SLICE.md", "templates/CHECK.md",
    )
    for name in required:
        if not (root / name).is_file():
            errors.append(f"Missing required document: {name}")
    spec = root / "SPEC.md"
    ids = re.findall(r"^\|\s*(AC-\d{2,})\s*\|", spec.read_text() if spec.exists() else "", re.M)
    if not ids or len(ids) != len(set(ids)):
        errors.append("SPEC.md must have nonempty, unique AC IDs in its criteria table.")
    for name in source_files(root):
        path = root / name
        if path.suffix != ".md" or not path.is_file():
            continue
        content = path.read_text()
        # This intentionally checks inline file targets, not full Markdown syntax.
        for target in re.findall(r"\[[^\]\n]*\]\(([^)\n]+)\)", content):
            target = target.strip().split()[0].strip("<>")
            link = urlsplit(target)
            if link.scheme or link.netloc or not link.path:
                continue
            if not (path.parent / unquote(link.path)).exists():
                errors.append(f"{name}: missing link target {target}")
        if not name.startswith("templates/"):
            unknown = set(re.findall(r"\bAC-\d{2,}\b", content)) - set(ids)
            errors.extend(f"{name}: undefined criterion {ac}" for ac in sorted(unknown))
    return errors


def run_check(root, output, name, command, timeout):
    result = {"name": name, "command": command, "log": f"{name}.log"}
    start = time.monotonic()
    with (output / result["log"]).open("w") as log:
        if command is None:
            result.update(status="Blocked", detail="No application check configured.")
        else:
            try:
                with subprocess.Popen(
                    command, cwd=root, stdout=log, stderr=subprocess.STDOUT,
                    start_new_session=(os.name == "posix"),
                ) as process:
                    try:
                        code = process.wait(timeout=timeout)
                        result.update(
                            status="Passed" if code == 0 else "Failed",
                            detail=f"Command exited {code}.", exit_code=code,
                        )
                    except subprocess.TimeoutExpired:
                        if os.name == "posix":
                            os.killpg(process.pid, signal.SIGKILL)
                        else:
                            process.kill()
                        process.wait()
                        result.update(status="Failed", detail=f"Timed out after {timeout}s.")
            except OSError as error:
                result.update(status="Blocked", detail=f"Could not run command: {error}")
        log.write("\n" + result["detail"] + "\n")
    result["seconds"] = round(time.monotonic() - start, 3)
    return result


def outcome(results):
    if not results or any(item["status"] == "Failed" for item in results):
        return "Failed", 1
    if any(item["status"] != "Passed" for item in results):
        return "Blocked", 2
    return "Passed", 0


def write_report(output, scope, state, results):
    status, code = outcome(results)
    note = (
        "Setup checks only. Application behavior and MVP acceptance are not verified."
        if scope == "setup" else
        "Automated checks only. AC coverage, hosted rehearsal, and owner acceptance require separate evidence."
    )
    report = {
        "scope": scope, "status": status, "note": note,
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "python": platform.python_version(), "platform": platform.platform(),
        "tested_state": state, "checks": results,
    }
    (output / "report.json").write_text(json.dumps(report, indent=2) + "\n")
    lines = [
        f"# {scope.capitalize()} verification: {status}", "", note, "",
        f"Commit: `{state.get('commit', 'unavailable')}`",
        f"Working tree: {'modified' if state.get('changes') else 'clean'}",
        f"Source fingerprint: `{state.get('source_sha256', 'unavailable')}`", "",
        "| Check | Result | Evidence |", "|---|---|---|",
    ]
    for item in results:
        detail = item["detail"].replace("|", "\\|").replace("\n", " ")
        evidence = f"[{detail}]({item['log']})" if "log" in item else detail
        lines.append(f"| {item['name']} | {item['status']} | {evidence} |")
    (output / "report.md").write_text("\n".join(lines) + "\n")
    print(f"{scope}: {status}. {note}")
    print(f"Report: {output / 'report.md'}")
    return code


def verify(root, scope, base="HEAD"):
    output = root / ".artifacts/verification" / scope
    output.mkdir(parents=True, exist_ok=True)
    # An interrupted or malformed new run must not leave an old green report.
    for name in ("report.md", "report.json", *(f"{slot}.log" for slot in SLOTS),
                 "whitespace.log", "verification-tests.log"):
        (output / name).unlink(missing_ok=True)
    results = []
    state = {}
    try:
        state = snapshot(root)
        config = load_commands(root)
        if scope == "setup":
            errors = check_documents(root)
            results.append({
                "name": "documents-and-config", "status": "Failed" if errors else "Passed",
                "detail": "; ".join(errors) if errors else "File links, AC IDs, and command configuration are valid.",
            })
            results.append(run_check(root, output, "whitespace", ["git", "diff", "--check", base], 30))
            results.append(run_check(root, output, "verification-tests", [
                sys.executable, "scripts/verify.py", "self-test",
            ], 60))
        else:
            for name in SLOTS:
                item = config[name]
                results.append(run_check(root, output, name, item["command"], item["timeout_seconds"]))
        if snapshot(root) != state:
            results.append({
                "name": "source-stability", "status": "Failed",
                "detail": "Source changed while checks ran; inspect changes and rerun.",
            })
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        results.append({"name": "verification-setup", "status": "Failed", "detail": str(error)})
    return write_report(output, scope, state, results)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("scope", choices=("setup", "product", "self-test"))
    parser.add_argument("--base", default="HEAD", help="Git comparison base for setup whitespace checks.")
    args = parser.parse_args()
    scope = args.scope
    if scope == "self-test":
        suite = unittest.TestLoader().discover(str(ROOT / "tests"), pattern="test_*.py")
        if suite.countTestCases() == 0:
            sys.exit("No verification tests found.")
        sys.exit(0 if unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful() else 1)
    sys.exit(verify(ROOT, scope, base=args.base))
