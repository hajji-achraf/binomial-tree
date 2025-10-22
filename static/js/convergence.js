/**
 * OptionPricer - Analyse de Convergence
 * Développé par Hajji Achraf
 * Date: 2025-10-19
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les formules KaTeX
    renderFormulas();
    
    // Écouteur pour le formulaire d'analyse
    document.getElementById('convergence-form').addEventListener('submit', function(e) {
        e.preventDefault();
        analyzeConvergence();
    });
    
    // Écouteur pour le bouton d'export
    document.getElementById('export-results').addEventListener('click', exportResults);
});

// Rendu des formules mathématiques
function renderFormulas() {
    try {
        // Formule de convergence principale
        katex.render("\\lim_{n \\to \\infty} C_n = C_{BS}", document.getElementById('convergence-formula'));
        
        // Formule de convergence binomial
        katex.render("C_{binomial}(n) = C_{BS} + O(\\frac{1}{n})", document.getElementById('binomial-convergence-formula'));
        
    } catch (e) {
        console.error("Erreur lors du rendu des formules KaTeX:", e);
    }
}

// Fonction principale d'analyse de convergence
function analyzeConvergence() {
    showLoading(true);
    
    // Récupérer les paramètres du formulaire
    const params = getFormParams();
    
    // Appeler l'API
    fetch('/api/analyze-convergence', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    })
    .then(response => response.json())
    .then(data => {
        processResults(data, params);
    })
    .catch(error => {
        console.error('Erreur lors de l\'analyse de convergence:', error);
        showNotification("Une erreur est survenue lors de l'analyse", "error");
    })
    .finally(() => {
        showLoading(false);
    });
}

// Récupération des paramètres du formulaire
function getFormParams() {
    const optionType = document.querySelector('input[name="optionType"]:checked').id;
    const S0 = parseFloat(document.getElementById('spot-price').value);
    const K = parseFloat(document.getElementById('strike-price').value);
    const T = parseFloat(document.getElementById('time-to-maturity').value);
    const r = parseFloat(document.getElementById('risk-free-rate').value) / 100;
    const sigma = parseFloat(document.getElementById('volatility').value) / 100;
    const minSteps = parseInt(document.getElementById('min-steps').value);
    const maxSteps = parseInt(document.getElementById('max-steps').value);
    
    return {
        optionType,
        isEuropean: true, // Toujours européenne
        S0,
        K,
        T,
        r,
        sigma,
        minSteps,
        maxSteps
    };
}

// Traitement des résultats
function processResults(data, params) {
    // Afficher les valeurs de référence
    document.getElementById('bs-value').textContent = data.blackScholes.toFixed(4);
    document.getElementById('bin-ref-value').textContent = data.binomialRef.toFixed(4);
    
    // Préparer les données pour les graphiques
    const steps = data.steps;
    
    // Graphique de convergence des prix
    const priceTraces = [];
    
    // Ligne constante pour Black-Scholes
    priceTraces.push({
        x: steps,
        y: Array(steps.length).fill(data.blackScholes),
        mode: 'lines',
        name: 'Black-Scholes',
        line: { color: 'black', width: 2, dash: 'dot' }
    });
    
    // Binomial
    priceTraces.push({
        x: steps,
        y: data.binomialPrices,
        mode: 'lines+markers',
        name: 'Binomial',
        line: { color: 'blue', width: 2 },
        marker: { symbol: 'circle', size: 8 }
    });
    
    // Tracer le graphique des prix
    const priceLayout = {
        title: 'Convergence des prix en fonction du nombre d\'étapes',
        xaxis: {
            title: 'Nombre d\'étapes',
            tickmode: 'array',
            tickvals: steps
        },
        yaxis: {
            title: 'Prix de l\'option'
        },
        legend: {
            x: 0.01,
            y: 0.99,
            bgcolor: 'rgba(255, 255, 255, 0.7)'
        },
        hovermode: 'closest',
        margin: { l: 50, r: 20, t: 50, b: 50 }
    };
    
    Plotly.newPlot('price-convergence-plot', priceTraces, priceLayout);
    
    // Stocker les graphiques pour l'export
    window.charts = {
        'price-chart': { 
            traces: priceTraces,
            layout: priceLayout
        }
    };
}

// Affichage/masquage de l'indicateur de chargement
function showLoading(show) {
    const loadingIndicator = document.getElementById('loading-indicator');
    
    if (show) {
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.style.display = 'none';
    }
}

// Exportation des résultats
function exportResults() {
    if (!window.charts) {
        showNotification("Aucune donnée à exporter. Veuillez d'abord effectuer une analyse.", "warning");
        return;
    }
    
    // Téléchargement du graphique en PNG
    Plotly.downloadImage('price-convergence-plot', {
        format: 'png',
        filename: 'convergence_binomial_blackscholes',
        height: 600,
        width: 800
    });
}

// Fonction de notification (à adapter selon votre système de notification)
function showNotification(message, type = 'info') {
    // Si la fonction existe dans main.js, l'utiliser
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Implémentation de base si la fonction n'existe pas
    alert(message);
}