import phonenumbers
from email_validator import validate_email, EmailNotValidError
from config import ner_multi


# =========================
# EXTRACT ENTITIES (NO REGEX)
# =========================
def extract_entities(text, max_len=1200, phone_region="VN"):
    text = text[:max_len]
    entities = []

    # -------- EMAIL --------
    for token in text.replace(",", " ").split():
        try:
            v = validate_email(token, check_deliverability=False)
            start = text.find(token)
            if start != -1:
                entities.append({
                    "type": "email",
                    "value": v.email,
                    "start": start,
                    "end": start + len(token)
                })
        except EmailNotValidError:
            pass

    # -------- PHONE --------
    for match in phonenumbers.PhoneNumberMatcher(text, phone_region):
        entities.append({
            "type": "phone",
            "value": match.raw_string,
            "start": match.start,
            "end": match.end
        })

    # -------- OTHER NER (KHÔNG highlight) --------
    for e in ner_multi(text):
        if e.get("word", "").strip():
            entities.append({
                "type": "ner",
                "value": e["word"]
            })

    return entities


# =========================
# MARKDOWN HIGHLIGHT
# =========================
def highlight_markdown(text, entities):
    """
    In đậm EMAIL + PHONE
    Không double **
    Không lệch offset
    """

    spans = [
        e for e in entities
        if e["type"] in ("email", "phone")
    ]

    # thay từ phải sang trái
    spans = sorted(spans, key=lambda x: x["start"], reverse=True)

    for e in spans:
        s, e_end = e["start"], e["end"]

        # tránh bold trùng
        if text[max(0, s-2):s] == "**" and text[e_end:e_end+2] == "**":
            continue

        text = (
            text[:s]
            + "**" + text[s:e_end] + "**"
            + text[e_end:]
        )

    return text
