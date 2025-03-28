from fastapi import FastAPI, UploadFile, File
import os
import json
from extract_referrals import extract_service_referrals, save_to_json, save_to_csv

app = FastAPI()

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "data"

@app.post("/upload-chat/")
async def upload_chat(file: UploadFile = File(...)):
    """Endpoint to upload WhatsApp chat files."""
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    referrals = extract_service_referrals(file_path)

    if referrals:
        json_file = os.path.join(OUTPUT_FOLDER, file.filename.replace(".txt", ".json"))
        csv_file = os.path.join(OUTPUT_FOLDER, file.filename.replace(".txt", ".csv"))
        
        save_to_json(referrals, json_file)
        save_to_csv(referrals, csv_file)

        return {"message": f"Extracted {len(referrals)} referrals.", "data": referrals}
    else:
        return {"message": "No referrals found."}

@app.get("/search/")
async def search_referrals(query: str):
    """Search referrals by business name or keyword."""
    results = []
    for filename in os.listdir(OUTPUT_FOLDER):
        if filename.endswith(".json"):
            with open(os.path.join(OUTPUT_FOLDER, filename), "r", encoding="utf-8") as json_file:
                referrals = json.load(json_file)
                results.extend([r for r in referrals if query.lower() in r["message"].lower()])

    return {"query": query, "results": results}

if __name__ == "__main__":
    import uvicorn
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)
    uvicorn.run(app, host="0.0.0.0", port=8000)