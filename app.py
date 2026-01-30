import os
import sys
import requests
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv

# Load environment variables FIRST
load_dotenv()

# Debug: Print current directory and files
print(f"Current directory: {os.getcwd()}")
print(f"Files in directory: {os.listdir('.')}")

# Debug: Check if .env exists
if os.path.exists('.env'):
    print(".env file exists!")
    with open('.env', 'r') as f:
        content = f.read()
        print(".env content (first 50 chars):", content[:50] + "...")
else:
    print("ERROR: .env file not found!")

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key')

# Get API key from environment
API_KEY = os.getenv('UNIRATE_API_KEY')

# Debug: Print API key status
if API_KEY:
    print(f"✓ API Key loaded successfully (first 10 chars: {API_KEY[:10]}...)")
else:
    print("✗ ERROR: API_KEY is None or not loaded!")
    print(f"Available env vars starting with UNIRATE: {[k for k in os.environ if 'UNIRATE' in k]}")

BASE_URL = "https://api.unirateapi.com/api"

@app.route('/')
def index():
    """Render the main page"""
    return render_template('index.html')

@app.route('/api/currencies')
def get_currencies():
    """Proxy endpoint to fetch available currencies"""
    if not API_KEY:
        return jsonify({'error': 'API key not configured'}), 500
    
    try:
        url = f"{BASE_URL}/currencies?api_key={API_KEY}"
        print(f"DEBUG: Fetching currencies from {url[:80]}...")
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"ERROR in get_currencies: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/convert', methods=['GET'])
def convert_currency():
    """Proxy endpoint for currency conversion"""
    if not API_KEY:
        return jsonify({'error': 'API key not configured'}), 500
    
    try:
        amount = request.args.get('amount', '1')
        from_curr = request.args.get('from', 'USD')
        to_curr = request.args.get('to', 'EUR')
        
        # Validate inputs
        if not amount.replace('.', '', 1).isdigit():
            return jsonify({'error': 'Invalid amount'}), 400
            
        url = f"{BASE_URL}/convert?api_key={API_KEY}&amount={amount}&from={from_curr}&to={to_curr}"
        print(f"DEBUG: Converting via {url[:100]}...")
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        result = response.json()
        print(f"DEBUG: Conversion result: {result}")
        return jsonify(result)
    except requests.exceptions.HTTPError as e:
        print(f"HTTP Error: {e.response.status_code} - {e.response.text}")
        return jsonify({'error': f'API Error: {e.response.status_code}'}), e.response.status_code
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/rates', methods=['GET'])
def get_rates():
    """Proxy endpoint to get exchange rates from a base currency"""
    if not API_KEY:
        return jsonify({'error': 'API key not configured'}), 500
    
    try:
        from_curr = request.args.get('from', 'USD')
        url = f"{BASE_URL}/rates?api_key={API_KEY}&from={from_curr}"
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        print(f"ERROR in get_rates: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/health')
def health_check():
    """Check if API is working"""
    if not API_KEY:
        return jsonify({'status': 'error', 'message': 'API key not configured'}), 500
    
    try:
        test_url = f"{BASE_URL}/currencies?api_key={API_KEY}"
        response = requests.get(test_url, timeout=5)
        return jsonify({
            'status': 'healthy' if response.ok else 'error',
            'api_key_set': bool(API_KEY),
            'api_key_length': len(API_KEY) if API_KEY else 0,
            'api_response': response.status_code
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    app.run(debug=True, port=port)