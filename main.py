from fastapi import FastAPI
import pathlib
import json

app = FastAPI()

@app.get('/')
async def get_all_questions():
    try:
        questions = json.loads(open('data/questions.json'))
        return {}
    except:
        return {"msg": "Error"}


@app.post('/questions/{id}')
async def answer(id: int):
    return {"msg": "hello world"}
