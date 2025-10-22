/**
 * OptionPricer - Frontière Optimale d'Exercice
 * Développé par Hajji Achraf
 * Date: 2025-10-20
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les écouteurs d'événements
    setupEventListeners();
    
    // Initialiser l'affichage de la matrice de transition
    updateTransitionMatrix();
    
    // Initialiser les formules KaTeX si KaTeX est disponible
    if (typeof katex !== 'undefined') {
        renderFormulas();
    }
});

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Modèle standard
    document.getElementById('standard-form').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateStandardBoundary();
    });
    
    // Modèle à régimes
    document.getElementById('regime-form').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateRegimeBoundary();
    });
    
    // Probabilité de transition
    const pSameSlider = document.getElementById('p-same');
    if (pSameSlider) {
        pSameSlider.addEventListener('input', function() {
            document.getElementById('p-same-value').textContent = pSameSlider.value;
            updateTransitionMatrix();
        });
    }
    
    // Export des graphiques
    document.getElementById('export-std').addEventListener('click', function() {
        exportChart('boundary-std-plot', 'frontiere_standard');
    });
    
    document.getElementById('export-reg').addEventListener('click', function() {
        exportChart('boundary-reg-plot', 'frontieres_regimes');
    });
}

// Mise à jour de la matrice de transition
function updateTransitionMatrix() {
    const pSame = document.getElementById('p-same').value;
    const pChange = (1 - parseFloat(pSame)).toFixed(2);
    
    document.getElementById('p00').textContent = pSame;
    document.getElementById('p11').textContent = pSame;
    document.getElementById('p01').textContent = pChange;
    document.getElementById('p10').textContent = pChange;
}

// Rendu des formules mathématiques
function renderFormulas() {
    try {
        if (document.getElementById('boundary-formula')) {
            katex.render(
                "V(t, s) = \\sup_{\\tau \\in [t, T]} \\mathbb{E}^{\\mathbb{Q}}\\!\\left[ e^{-r(\\tau - t)}\\, \\Phi(S_{\\tau}) \\mid S_t = s \\right]",
                document.getElementById('boundary-formula')
            );
        }
    } catch (e) {
        console.error('Erreur lors du rendu des formules KaTeX:', e);
    }
}


// Calcul de la frontière standard
function calculateStandardBoundary() {
    showLoading(true);
    
    // Récupérer les paramètres du formulaire
    const params = {
        S0: parseFloat(document.getElementById('spot-price-std').value),
        K: parseFloat(document.getElementById('strike-price-std').value),
        T: parseFloat(document.getElementById('time-to-maturity-std').value),
        r: parseFloat(document.getElementById('risk-free-rate-std').value) / 100,
        sigma: parseFloat(document.getElementById('volatility-std').value) / 100,
        N: parseInt(document.getElementById('steps-std').value),
        optionType: 'put',
        enableRegimes: false
    };
    
    // Appel à l'API
    fetch('/api/calculate-boundary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        displayStandardResults(data);
        showLoading(false);
        showNotification("Frontière calculée avec succès", "success");
    })
    .catch(error => {
        console.error('Erreur lors du calcul de la frontière:', error);
        showLoading(false);
        showNotification("Erreur lors du calcul de la frontière", "error");
    });
}

// Calcul de la frontière avec régimes
function calculateRegimeBoundary() {
    showLoading(true);
    
    // Récupérer les paramètres du formulaire
    const params = {
        S0: parseFloat(document.getElementById('spot-price-reg').value),
        K: parseFloat(document.getElementById('strike-price-reg').value),
        T: parseFloat(document.getElementById('time-to-maturity-reg').value),
        r: parseFloat(document.getElementById('risk-free-rate-reg').value) / 100,
        sigma: (parseFloat(document.getElementById('vol-low').value) + parseFloat(document.getElementById('vol-high').value)) / 200,
        N: parseInt(document.getElementById('steps-reg').value),
        optionType: 'put',
        enableRegimes: true,
        sigmaLow: parseFloat(document.getElementById('vol-low').value) / 100,
        sigmaHigh: parseFloat(document.getElementById('vol-high').value) / 100,
        pSame: parseFloat(document.getElementById('p-same').value),
        initialRegime: parseInt(document.querySelector('input[name="initialRegime"]:checked').value)
    };
    
    // Appel à l'API
    fetch('/api/calculate-boundary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        displayRegimeResults(data);
        showLoading(false);
        showNotification("Frontières calculées avec succès", "success");
    })
    .catch(error => {
        console.error('Erreur lors du calcul des frontières:', error);
        showLoading(false);
        showNotification("Erreur lors du calcul des frontières", "error");
    });
}

// Afficher les résultats standard
function displayStandardResults(data) {
    // Mise à jour des valeurs
    document.getElementById('boundary-std-value').textContent = data.standardBoundary[0].toFixed(2);
    document.getElementById('price-std-value').textContent = data.priceStandard.toFixed(4);
    
    // Tracer la frontière
    const trace = {
        x: data.times,
        y: data.standardBoundary,
        mode: 'lines',
        name: 'Frontière d\'exercice',
        line: { color: 'blue', width: 3 }
    };
    
    // Ligne horizontale pour K
    const K = data.K || data.standardBoundary[data.standardBoundary.length-1];
    const kLine = {
        x: [0, Math.max(...data.times)],
        y: [K, K],
        mode: 'lines',
        line: { color: 'gray', width: 1, dash: 'dash' },
        name: 'Strike (K)'
    };
    
    const layout = {
        title: 'Frontière d\'exercice optimale (Put américain)',
        xaxis: { 
            title: 'Temps jusqu\'à maturité (années)',
        },
        yaxis: { 
            title: 'Prix critique S_f(t)',
            range: [0, K * 1.2]
        },
        hovermode: 'closest',
        showlegend: true
    };
    
    Plotly.newPlot('boundary-std-plot', [trace, kLine], layout);
}

// Afficher les résultats pour le modèle à régimes
function displayRegimeResults(data) {
    // Mise à jour des valeurs
    document.getElementById('boundary-calm-value').textContent = data.calmBoundary[0].toFixed(2);
    document.getElementById('boundary-volatile-value').textContent = data.volatileBoundary[0].toFixed(2);
    document.getElementById('price-reg-value').textContent = data.priceRegime.toFixed(4);
    
    // Traces pour les frontières par régime
    const calmTrace = {
        x: data.times,
        y: data.calmBoundary,
        mode: 'lines',
        name: 'Régime calme (σ₀)',
        line: { color: 'blue', width: 3 }
    };
    
    const volatileTrace = {
        x: data.times,
        y: data.volatileBoundary,
        mode: 'lines',
        name: 'Régime volatile (σ₁)',
        line: { color: 'red', width: 3 }
    };
    
    // Ligne horizontale pour K
    const K = data.K || data.calmBoundary[data.calmBoundary.length-1];
    const kLine = {
        x: [0, Math.max(...data.times)],
        y: [K, K],
        mode: 'lines',
        line: { color: 'gray', width: 1, dash: 'dash' },
        name: 'Strike (K)'
    };
    
    // Remplissage entre les frontières
    const fillBetween = {
        x: data.times.concat(data.times.slice().reverse()),
        y: data.calmBoundary.concat(data.volatileBoundary.slice().reverse()),
        fill: 'toself',
        fillcolor: 'rgba(255, 165, 0, 0.2)',
        line: { color: 'transparent' },
        name: 'Zone d\'indécision',
        showlegend: true
    };
    
    const layout = {
        title: 'Frontières d\'exercice par régime (Put américain)',
        xaxis: { 
            title: 'Temps jusqu\'à maturité (années)',
        },
        yaxis: { 
            title: 'Prix critique S_f(t)',
            range: [0, K * 1.2]
        },
        hovermode: 'closest',
        legend: {
            x: 0.01,
            y: 0.99,
            bgcolor: 'rgba(255, 255, 255, 0.7)'
        }
    };
    
    Plotly.newPlot('boundary-reg-plot', [calmTrace, volatileTrace, fillBetween, kLine], layout);
}

// Exporter un graphique en PNG
function exportChart(chartId, filename) {
    Plotly.downloadImage(chartId, {
        format: 'png',
        filename: filename,
        width: 800,
        height: 500
    });
}

// Afficher/masquer l'indicateur de chargement
function showLoading(show) {
    if (typeof window.showLoadingIndicator === 'function') {
        window.showLoadingIndicator(show);
    }
}

// Afficher une notification
function showNotification(message, type) {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        console.log(`${type}: ${message}`);
    }
}