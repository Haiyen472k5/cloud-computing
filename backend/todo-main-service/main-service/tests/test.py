import json
import re
from datetime import datetime

# SAMPLE DATA: bạn có thể thay bằng bất kỳ list Todo nào
items = {
    "todos": [
        {
            "todoID": "879300c0-73e0-45a5-994f-9f712b08a97f",
            "userID": "hpf@houessou.com",
            "dateCreated": "2021-07-25 18:35:14.040809",
            "title": "Learn Ansible",
            "description": "For cloud computing",
            "notes": "",
            "dateDue": "2021-12-31",
            "completed": False
        },
        {
            "todoID": "879300c0-73e0-45a5-994f-9f712b08a97a",
            "userID": "hpf@houessou.com",
            "dateCreated": "2022-07-25 18:35:14.040809",
            "title": "Learn python",
            "description": "For cloud computing",
            "notes": "",
            "dateDue": "2022-12-31",
            "completed": False
        },
        {
            "todoID": "396f518b-02da-4db9-a0a1-f1423fb2d60b",
            "userID": "hpf@houessou.com",
            "dateCreated": "2021-07-25 17:36:28.756252",
            "title": "Learn Python",
            "description": "Learn Python for coding and cloud administrative tasks",
            "notes": "",
            "dateDue": "2021-12-31",
            "completed": False
        },
        {
            "todoID": "1b6e0cae-3653-44b2-b8bd-44bf122e8d8e",
            "userID": "hpf@houessou.com",
            "dateCreated": "2021-07-28 17:28:40.827547",
            "title": "Another todo",
            "description": "New todo with date",
            "notes": "",
            "dateDue": "2021-08-06",
            "completed": True
        }
    ]
}


def search_todos(keyword):
    """
    Search todos by keyword in title (case insensitive)
    """
    result = {"todos": []}
    keyword = keyword.lower()

    for item in items["todos"]:
        title = item["title"].lower()

        if keyword in title:
            # Add item to result
            result["todos"].append(item)

    return result


# TEST
if __name__ == "__main__":
    keyword = "learn python"
    print(f"\nSearching for: '{keyword}'\n")

    results = search_todos(keyword)

    print(json.dumps(results, indent=4))
