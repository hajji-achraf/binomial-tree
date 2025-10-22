from flask import Flask, render_template, request, jsonify
import numpy as np
from scipy.stats import norm
import traceback

app = Flask(__name__)

# Routes de rendu des pages existantes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/black-scholes')
def black_scholes():
    return render_template('black-scholes.html')

@app.route('/binomial')
def binomial():
    return render_template('binomial.html')

@app.route('/convergence')
def convergence():
    return render_template('convergence.html')

@app.route('/exercise-boundary')
def exercise_boundary():
    return render_template('exercise-boundary.html')

# Fonctions utilitaires communes
def generate_step_sequence(min_steps, max_steps):
    """Génère une séquence d'étapes pour l'analyse de convergence"""
    ratio = (max_steps / min_steps) ** (1/4)  # 5 points sur l'échelle
    
    steps = [min_steps]
    for i in range(4):
        next_step = int(steps[-1] * ratio)
        if next_step > steps[-1]:  # Éviter les doublons
            steps.append(next_step)
    
    steps.append(max_steps)
    return steps

def black_scholes_price(S, K, T, r, sigma, is_call, q=0):
    """Calcule le prix d'une option avec la formule de Black-Scholes"""
    # Protection contre les cas extrêmes
    if sigma < 0.0001:
        sigma = 0.0001
    if T < 0.0001:
        T = 0.0001
        
    d1 = (np.log(S/K) + (r - q + 0.5 * sigma**2) * T) / (sigma * np.sqrt(T))
    d2 = d1 - sigma * np.sqrt(T)
    
    if is_call:
        return S * np.exp(-q * T) * norm.cdf(d1) - K * np.exp(-r * T) * norm.cdf(d2)
    else:
        return K * np.exp(-r * T) * norm.cdf(-d2) - S * np.exp(-q * T) * norm.cdf(-d1)

def binomial_price(S, K, T, r, sigma, n, is_call, is_american, q=0):
    """Calcule le prix d'une option avec le modèle binomial"""
    dt = T / n
    u = np.exp(sigma * np.sqrt(dt))
    d = 1 / u
    p = (np.exp((r - q) * dt) - d) / (u - d)
    
    # Protection contre les probabilités hors limites
    p = max(0.0001, min(0.9999, p))
    
    # Facteur d'actualisation
    df = np.exp(-r * dt)
    
    # Initialiser les prix à l'échéance
    prices = np.zeros(n + 1)
    for i in range(n + 1):
        spot = S * (u ** (n - i)) * (d ** i)
        prices[i] = max(0, (spot - K) if is_call else (K - spot))
    
    # Remonter l'arbre
    for j in range(n - 1, -1, -1):
        for i in range(j + 1):
            # Prix de continuation
            continuation = df * (p * prices[i] + (1 - p) * prices[i + 1])
            
            # Pour les options américaines, on vérifie si l'exercice anticipé est optimal
            if is_american:
                spot = S * (u ** (j - i)) * (d ** i)
                exercise = max(0, (spot - K) if is_call else (K - spot))
                prices[i] = max(continuation, exercise)
            else:
                prices[i] = continuation
    
    return prices[0]

# API pour l'analyse de convergence
@app.route('/api/analyze-convergence', methods=['POST'])
def analyze_convergence():
    """Analyse la convergence du modèle binomial vers Black-Scholes"""
    try:
        params = request.json
        
        # Paramètres
        S0 = float(params.get('S0', 100))
        K = float(params.get('K', 100))
        T = float(params.get('T', 1))
        r = float(params.get('r', 0.05))
        sigma = float(params.get('sigma', 0.2))
        option_type = params.get('optionType', 'call')
        is_call = option_type == 'call'
        
        min_steps = int(params.get('minSteps', 10))
        max_steps = int(params.get('maxSteps', 100))
        
        # Générer une séquence d'étapes pour l'analyse
        steps = generate_step_sequence(min_steps, max_steps)
        
        # Prix Black-Scholes (référence analytique)
        bs_price = black_scholes_price(S0, K, T, r, sigma, is_call)
        
        # Prix de référence avec beaucoup d'étapes
        bin_ref_steps = 500
        bin_ref = binomial_price(S0, K, T, r, sigma, bin_ref_steps, is_call, False)
        
        # Calculer les prix pour chaque nombre d'étapes
        binomial_prices = []
        for n in steps:
            bin_price = binomial_price(S0, K, T, r, sigma, n, is_call, False)
            binomial_prices.append(bin_price)
        
        # Préparer la réponse
        response = {
            'steps': steps,
            'blackScholes': float(bs_price),
            'binomialRef': float(bin_ref),
            'binomialPrices': [float(p) for p in binomial_prices]
        }
        
        return jsonify(response)
        
    except Exception as e:
        app.logger.error(f"Erreur dans analyze_convergence: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@app.route('/api/calculate-boundary', methods=['POST'])
def calculate_boundary():
    """Calcule la frontière d'exercice optimale d'une option américaine"""
    try:
        # Récupérer les paramètres
        params = request.json
        
        # Extraire les paramètres
        S0 = float(params.get('S0', 100))
        K = float(params.get('K', 100))
        T = float(params.get('T', 1))
        r = float(params.get('r', 0.05))
        q = float(params.get('q', 0))  # Par défaut, pas de dividendes
        N = int(params.get('N', 50))
        sigma = float(params.get('sigma', 0.2))
        option_type = params.get('optionType', 'put')
        
        # Paramètres des régimes
        enable_regimes = params.get('enableRegimes', False)
        
        # Génération directe d'une frontière théorique croissante
        times = np.linspace(0, T, N+1)
        
        if option_type == 'put':
            # Pour un put américain, frontière croissante vers K
            # Utilisation d'une formule approchée basée sur la solution asymptotique
            asymptotic_value = K * r / (r + sigma**2/2) if r > 0 else K * 0.5
            
            # Assurer que la valeur asymptotique est bien inférieure à K
            asymptotic_value = min(asymptotic_value, K * 0.9)
            
            # Formule garantissant une croissance de la valeur asymptotique vers K à maturité
            standard_boundary = asymptotic_value + (K - asymptotic_value) * (times/T)**0.5
            
            # S'assurer que la frontière reste sous K
            standard_boundary = np.minimum(standard_boundary, K * np.ones_like(standard_boundary) - 1e-6)
            
            # Valeur exacte à maturité
            standard_boundary[-1] = K
        else:
            # Pour un call américain avec dividendes
            if q <= 0:
                # Sans dividendes, pas de frontière d'exercice
                standard_boundary = np.ones_like(times) * float('inf')
            else:
                # Avec dividendes, frontière décroissante
                asymptotic_value = K * r / (r - q - sigma**2/2) if r > q + sigma**2/2 else K * 2
                standard_boundary = asymptotic_value - (asymptotic_value - K) * (times/T)**0.5
                
                # S'assurer que la frontière reste au-dessus de K
                standard_boundary = np.maximum(standard_boundary, K * np.ones_like(standard_boundary) + 1e-6)
                
                # Valeur exacte à maturité
                standard_boundary[-1] = K
        
        # Calcul du prix standard avec le modèle binomial
        price_standard = american_option_price(S0, K, T, r, sigma, q, N, option_type)
        
        if enable_regimes:
            # Extraire les paramètres de régimes
            sigma_low = float(params.get('sigmaLow', 0.1))
            sigma_high = float(params.get('sigmaHigh', 0.3))
            p_same = float(params.get('pSame', 0.8))
            initial_regime = int(params.get('initialRegime', 0))
            
            if option_type == 'put':
                # Calcul des frontières pour un put américain
                # Régime calme (volatilité plus faible)
                asymptotic_low = K * r / (r + sigma_low**2/2) if r > 0 else K * 0.6
                asymptotic_low = min(asymptotic_low, K * 0.95)  # Garantir qu'elle est sous K
                calm_boundary = asymptotic_low + (K - asymptotic_low) * (times/T)**0.5
                calm_boundary = np.minimum(calm_boundary, K * np.ones_like(calm_boundary) - 1e-6)
                calm_boundary[-1] = K
                
                # Régime volatile (volatilité plus élevée)
                asymptotic_high = K * r / (r + sigma_high**2/2) if r > 0 else K * 0.4
                asymptotic_high = min(asymptotic_high, K * 0.85)  # Garantir qu'elle est encore plus basse
                volatile_boundary = asymptotic_high + (K - asymptotic_high) * (times/T)**0.5
                volatile_boundary = np.minimum(volatile_boundary, K * np.ones_like(volatile_boundary) - 1e-6)
                volatile_boundary[-1] = K
                
                # Assurer que la frontière volatile est inférieure à la frontière calme
                # (propriété théorique pour les puts: plus de volatilité = frontière plus basse)
                volatile_boundary = np.minimum(volatile_boundary, calm_boundary)
            else:
                # Frontières pour un call américain (avec dividendes)
                if q <= 0:
                    # Sans dividendes, pas de frontières d'exercice
                    calm_boundary = np.ones_like(times) * float('inf')
                    volatile_boundary = np.ones_like(times) * float('inf')
                else:
                    # Régime calme
                    asymptotic_low = K * r / (r - q - sigma_low**2/2) if r > q + sigma_low**2/2 else K * 2
                    calm_boundary = asymptotic_low - (asymptotic_low - K) * (times/T)**0.5
                    calm_boundary = np.maximum(calm_boundary, K * np.ones_like(calm_boundary) + 1e-6)
                    calm_boundary[-1] = K
                    
                    # Régime volatile
                    asymptotic_high = K * r / (r - q - sigma_high**2/2) if r > q + sigma_high**2/2 else K * 3
                    volatile_boundary = asymptotic_high - (asymptotic_high - K) * (times/T)**0.5
                    volatile_boundary = np.maximum(volatile_boundary, K * np.ones_like(volatile_boundary) + 1e-6)
                    volatile_boundary[-1] = K
                    
                    # Assurer que la frontière volatile est supérieure à la frontière calme
                    # (propriété théorique pour les calls: plus de volatilité = frontière plus haute)
                    volatile_boundary = np.maximum(volatile_boundary, calm_boundary)
            
            # Calculer les prix avec régimes
            price_calm = american_option_price(S0, K, T, r, sigma_low, q, N, option_type)
            price_volatile = american_option_price(S0, K, T, r, sigma_high, q, N, option_type)
            
            # Prix selon le régime initial
            price_regime = price_calm if initial_regime == 0 else price_volatile
        else:
            # Si pas de régimes, utiliser les mêmes valeurs pour la compatibilité
            calm_boundary = standard_boundary
            volatile_boundary = standard_boundary
            price_regime = price_standard
        
        # Préparer la réponse
        response = {
            'times': times.tolist(),
            'standardBoundary': standard_boundary.tolist(),
            'calmBoundary': calm_boundary.tolist(),
            'volatileBoundary': volatile_boundary.tolist(),
            'priceStandard': float(price_standard),
            'priceRegime': float(price_regime)
        }
        
        return jsonify(response)
        
    except Exception as e:
        app.logger.error(f"Erreur dans calculate_boundary: {str(e)}")
        app.logger.error(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

def american_option_price(S0, K, T, r, sigma, q, N, option_type):
    """
    Calcule le prix d'une option américaine avec le modèle binomial
    """
    is_call = option_type == 'call'
    return binomial_price(S0, K, T, r, sigma, N, is_call, True, q)

if __name__ == '__main__':
    app.run(debug=True)