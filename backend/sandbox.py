import subprocess
import tempfile
import os
import resource
from dataclasses import dataclass
from typing import Optional


@dataclass
class RunResult:
    success: bool
    stdout: str
    stderr: str
    phase: str  # "compile" | "run" | "ok"
    returncode: int = 0


def _set_limits():
    """Limit CPU time and memory for child process (Unix only)."""
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
        resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))
    except Exception:
        pass


def compile_and_run(
    code: str,
    stdin_input: str = "",
    timeout: int = 8,
    extra_flags: Optional[list] = None,
) -> RunResult:
    flags = ["-Wall", "-Wextra", "-Werror=implicit-function-declaration", "-O0", "-lm"]
    if extra_flags:
        flags.extend(extra_flags)

    with tempfile.TemporaryDirectory() as tmpdir:
        src = os.path.join(tmpdir, "solution.c")
        exe = os.path.join(tmpdir, "solution")

        with open(src, "w") as f:
            f.write(code)

        # Compile
        try:
            comp = subprocess.run(
                ["gcc"] + flags + ["-o", exe, src],
                capture_output=True,
                text=True,
                timeout=15,
            )
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Compilation timeout", "compile")
        except FileNotFoundError:
            return RunResult(False, "", "gcc not found. Install Xcode Command Line Tools: xcode-select --install", "compile")

        if comp.returncode != 0:
            return RunResult(False, "", comp.stderr, "compile")

        # Run
        try:
            run = subprocess.run(
                [exe],
                input=stdin_input,
                capture_output=True,
                text=True,
                timeout=timeout,
                preexec_fn=_set_limits,
            )
            return RunResult(
                success=True,
                stdout=run.stdout,
                stderr=run.stderr,
                phase="ok",
                returncode=run.returncode,
            )
        except subprocess.TimeoutExpired:
            return RunResult(False, "", "Runtime timeout (>8s): infinite loop?", "run")
        except Exception as e:
            return RunResult(False, "", str(e), "run")
