Smooth Workout
A gym companion app that lets you switch between music (Lift Mode) and videos (Cardio Mode) without changing apps. Built with Flask + YouTube Data API v3.

What it does

Lift Mode — search for music on YouTube, plays audio-only in the background with a progress bar and prev/next controls
Cardio Mode — search for workout videos on YouTube, plays them inline with prev/next controls
Switching modes automatically pauses the other player

How to run it

Install dependencies:

   pip install -r requirements.txt

Create a .env file (copy from .env.example) and add your YouTube API key:

   YOUTUBE_API_KEY=your_key_here
   FLASK_SECRET_KEY=anything_random

Run the app:

   python app.py

Open browser and go to http://127.0.0.1:5000

Getting a YouTube API key

Go to https://console.cloud.google.com
Create a new project
Enable YouTube Data API v3
Go to Credentials → Create API Key
Paste it into your .env file

Notes

The free YouTube API quota is 10,000 units/day. Each search costs 100 units, so about 100 searches per day before it resets at midnight Pacific Time.