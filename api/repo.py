import json
import random
import pathlib


API_DIR = pathlib.Path(__file__).resolve().parent

def load_question_db() -> dict:
    try:
        q_path = API_DIR / "data/questions.json"
        q_db = json.loads(q_path.read_text())
        return q_db
    except:
        raise Exception()

def get_question_by_slug(slug: str):
    try:
        questions_db = load_question_db()
        question = questions_db.get(slug)
        if not question:
            raise Exception()
        question_text = (API_DIR / question.get('question_path')).read_text()
        return {"slug": slug, 'question': question_text}
    except:
        raise Exception()

def get_questions(rank: str, level: str = ''):
    try:
        db = load_question_db()
        questions = []
        for k, v in db.items():
            if v.get('rank') != rank.lower() or (level and v.get('level') != level.lower()):
                continue
            questions.append(k)
        return questions
    except:
        raise Exception()


def get_exams_question(rank: str) -> list[str]:
    try:
        exam_questions = []
        for i in range(10):
            rank_questions = get_questions(rank, f'level{i}')
            if not rank_questions:
                break
            random.shuffle(rank_questions)
            exam_questions.append(rank_questions[0])
        return exam_questions
    except:
        raise Exception()
