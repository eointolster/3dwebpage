# app.py
from flask import Flask, render_template, request, jsonify, Response
import requests
from requests.exceptions import RequestException
import json
from flask_cors import CORS
from urllib.parse import urljoin, urlparse


app = Flask(__name__, static_folder='static')
CORS(app)

# Load saved data
def load_data():
    try:
        with open('cube_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        return {'faces': {str(i): {'color': 'white', 'url': ''} for i in range(1, 7)}}

# Save data
def save_data(data):
    with open('cube_data.json', 'w') as f:
        json.dump(data, f)

@app.route('/')
def index():
    print("Rendering index.html")  # Add this line
    return render_template('index.html')

@app.route('/get_data')
def get_data():
    return jsonify(load_data())

@app.route('/save_data', methods=['POST'])
def update_data():
    data = request.json
    save_data(data)
    return jsonify({'status': 'success'})

from urllib.parse import urljoin

@app.route('/proxy/<path:url>')
def proxy(url):
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'http://' + url

        # Handle localhost requests
        parsed_url = urlparse(url)
        if parsed_url.hostname in ('localhost', '127.0.0.1'):
            if parsed_url.port is None:
                url = f"{parsed_url.scheme}://{parsed_url.hostname}:5000{parsed_url.path}"
            else:
                url = f"{parsed_url.scheme}://{parsed_url.hostname}:{parsed_url.port}{parsed_url.path}"

        response = requests.get(url, timeout=10)
        content = response.content

        # Replace relative URLs with absolute URLs
        base_url = response.url
        content = content.replace(b'src="/', f'src="{urljoin(base_url, "/")}'.encode())
        content = content.replace(b'href="/', f'href="{urljoin(base_url, "/")}'.encode())

        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in response.raw.headers.items()
                   if name.lower() not in excluded_headers]
        return Response(content, response.status_code, headers)
    except RequestException as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"An unexpected error occurred: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(debug=True)