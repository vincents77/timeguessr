import os
import json
import re
from pathlib import Path
from dotenv import load_dotenv
from openai import OpenAI
from bs4 import BeautifulSoup
import fitz  # PyMuPDF

# === Paths ===
doc_root = Path("src/data/curriculum_doc_sources")
incoming_dir = doc_root / "incoming"
archive_dir = doc_root / "archive"
curriculum_path = Path("src/data/curriculum_profiles.py")
incoming_dir.mkdir(parents=True, exist_ok=True)
archive_dir.mkdir(exist_ok=True)

# === Load API ===
load_dotenv()
client = OpenAI(api_key=os.getenv("VITE_OPENAI_API_KEY"))

# === Select file to process ===
files = sorted(incoming_dir.glob("*.pdf")) + sorted(incoming_dir.glob("*.html")) + sorted(incoming_dir.glob("*.txt"))
if not files:
    print("📂 No curriculum files found in incoming/.")
    exit()
file_path = files[0]
print(f"📥 Processing file: {file_path.name}")

# === Extract raw text ===
def extract_text_from_file(path: Path) -> str:
    ext = path.suffix.lower()
    if ext == ".txt":
        return path.read_text(encoding="utf-8")
    elif ext == ".pdf":
        with fitz.open(path) as doc:
            return "\n".join(page.get_text() for page in doc)
    elif ext in [".html", ".htm"]:
        soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
        return soup.get_text(separator="\n")
    else:
        raise ValueError(f"❌ Unsupported file type: {ext}")

raw_text = extract_text_from_file(file_path)

# === JSON extractor helper ===
def extract_json_block(text: str) -> str:
    if "```json" in text:
        match = re.search(r"```json(.*?)```", text, re.DOTALL)
        return match.group(1).strip() if match else text
    elif "```" in text:
        match = re.search(r"```(.*?)```", text, re.DOTALL)
        return match.group(1).strip() if match else text
    else:
        brace_start = text.find("{")
        brace_end = text.rfind("}")
        return text[brace_start:brace_end + 1].strip() if brace_start != -1 else text

# === Step 1: Infer document context ===
context_prompt = f"""
You are a curriculum analyst.

Here is a raw curriculum document excerpt:
---
{raw_text[:8000]}
---

What can you infer about the country and educational cycle and levels covered?

Return JSON with:
- country_code (e.g. "fr", "de")
- language (2-letter ISO code, e.g. "fr", "de", "en")
- cycle (e.g. "Cycle 4", "Cycle 3")
- level_code (e.g. "5e")
- levels (array like ["5e", "4e", "3e"])
- inferred_label (e.g. "France 5e – Histoire")
- source: official reference if mentioned (e.g. "BO n°31 du 30 juillet 2020", or title of document)
"""

resp = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": context_prompt}],
    temperature=0.2,
)

context_raw = extract_json_block(resp.choices[0].message.content.strip())

try:
    context = json.loads(context_raw)
    country = context["country_code"].lower()
    language = context.get("language", "unknown")
    level_code = context["level_code"]
    levels = context.get("levels", [level_code])
    label = context["inferred_label"]
    source = context.get("source", "Official School Curriculum Document")
except Exception as e:
    print("❌ Failed to parse context:", e)
    print(context_raw)
    exit()

# === Step 2: Loop through each level and extract themes ===
all_themes = []

for level in levels:
    anchor_keywords = [level.lower(), level.lower().replace("ème", "e")]
    lines = raw_text.splitlines()
    excerpt = ""
    for i, line in enumerate(lines):
        if any(k in line.lower() for k in anchor_keywords):
            excerpt = "\n".join(lines[i:])[:12000]
            break
    if not excerpt:
        excerpt = raw_text[:12000]

    theme_prompt = f"""
You are an education analyst.

The document below describes the **official school curriculum** in local language (e.g., French).

---
{excerpt}
---

Your task is to extract the **curricular content themes** in history. These themes should:

- Correspond to concrete historical eras, events, civilizations, or turning points
- Be suitable for generating real-world history challenges (e.g., wars, revolutions, inventions, discoveries, etc.)
- Avoid general pedagogical skills like methodology, critical thinking, document analysis, or awareness of history

Return this JSON format:
{{
  "themes": [
    {{
      "id": "theme_identifier",
      "label": "...",
      "objective": "...",
      "level": "{level}"
    }}
  ]
}}

⚠️ Guidelines:
- Include only content-based history themes (exclude geography or skill-focused items or other subjects)
- Use snake_case for theme IDs
- Return valid JSON only. No commentary.
"""

    theme_resp = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": theme_prompt}],
        temperature=0.3,
    )

    block = extract_json_block(theme_resp.choices[0].message.content.strip())

    try:
        parsed = json.loads(block)
        if "themes" in parsed:
            filtered = [t for t in parsed["themes"] if "geo" not in t["label"].lower()]
            all_themes.extend(filtered)
    except Exception as e:
        print(f"⚠️ Failed to parse theme block for {level}: {e}")
        print(block)

# === Final profile object
profile = {
    "label": label,
    "source": source,
    "cycle": context.get("cycle"),
    "level": levels[-1],
    "levels": levels,
    "language": "fr",
    "default_persona": "education_analyst",
    "language": language,
    "themes": all_themes
}

# === Save to curriculum_profiles.py
key = f"{country}_{context['cycle'].lower().replace(' ', '_')}" if context.get("cycle") else f"{country}_{level_code.lower()}"
existing = curriculum_path.read_text(encoding="utf-8")
if f'"{key}":' in existing:
    print(f"⚠️ Key '{key}' already exists in curriculum_profiles.py. Skipping.")
else:
    entry = f"""{key} = {json.dumps(profile, indent=2, ensure_ascii=False)}

curriculum_profiles["{key}"] = {key}
"""
    curriculum_path.write_text(existing.strip() + "\n\n" + entry, encoding="utf-8")
    print(f"✅ Added curriculum profile for {key}")

# === Archive
archive_path = archive_dir / file_path.name
file_path.rename(archive_path)
print(f"📦 Archived: {file_path.name}")