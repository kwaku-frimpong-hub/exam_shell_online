import asyncio
import os
from pathlib import Path
import shutil
import tempfile
import unittest
import uuid
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from api import main
from api import test_user_input as judge


class SubmissionEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)
        self.payload = {'code': 'int main(void) { return 0; }', 'session_id': str(uuid.uuid4())}

    def test_disabled_by_default(self):
        with patch.dict(os.environ, {'ENABLE_LOCAL_JUDGE': '0'}):
            self.assertEqual(self.client.post('/questions/alpha_mirror', json=self.payload).status_code, 503)

    def test_endpoint_calls_judge_and_returns_result(self):
        result = {'status': 'passed', 'message': 'Passed.', 'output': 'PASSED'}
        with patch.dict(os.environ, {'ENABLE_LOCAL_JUDGE': '1'}), \
                patch.object(main, 'test_user_input', new_callable=AsyncMock, return_value=result) as run:
            response = self.client.post('/questions/alpha_mirror', json=self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), result)
        run.assert_awaited_once_with(self.payload['code'], 'alpha_mirror', self.payload['session_id'])

    def test_invalid_inputs_do_not_run_judge(self):
        with patch.dict(os.environ, {'ENABLE_LOCAL_JUDGE': '1'}), \
                patch.object(main, 'test_user_input', new_callable=AsyncMock) as run:
            for values in ({'session_id': '../bad'}, {'code': '  '}, {'code': 'a' * 100001}):
                response = self.client.post('/questions/alpha_mirror', json={**self.payload, **values})
                self.assertEqual(response.status_code, 422)
        run.assert_not_awaited()

    def test_missing_problem_and_unavailable_tester(self):
        with patch.dict(os.environ, {'ENABLE_LOCAL_JUDGE': '1'}):
            for exception, status in ((KeyError('missing'), 404), (judge.JudgeUnavailable('No tester'), 503)):
                with patch.object(main, 'test_user_input', new_callable=AsyncMock, side_effect=exception):
                    response = self.client.post('/questions/missing', json=self.payload)
                    self.assertEqual(response.status_code, status)


@unittest.skipUnless(shutil.which('gcc') and shutil.which('bash'), 'Requires GCC and Bash')
class LocalJudgeTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        (self.root / 'data').mkdir()
        shutil.copy(judge.API_DIR / 'data/questions.json', self.root / 'data/questions.json')
        exercise = '.resources/rank02/level1/alpha_mirror'
        shutil.copytree(judge.API_DIR / exercise, self.root / exercise)
        shutil.copytree(judge.API_DIR / '.resources/main', self.root / '.resources/main')
        self.reference = (self.root / exercise / 'alpha_mirror.c').read_text()
        self.api_directory = patch.object(judge, 'API_DIR', self.root)
        self.api_directory.start()
        self.addCleanup(self.temporary.cleanup)
        self.addCleanup(self.api_directory.stop)
        self.session_id = str(uuid.uuid4())

    def run_submission(self, code):
        result = asyncio.run(judge.test_user_input(code, 'alpha_mirror', self.session_id))
        self.assertEqual(list((self.root / 'sandbox').iterdir()), [])
        self.assertNotIn('\x1b', result['output'])
        self.assertNotIn(str(self.root), result['output'])
        return result

    def test_reference_passes(self):
        self.assertEqual(self.run_submission(self.reference)['status'], 'passed')

    def test_wrong_answer_fails(self):
        self.assertEqual(self.run_submission('int main(void) { return 0; }')['status'], 'failed')

    def test_compiler_error_does_not_false_pass(self):
        result = self.run_submission('this is not C')
        self.assertEqual(result['status'], 'failed')
        self.assertIn('error:', result['output'])

    def test_timeout_and_cleanup(self):
        with patch.object(judge, 'JUDGE_TIMEOUT_SECONDS', 0.5):
            result = self.run_submission('int main(void) { while (1) {} return 0; }')
        self.assertEqual(result['status'], 'time_limit_exceeded')

    def test_concurrent_submissions_do_not_share_files(self):
        async def run_both():
            return await asyncio.gather(
                judge.test_user_input(self.reference, 'alpha_mirror', self.session_id),
                judge.test_user_input('int main(void) { return 0; }', 'alpha_mirror', self.session_id),
            )
        passed, failed = asyncio.run(run_both())
        self.assertEqual((passed['status'], failed['status']), ('passed', 'failed'))
        self.assertNotEqual(passed['submission_id'], failed['submission_id'])
        self.assertEqual(list((self.root / 'sandbox').iterdir()), [])

    def test_unknown_problem(self):
        with self.assertRaises(KeyError):
            asyncio.run(judge.test_user_input(self.reference, 'missing', self.session_id))


if __name__ == '__main__':
    unittest.main()
