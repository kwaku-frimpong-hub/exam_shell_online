from fastapi import FastAPI, HTTPException
import logging
import os
import pathlib
import json
from pydantic import BaseModel, Field, field_validator
import uuid

if __package__:
    from .test_user_input import JudgeUnavailable, test_user_input
    from .repo import get_question_by_slug, get_questions, get_exams_question
else:
    from test_user_input import JudgeUnavailable, test_user_input
    from repo import get_question_by_slug, get_questions, get_exams_question

logger = logging.getLogger(__name__)
app = FastAPI()
API_DIR = pathlib.Path(__file__).resolve().parent


class ProblemSolution(BaseModel):
    code: str = Field(min_length=1, max_length=100000)
    session_id: uuid.UUID

    @field_validator('code')
    @classmethod
    def code_not_blank(cls, value: str):
        if not value.strip():
            raise ValueError('Source code must not be blank.')
        return value


@app.get('/')
async def get_all_questions(rank: str = 'rank02', level: str = ''):
    try:
        return {'data': get_questions(rank, level)}
    except:
        return {"msg": "Error failed to load questions repo"}


@app.get('/questions/{slug}')
async def question_detail(slug: str):
    try:
        return {"msg": get_question_by_slug(slug)}
    except:
        return {"msg": "Requested question not found"}


@app.post('/questions/{slug}')
async def answer_question(slug: str, code: ProblemSolution):
    if os.environ.get('ENABLE_LOCAL_JUDGE') != '1':
        raise HTTPException(
            status_code=503,
            detail='Local judging is disabled. Enable ENABLE_LOCAL_JUDGE=1 for trusted local development only.',
        )
    try:
        return await test_user_input(code.code, slug, str(code.session_id))
    except KeyError:
        raise HTTPException(status_code=404, detail='Requested question not found.')
    except JudgeUnavailable as error:
        raise HTTPException(status_code=503, detail=str(error))
    except Exception:
        logger.exception('Local judging failed for %s', slug)
        raise HTTPException(status_code=500, detail='The judge could not complete this submission.')


@app.get('/uuid')
async def get_user_uuid():
    return {"msg": uuid.uuid4()}

@app.get('/exams/{rank}')
async def get_exams_list(rank: str):    
    try:
        return {"msg": get_exams_question(rank)}
    except:
        return {"msg": "Error occured while loading questions"}
