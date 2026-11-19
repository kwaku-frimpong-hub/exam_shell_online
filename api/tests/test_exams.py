import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from api import main, repo


class ExamEndpointTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(main.app)

    def test_returns_one_question_per_available_level(self):
        response = self.client.get('/exams/rank02')
        self.assertEqual(response.status_code, 200)
        questions = response.json()['msg']
        self.assertIsInstance(questions, list)
        self.assertEqual(len(questions), 4)
        for level, slug in enumerate(questions):
            self.assertIn(slug, repo.get_questions('rank02', f'level{level}'))

    def test_unavailable_rank_returns_empty_set(self):
        self.assertEqual(self.client.get('/exams/rank99').json(), {'msg': []})

    def test_repository_failure_returns_existing_error_contract(self):
        with patch.object(main, 'get_exams_question', side_effect=OSError('Unavailable')):
            self.assertIsInstance(self.client.get('/exams/rank02').json()['msg'], str)

    def test_question_statement_loads_from_repository_root(self):
        response = self.client.get('/questions/alpha_mirror')
        self.assertEqual(response.json()['msg']['slug'], 'alpha_mirror')
        self.assertIn('Assignment name', response.json()['msg']['question'])


if __name__ == '__main__':
    unittest.main()
