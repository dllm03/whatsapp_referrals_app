import os
import re
import json
import csv

UPLOAD_FOLDER = "uploads"
OUTPUT_FOLDER = "data"

def extract_service_referrals(file_path):
    """Extracts service referrals from a WhatsApp chat file."""
    referrals = []
    keywords = ["recommend", "try", "call", "great", "looking for", "know a good", "fixed my", "super reliable"]

    with open(file_path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    for line in lines:
        match = re.search(r"\[\d{2}/\d{2}/\d{2}, \d{1,2}:\d{2} [APM]{2}\] (.*?): (.*)", line)
        if match:
            sender, message = match.groups()

            if any(keyword in message.lower() for keyword in keywords):
                phone_numbers = re.findall(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b", message)
                business_match = re.search(r"([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)", message)
                business_name = business_match.group(0) if business_match else "Unknown Business"

                referrals.append({
                    "sender": sender,
                    "business_name": business_name,
                    "contact": phone_numbers[0] if phone_numbers else "No Contact Found",
                    "message": message
                })

    return referrals

def save_to_json(referrals, output_file):
    """Saves referrals to JSON."""
    with open(output_file, "w", encoding="utf-8") as json_file:
        json.dump(referrals, json_file, indent=4)

def save_to_csv(referrals, output_file):
    """Saves referrals to CSV."""
    with open(output_file, "w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=["sender", "business_name", "contact", "message"])
        writer.writeheader()
        writer.writerows(referrals)

def process_uploaded_files():
    """Automatically processes new chat files in the upload folder."""
    for filename in os.listdir(UPLOAD_FOLDER):
        if filename.endswith(".txt"):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            print(f"Processing {filename}...")

            referrals = extract_service_referrals(file_path)
            if referrals:
                json_file = os.path.join(OUTPUT_FOLDER, filename.replace(".txt", ".json"))
                csv_file = os.path.join(OUTPUT_FOLDER, filename.replace(".txt", ".csv"))
                
                save_to_json(referrals, json_file)
                save_to_csv(referrals, csv_file)

                print(f"Extracted {len(referrals)} referrals from {filename}.")
            else:
                print(f"No referrals found in {filename}.")
            
            os.remove(file_path)  # Remove processed file

if __name__ == "__main__":
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    if not os.path.exists(OUTPUT_FOLDER):
        os.makedirs(OUTPUT_FOLDER)

    process_uploaded_files()