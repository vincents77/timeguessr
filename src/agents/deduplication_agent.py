# src/agents/deduplication_agent.py

from pathlib import Path
import json
import os
from dotenv import load_dotenv
from openai import OpenAI

# Setup
load_dotenv()
client = OpenAI(api_key=os.getenv("VITE_OPENAI_API_KEY"))
MODEL = "gpt-4o"

THEME_LABELS = [
    "wars & battles", "foundational political moments", "diplomacy & international relations",
    "law & justice", "social movements & protests", "scientific & technological breakthroughs",
    "natural disasters", "architecture & engineering", "exploration & discovery",
    "art & culture", "royalty & coronations", "religious history",
    "economic & industrial history", "migration & demographic change"
]

def get_broad_era_label(year: int) -> str:
    if year <= -300000:
        return "1. Deep Prehistory"
    elif year <= -100000:
        return "2. Early Prehistory"
    elif year <= -3000:
        return "3. Late Prehistory"
    elif year <= 500:
        return "4. Ancient World"
    elif year <= 1500:
        return "5. Middle Ages"
    elif year <= 1800:
        return "6. Early Modern Era"
    elif year <= 1945:
        return "7. Industrial Age"
    elif year <= 2000:
        return "8. 20th Century"
    else:
        return "9. 21st Century"

def infer_theme_from_text(text: str) -> str:
    text = text.lower()
    matches = [theme for theme in THEME_LABELS if theme in text]
    return matches[0] if matches else "art & culture"

# Load memory
memory_path = Path("src/agents/memory/theme_memory.json")
theme_memory = {}
if memory_path.exists():
    with open(memory_path, "r", encoding="utf-8") as f:
        theme_memory = json.load(f)

def run_deduplication(idea: dict, verbose: bool = True) -> dict:
    """Run duplicate detection for a single event idea."""
    idea = idea.copy()  # Avoid mutating original

    # Ensure theme and era
    if not idea.get("broad_era") and idea.get("year"):
        idea["broad_era"] = get_broad_era_label(idea["year"])
    if not idea.get("theme"):
        combined_text = (idea.get("title", "") + " " + idea.get("description", "")).lower()
        idea["theme"] = infer_theme_from_text(combined_text)

    theme = idea.get("theme", "unknown").lower()
    broad_era = idea.get("broad_era", "unknown")
    key = f"{theme} | {broad_era}".lower()
    memory_slice = theme_memory.get(key, [])

    if verbose:
        print(f"🔎 Checking: {idea['title']} → {key}")
    if not memory_slice:
        print(f"⚠️ No memory found for theme+era: {key}")

    # Format memory slice
    summaries = [
        f"- {e['title']} ({e.get('year', '?')}): {e.get('description', '')}"
        for e in memory_slice
    ]

    # Prompt
    prompt = f"""
You are an assistant tasked with detecting duplicates in a historical events database.

Here is a new proposed event:
Title: {idea["title"]}
Year: {idea.get("year")}
Theme: {idea.get("theme")}
Broad Era: {idea.get("broad_era")}
Description: {idea.get("description")}

Here are existing events in the same theme and era:
{chr(10).join(summaries)}

Please assess:
- Is this a duplicate of any listed event (same meaning)?
- Is it a variant (different title, but highly overlapping)?
- Or is it entirely new?

Return a JSON object with:
- "status": one of ["duplicate", "variant", "new"]
- "match_title": title it overlaps with, or null
- "reason": short explanation
""".strip()

    # OpenAI call
    response = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.2,
    )

    content = response.choices[0].message.content.strip()

    try:
        if content.startswith("```json"):
            content = content[len("```json"):].strip()
        if content.endswith("```"):
            content = content[:-3].strip()
        result = json.loads(content)
        return result
    except Exception as e:
        print("❌ Failed to parse model response:", e)
        print("Raw output:\n", content)
        return {"status": "error", "reason": "Failed to parse model response"}

# --- For test run ---
if __name__ == "__main__":
    test_idea = {
        "title": "The Crowning of Charlemagne",
        "year": 800,
        "description": "Charlemagne was crowned Emperor of the Romans by Pope Leo III in the year 800, marking the foundation of the Holy Roman Empire."
    }
    result = run_deduplication(test_idea)
    print(json.dumps(result, indent=2, ensure_ascii=False))

def run_batch_deduplication(ideas: list, save_to_file: bool = False) -> list:
    results = []
    for idea in ideas:
        result = run_deduplication(idea, verbose=False)
        enriched = {
            "title": idea.get("title"),
            "status": result.get("status"),
            "match_title": result.get("match_title"),
            "reason": result.get("reason")
        }
        results.append(enriched)

    if save_to_file:
        output_path = Path("src/moderation/idea_deduplication_results.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"📄 Deduplication results saved to: {output_path}")

    return results