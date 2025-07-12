#!/usr/bin/env python3
import asyncio
import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv('/app/backend/.env')

async def test_ai():
    api_key = os.getenv('GEMINI_API_KEY')
    print(f"API Key: {api_key[:20]}..." if api_key else "No API key")
    
    if not api_key:
        return []
    
    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        prompt = """
Based on these travel preferences: I love adventure activities, beautiful beaches, and rich cultural experiences. Budget around $2000 per person.

Suggest 5 travel destinations. For each destination, provide exactly this JSON structure:
{
    "name": "City Name",
    "country": "Country Name", 
    "description": "Brief 2-3 sentence description",
    "bestTime": "Best time to visit",
    "keyActivities": ["activity1", "activity2", "activity3"],
    "budgetRange": "Budget range (e.g. $1000-2000 per person)"
}

Return ONLY a valid JSON array with exactly 5 destinations. Do not include any other text or markdown formatting.
"""
        
        print("Sending request to Gemini...")
        response = model.generate_content(prompt)
        print(f"Raw response length: {len(response.text)}")
        print(f"Raw response: {response.text[:500]}...")
        
        response_text = response.text.strip()
        if response_text.startswith('```json'):
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        suggestions = json.loads(response_text)
        print(f"Parsed {len(suggestions)} suggestions successfully")
        return suggestions
        
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Response text that failed to parse: {response.text}")
        return []
    except Exception as e:
        print(f"Error: {e}")
        return []

if __name__ == "__main__":
    result = asyncio.run(test_ai())
    print(f"Final result: {len(result)} destinations")
    if result:
        print("First destination:", result[0])