from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import numpy as np
from scipy.stats import norm
import traceback

app = Flask(__name__, template_folder='../templates', static_folder='../static')
CORS(app)

# Small wrapper endpoints for the front-end to call
@app.route('/api/black-scholes', methods=['POST'])
def api_black_scholes():
    try:
        params = request.json
        S = float(params.get('S', 100))
        K = float(params.get('K', 100))
        T = float(params.get('T', 1))
        r = float(params.get('r', 0.05))
        sigma = float(params.get('sigma', 0.2))
        optionType = params.get('optionType', 'call')
        is_call = optionType == 'call'

        # reuse simple black scholes logic
        if sigma < 0.0001:
            sigma = 0.0001
        if T < 0.0001:
            T = 0.0001
        d1 = (np.log(S/K) + (r + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
        d2 = d1 - sigma * np.sqrt(T)
        if is_call:
            price = S * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
        else:
            price = K * np.exp(-r * T) * norm.cdf(-d2) - S * norm.cdf(-d1)

        return jsonify({'price': float(price)})
    except Exception as e:
        app.logger.error(str(e))
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)
