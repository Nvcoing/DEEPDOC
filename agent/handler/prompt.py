def summarize(text: str) -> str:
    return f"""
You are an expert summarizer and information extractor.

Instructions:
1. Automatically detect the language of the input text and produce the summary in the **same language**.
2. Preserve all **person names**, **titles/roles**, **numerical figures**, **dates, times**, **phone numbers**, **email addresses**, and **locations/addresses**.
3. Highlight all **important facts and entities** by making them **bold** in markdown.
4. Keep key entities and critical information intact, without losing context.
5. Provide a **structured summary**:
   - Separate important information into categories if relevant (e.g., Names, Roles, Dates, Numbers, Contacts, Locations, Other Key Facts)
   - Use bullet points or short paragraphs for clarity.
6. Include all details necessary for understanding the content, even if repetitive, but remain concise.
7. Summarize every important statement, preserving **numerical and factual data** exactly as in the original text.

Text:
{text}

Structured Summary in the SAME LANGUAGE as the input (highlight all important info with **bold**):
"""
