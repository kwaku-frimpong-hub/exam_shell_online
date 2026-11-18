from fastapi import FastAPI
import pathlib
import json
from pydantic import BaseModel
import uuid

app = FastAPI()
API_DIR = pathlib.Path(__file__).resolve().parent


class ProblemSolution(BaseModel):
    code: str
    session_id: str


@app.get('/')
async def get_all_questions(rank: str = 'rank02', level: str = ''):
    try:
        questions_db = json.loads((API_DIR / 'data/questions.json').read_text())
        questions = []
        for k, v in questions_db.items():
            if v.get('rank') != rank:
                continue
            if level and v.get('level') != level:
                continue
            questions.append(k)
        return {'data': questions}
    except:
        return {"msg": "Error failed to load questions repo"}


@app.get('/questions/{slug}')
async def question_detail(slug: str):
    try:
        questions_db = json.loads((API_DIR / 'data/questions.json').read_text())
        question = questions_db.get(slug, None)
        if not question:
            raise Exception()
        question_text = (API_DIR / question.get('question_path')).read_text()
        return {"msg": {'slug': slug, 'question': question_text}}
    except:
        return {"msg": "Requested question not found"}


@app.post('/questions/{slug}')
async def answer_question(slug: str, code: ProblemSolution):
    
    return {"msg": "Answer this "}


@app.get('/uuid')
async def get_user_uuid():
    return {"msg": uuid.uuid4()}
