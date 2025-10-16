import pandas as pd
import re, uuid, pytz, json
from datetime import datetime, timedelta
from openai import OpenAI
from tqdm import tqdm

# --- Setup ---
client = OpenAI()
tz = pytz.timezone("Europe/Lisbon")
today = datetime.now(tz).isoformat(timespec="seconds")

input_path  = "lisbon_events_oct2025.csv"
output_path = "lisbon_events_oct2025_structured.csv"

raw = pd.read_csv(input_path)

# --- Helper for multi-day expansion ---
def expand_dates(start, end, weekdays=None):
    out = []
    if not start or not end:
        return [start]
    d0 = datetime.strptime(start, "%Y-%m-%d")
    d1 = datetime.strptime(end, "%Y-%m-%d")
    while d0 <= d1:
        if not weekdays or d0.strftime("%A").lower() in weekdays:
            out.append(d0.strftime("%Y-%m-%d"))
        d0 += timedelta(days=1)
    return out or [start]

# --- Prompt template for GPT ---
PROMPT = """You are a data analyst cleaning event listings for a Lisbon events database.
Given this raw event text, extract and infer all fields for the schema below.
Preserve original language. If multiple dates are given, identify weekday patterns.
If you see URLs, assign them correctly: ticket, image, youtube, spotify.
If you can, identify city names from the venue.
Output as compact JSON with these keys:
title, description, starts_at, ends_at, location_name, address, ticket_url,
image_url, organizer_email, age, city, all_day, category, youtube_url, spotify_url, is_free.
Always include full ISO date (YYYY-MM-DD) and time (HH:MM if present) in Europe/Lisbon timezone.
Default category = "Family".
"""

# --- Run GPT inference row by row ---
records = []

for i, row in tqdm(raw.iterrows(), total=len(raw)):
    text = " ".join([str(x) for x in row if isinstance(x, str)])
    try:
        completion = client.chat.completions.create(
            model="gpt-5",
            messages=[
                {"role": "system", "content": PROMPT},
                {"role": "user", "content": text}
            ]
        )
        data = completion.choices[0].message.content

        # --- Clean up and parse JSON ---
        data = re.sub(r"```json|```", "", data).strip()
        data = data.replace("false", "False").replace("true", "True").replace("null", "None")

        try:
            j = pd.json_normalize(eval(data))
        except Exception:
            j = pd.json_normalize(json.loads(data))

    except Exception as e:
        print(f"Row {i} failed: {e}")
        continue

    # --- Expand multi-day events ---
    start_date = j.get("starts_at", [None])[0]
    end_date   = j.get("ends_at", [start_date])[0]
    weekdays   = None
    dates = expand_dates(start_date[:10] if start_date else None,
                         end_date[:10]   if end_date   else None,
                         weekdays)

    for d in dates:
        entry = {
            "id": str(uuid.uuid4()),
            "title": j.get("title", [None])[0],
            "description": j.get("description", [None])[0],
            "starts_at": j.get("starts_at", [None])[0],
            "ends_at": j.get("ends_at", [None])[0],
            "location_name": j.get("location_name", [None])[0],
            "address": j.get("address", [None])[0],
            "ticket_url": j.get("ticket_url", [None])[0],
            "image_url": j.get("image_url", [None])[0],
            "organizer_email": j.get("organizer_email", [None])[0],
            "status": "approved",
            "created_at": today,
            "reviewer": "",
            "review_notes": "",
            "approved_at": today,
            "age": j.get("age", [None])[0],
            "city": j.get("city", [None])[0],
            "all_day": bool(j.get("all_day", [False])[0]),
            "category": j.get("category", ["Family"])[0],
            "youtube_url": j.get("youtube_url", [None])[0],
            "spotify_url": j.get("spotify_url", [None])[0],
            "is_free": bool(j.get("is_free", [False])[0]),
        }
        records.append(entry)

# --- Save final structured dataset ---
final = pd.DataFrame(records)
final.to_csv(output_path, index=False, encoding="utf-8-sig")
print(f"✅ Finished! {len(final)} structured rows saved to {output_path}")
