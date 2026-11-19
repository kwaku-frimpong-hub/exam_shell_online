import asyncio
import os
import pathlib
import uuid
import subprocess
import json
import re
import shutil
import signal
import tempfile
import time

API_DIR = pathlib.Path(__file__).resolve().parent
JUDGE_TIMEOUT_SECONDS = 10
MAX_OUTPUT_BYTES = 16000
ANSI_ESCAPE = re.compile(r'\x1b(?:\[[0-?]*[ -/]*[@-~]|[()][0-2A-Z]|[@-_])')


class JudgeUnavailable(Exception):
    pass


async def test_user_input(c_code: str, slug: str, session_id: str):
    """Local-development judge only: temporary files are NOT a security sandbox."""
    return await asyncio.to_thread(_judge_submission, c_code, slug, session_id)


def _judge_submission(c_code: str, slug: str, session_id: str):
    # Validate identifiers before using them in paths, including direct callers.
    session_id = str(uuid.UUID(str(session_id)))
    question_data = json.loads((API_DIR / 'data/questions.json').read_text())
    if slug not in question_data or not re.fullmatch(r'[a-zA-Z0-9_]+', slug):
        raise KeyError(slug)
    question = question_data[slug]
    rank, level = question['rank'], question['level']
    if not re.fullmatch(r'rank\d+', rank) or not re.fullmatch(r'level\d+', level):
        raise JudgeUnavailable('Invalid tester configuration.')
    tester_dir = API_DIR / '.resources' / rank / level / slug
    tester_script = tester_dir / 'tester.sh'
    if not tester_script.is_file() or 'file2="$1"' not in tester_script.read_text():
        raise JudgeUnavailable('This problem does not have a supported tester yet.')
    if not shutil.which('gcc') or not shutil.which('bash'):
        raise JudgeUnavailable('The local judge requires gcc and bash.')

    submission_id = str(uuid.uuid4())
    sandbox_path = API_DIR / 'sandbox'
    sandbox_path.mkdir(parents=True, exist_ok=True)
    started = time.monotonic()
    # Copy only this exercise and shared tester helpers. Keep the relative layout
    # expected by colors.sh, without writing into the reference archive.
    with tempfile.TemporaryDirectory(prefix=f'{submission_id}-', dir=sandbox_path) as temporary:
        working_root = pathlib.Path(temporary)
        working_tester = working_root / '.resources' / rank / level / slug
        shutil.copytree(tester_dir, working_tester)
        shutil.copytree(API_DIR / '.resources/main', working_root / '.resources/main')
        source_dir = working_root / 'submission'
        source_dir.mkdir()
        code_file = source_dir / f'{slug}.c'
        code_file.write_text(c_code)

        # Do not pass API credentials/environment variables to submitted programs.
        environment = {
            'PATH': os.defpath,
            'HOME': str(working_root),
            'TMPDIR': str(working_root),
            'TERM': 'xterm',
            'LANG': 'C.UTF-8',
        }
        timed_out = False
        with (working_root / 'judge.log').open('w+b') as output_file:
            process = subprocess.Popen(
                # Fail on compiler/runtime command errors instead of comparing
                # two empty output files and incorrectly reporting a pass.
                # Cap each output file to limit accidental runaway disk writes.
                ['bash', '-c', 'ulimit -c 0; ulimit -f 2048; exec bash -e "$1" "$2"',
                 'local-judge', str(working_tester / 'tester.sh'), str(code_file)],
                cwd=working_tester,
                env=environment,
                stdin=subprocess.DEVNULL,
                stdout=output_file,
                stderr=subprocess.STDOUT,
                start_new_session=True,
            )
            try:
                process.wait(timeout=JUDGE_TIMEOUT_SECONDS)
            except subprocess.TimeoutExpired:
                timed_out = True
            finally:
                # Also stop descendants left behind by a finished tester.
                try:
                    os.killpg(process.pid, signal.SIGKILL)
                except ProcessLookupError:
                    pass
                process.wait()
            output_file.seek(0)
            raw_output = output_file.read(MAX_OUTPUT_BYTES + 1)

        output = ANSI_ESCAPE.sub('', raw_output[:MAX_OUTPUT_BYTES].decode('utf-8', errors='replace'))
        # Avoid leaking temporary server filesystem paths in diagnostics.
        output = output.replace(str(working_root), '<submission>')
        if len(raw_output) > MAX_OUTPUT_BYTES:
            output += '\n[Output truncated]'
        if timed_out:
            status, message = 'time_limit_exceeded', f'The tester exceeded the {JUDGE_TIMEOUT_SECONDS:g}-second time limit.'
        elif process.returncode == 0 and 'PASSED' in output:
            status, message = 'passed', 'Your solution passed the available tester checks.'
        elif process.returncode != 0:
            status, message = 'failed', 'Your solution did not pass. Review the tester output below.'
        else:
            status, message = 'judge_error', 'The tester finished without a recognized result.'
        return {
            'submission_id': submission_id,
            'session_id': session_id,
            'slug': slug,
            'status': status,
            'message': message,
            'output': output,
            'duration_ms': round((time.monotonic() - started) * 1000),
        }


if __name__ == "__main__":
    code = r"""
#include <stdlib.h>

int     *ft_rrange(int start, int end)
{
    int arr_len = end - start + 1;
    int step = -1;
    int i = 0;
    int *res;

    if (end < start)
    {
        arr_len = start - end + 1;
        step = 1;
    }

    res = malloc(sizeof(int) * arr_len);
    if (!res)
        return NULL;

    while (i < arr_len)
    {
        res[i] = end;
        end += step;
        i++;
    }
    return res;
}
    """
    asyncio.run(test_user_input(code, 'ft_rrange', uuid.uuid4()))
