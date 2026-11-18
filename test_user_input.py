import asyncio
import os
import pathlib
import uuid
import subprocess

async def test_user_input(c_code: str, slug: str, session_id: str):
    sandbox_path = pathlib.Path('sandbox')
    if not sandbox_path.exists():
        os.mkdir(sandbox_path)

    code_file = sandbox_path / str(session_id) / f'{slug}.c'
    code_file.parent.mkdir(parents=True, exist_ok=True)
    code_file.write_text(c_code)

    # now we call the tester
    tester_dir = pathlib.Path(f'.resources/rank02/level2/{slug}')
    if not tester_dir.exists():
        raise Exception("could not locate the tester", tester_dir)
    tester_script = tester_dir / "tester.sh"

    res = subprocess.run(
        ['bash', tester_script.resolve(), code_file.resolve()],
        cwd=tester_dir,
    )

    os.remove(code_file)


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
