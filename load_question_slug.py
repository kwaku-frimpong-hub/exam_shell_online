import os
import pathlib
import json

def load_question_slugs(dir_path: str):
    files = os.listdir(dir_path)
    ret = {}
    for file in files:
        question_dir = pathlib.Path(f'{dir_path}/{file}')
        
        if file in ['.DS_Store'] or not question_dir.is_dir(): continue
        
        ret[file] = {
            'level': question_dir.parent.name,
            'rank': question_dir.parent.parent.name,
            'question_path': f"{dir_path}/{file}/sub.txt"
        }
    return ret


def load_rank_02():
    l0 = load_question_slugs(".resources/rank02/level0")
    l1 = load_question_slugs(".resources/rank02/level1")
    l2 = load_question_slugs(".resources/rank02/level2")
    l3 = load_question_slugs(".resources/rank02/level3")

    res = l0 | l1 | l2 | l3
    save_file = pathlib.Path('data/questions.json')
    save_file.parent.mkdir(exist_ok=True, parents=True)
    save_file.write_text(json.dumps(res, indent=4))


if __name__ == "__main__":
    res = load_rank_02()


    
    

