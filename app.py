from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
import requests
import os

load_dotenv()

app = Flask(__name__)

YOUTUBE_API_KEY     = os.environ.get("YOUTUBE_API_KEY")
YOUTUBE_SEARCH_URL  = "https://www.googleapis.com/youtube/v3/search"


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/search-youtube")
def search_youtube():
    query = request.args.get("q", "")
    if not query:
        return jsonify({"error": "No query provided"}), 400

    params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 6,
        "key": YOUTUBE_API_KEY,
    }
    try:
        resp = requests.get(YOUTUBE_SEARCH_URL, params=params)
        resp.raise_for_status()
        items = [i for i in resp.json().get("items", []) if i.get("id", {}).get("videoId")]
        results = [{
            "videoId":   i["id"]["videoId"],
            "title":     i["snippet"]["title"],
            "channel":   i["snippet"]["channelTitle"],
            "thumbnail": i["snippet"]["thumbnails"]["high"]["url"],
        } for i in items]
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
