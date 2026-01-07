import re
from dateparser.search import search_dates
import phonenumbers
from email_validator import validate_email, EmailNotValidError
from doc_knowledge.config import ner_multi


# =========================
# DATE (MULTI-LANG)
# =========================
def extract_dates(text, languages=None):
    dates = set()

    found = search_dates(
        text,
        languages=languages,   # None = auto detect
        settings={
            "PREFER_DAY_OF_MONTH": "first",
            "RETURN_AS_TIMEZONE_AWARE": False
        }
    )

    if not found:
        return dates

    for raw, _ in found:
        dates.add(raw)

    return dates


# =========================
# EMAIL (LANG-AGNOSTIC)
# =========================
def extract_emails(text):
    emails = set()

    tokens = re.split(r"[^\w@.+-]+", text)
    for t in tokens:
        try:
            v = validate_email(t, check_deliverability=False)
            emails.add(v.email)
        except EmailNotValidError:
            pass

    return emails


# =========================
# PHONE (INTERNATIONAL)
# =========================
def extract_phones(text):
    phones = set()

    # Try global detection first
    for match in phonenumbers.PhoneNumberMatcher(text, None):
        phones.add(match.raw_string)

    return phones


# =========================
# ENTITY EXTRACTOR (MAIN)
# =========================
def extract_entities(
    text: str,
    max_len: int = 1200,
    languages=None
):
    text = text[:max_len]
    ents = set()

    # -------- NER (MULTI-LANG) --------
    for e in ner_multi(text):
        w = e.get("word", "").strip()
        if w:
            ents.add(w)

    # -------- DATE / EMAIL / PHONE --------
    ents |= extract_dates(text, languages)
    ents |= extract_emails(text)
    ents |= extract_phones(text)

    return sorted(ents, key=len, reverse=True)


# =========================
# MARKDOWN HIGHLIGHT
# =========================
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
