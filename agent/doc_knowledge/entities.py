import re
from config import ner_multi, email_regex, phone_regex

def extract_entities(text, max_len=1200):
    text = text[:max_len]
    ents = set()

    for e in ner_multi(text):
        ents.add(e["word"])

    ents.update(re.findall(email_regex, text))
    ents.update(re.findall(phone_regex, text))

    return sorted(ents, key=len, reverse=True)

def highlight_markdown(text, entities):
    for e in entities:
        if not e.strip():
            continue
        text = re.sub(
            rf"(?<!\*)({re.escape(e)})(?!\*)",
            r"**\1**",
            text
        )
    return text
