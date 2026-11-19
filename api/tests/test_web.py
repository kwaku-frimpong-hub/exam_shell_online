import tempfile
from pathlib import Path
import unittest

from fastapi.testclient import TestClient
from api.web import create_app


class CombinedAppTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.directory = Path(self.temporary.name)
        (self.directory / 'index.html').write_text('<html><div id="root">Frontend</div></html>')
        (self.directory / 'assets').mkdir()
        (self.directory / 'assets/app.js').write_text('console.log("frontend")')
        self.client = TestClient(create_app(self.directory))

    def test_frontend_and_assets(self):
        response = self.client.get('/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('text/html', response.headers['content-type'])
        self.assertIn('Frontend', response.text)
        self.assertEqual(self.client.get('/assets/app.js').status_code, 200)

    def test_api_prefix(self):
        response = self.client.get('/api/?rank=rank02')
        self.assertIn('alpha_mirror', response.json()['data'])
        self.assertEqual(self.client.get('/api/questions/alpha_mirror').json()['msg']['slug'], 'alpha_mirror')
        self.assertEqual(len(self.client.get('/api/exams/rank02').json()['msg']), 4)
        self.assertIn('msg', self.client.get('/api/uuid').json())

    def test_api_submission_validation(self):
        response = self.client.post('/api/questions/alpha_mirror', json={'code': '', 'session_id': 'bad'})
        self.assertEqual(response.status_code, 422)

    def test_unknown_api_route_is_not_frontend_html(self):
        response = self.client.get('/api/not-a-route')
        self.assertEqual(response.status_code, 404)
        self.assertIn('application/json', response.headers['content-type'])

    def test_missing_asset_returns_not_found(self):
        self.assertEqual(self.client.get('/assets/missing.js').status_code, 404)

    def test_health(self):
        self.assertEqual(self.client.get('/healthz').json(), {'status': 'ok'})

    def test_missing_build_fails_clearly(self):
        with self.assertRaisesRegex(RuntimeError, 'Frontend build not found'):
            create_app(self.directory / 'missing')


if __name__ == '__main__':
    unittest.main()
