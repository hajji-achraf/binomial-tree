/**
 * OptionPricer - Modèle Black-Scholes sans dividende
 * Développé par Achraf Hajji
 * Date: 2025-10-19
 */

// Variables globales
let optionParams = {};
let optionResults = {};
let chartInstances = {};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les formules avec KaTeX
    renderFormulas();
    
    // Initialiser les écouteurs d'événements
    initializeEventListeners();
});

// Fonction pour initialiser tous les écouteurs d'événements
function initializeEventListeners() {
    // Écouteurs principaux
    document.getElementById('bs-form').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateOptionPrice();
    });
    
    document.getElementById('calculate-greeks-btn').addEventListener('click', function() {
        calculateGreeks();
    });
    
    document.getElementById('export-results').addEventListener('click', function() {
        exportResults();
    });
    
    // Écouteurs pour les onglets
    document.querySelectorAll('[data-bs-toggle="tab"]').forEach(function(tab) {
        tab.addEventListener('shown.bs.tab', function(e) {
            const target = e.target.getAttribute('data-bs-target').replace('#', '');
            resizeChart(target);
        });
    });
    
    // Écouteurs spécifiques pour les onglets de grecques
    const gammaTab = document.getElementById('gamma-tab');
    if (gammaTab) {
        gammaTab.addEventListener('click', function() {
            if (!chartInstances.gamma) {
                drawGammaSurface();
            }
        });
    }
    
    const thetaTab = document.getElementById('theta-tab');
    if (thetaTab) {
        thetaTab.addEventListener('click', function() {
            if (!chartInstances.theta) {
                drawThetaSurface();
            }
        });
    }
    
    const vegaTab = document.getElementById('vega-tab');
    if (vegaTab) {
        vegaTab.addEventListener('click', function() {
            if (!chartInstances.vega) {
                drawVegaSurface();
            }
        });
    }
    
    const rhoTab = document.getElementById('rho-tab');
    if (rhoTab) {
        rhoTab.addEventListener('click', function() {
            if (!chartInstances.rho) {
                drawRhoSurface();
            }
        });
    }
}

// Rendre les formules mathématiques avec KaTeX
function renderFormulas() {
    try {
        // Formule principale
        katex.render("C = S N(d_1) - K e^{-rT} N(d_2)", document.getElementById('bs-formula'));
        
        // Formules d1 et d2
        katex.render("d_1 = \\frac{\\ln(S/K) + (r + \\sigma^2/2)T}{\\sigma\\sqrt{T}}", document.getElementById('bs-d1d2'));
        
        // Formules pour les calls et puts
        katex.render("C = S N(d_1) - K e^{-rT} N(d_2)", document.getElementById('bs-formula-call'));
        katex.render("P = K e^{-rT} N(-d_2) - S N(-d_1)", document.getElementById('bs-formula-put'));
        
        // Formules des grecques
        katex.render("\\Delta_{call} = N(d_1), \\Delta_{put} = N(d_1) - 1", document.getElementById('bs-delta'));
        katex.render("\\Gamma = \\frac{N'(d_1)}{S \\sigma \\sqrt{T}}", document.getElementById('bs-gamma'));
        katex.render("\\Theta_{call} = -\\frac{S N'(d_1) \\sigma}{2\\sqrt{T}} - rKe^{-rT}N(d_2)", document.getElementById('bs-theta'));
        katex.render("\\nu = S N'(d_1) \\sqrt{T}", document.getElementById('bs-vega'));
        
        // Formule de rho
        if (document.getElementById('bs-rho')) {
            katex.render("\\rho_{call} = KTe^{-rT}N(d_2), \\rho_{put} = -KTe^{-rT}N(-d_2)", document.getElementById('bs-rho'));
        }
    } catch (error) {
        console.error('Erreur lors du rendu des formules:', error);
    }
}

// Calcul du prix de l'option Black-Scholes
function calculateOptionPrice() {
    // Masquer le message d'accueil et les résultats précédents
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('greeks-result-card').style.display = 'none';
    document.getElementById('price-result-card').style.display = 'none';
    document.getElementById('loading').style.display = 'block';
    
    // Récupérer les paramètres du formulaire
    const optionType = document.querySelector('input[name="optionType"]:checked').id;
    const spotPrice = parseFloat(document.getElementById('spot-price').value);
    const strikePrice = parseFloat(document.getElementById('strike-price').value);
    const timeToMaturity = parseFloat(document.getElementById('time-to-maturity').value);
    const riskFreeRate = parseFloat(document.getElementById('risk-free-rate').value) / 100;
    const volatility = parseFloat(document.getElementById('volatility').value) / 100;
    
    // Stocker les paramètres
    optionParams = {
        optionType,
        spotPrice,
        strikePrice,
        timeToMaturity,
        riskFreeRate,
        volatility
    };
    
    // Simuler un délai de calcul
    setTimeout(function() {
        try {
            // Utiliser la fonction améliorée pour les calculs
            const results = blackScholesPriceAndGreeks(
                optionType, 
                spotPrice, 
                strikePrice, 
                timeToMaturity, 
                riskFreeRate, 
                volatility
            );
            
            // Stocker les résultats
            optionResults = {
                price: results.price,
                d1: results.d1,
                d2: results.d2,
                Nd1: normalCDF(results.d1),
                Nd2: normalCDF(results.d2),
                delta: results.delta,
                gamma: results.gamma,
                theta: results.theta / 365, // Conversion en base journalière
                vega: results.vega,
                rho: results.rho
            };
            
            // Afficher les résultats
            displayPriceResults();
            
            // Tracer le graphique du prix
            drawPriceChart();
            
            // Activer le bouton de calcul des grecques
            document.getElementById('calculate-greeks-btn').disabled = false;
            
        } catch (error) {
            console.error('Erreur lors du calcul du prix:', error);
            showNotification('Erreur lors du calcul du prix: ' + error.message, 'error');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }, 500); // Délai simulé pour l'effet de calcul
}

// Fonction complète pour le calcul Black-Scholes et des grecques
function blackScholesPriceAndGreeks(optionType, S, K, T, r, sigma) {
    // Protection contre les erreurs numériques
    if (T <= 0) T = 0.0001;
    if (sigma <= 0) sigma = 0.0001;
    
    const sqrtT = Math.sqrt(T);
    
    // Calcul des paramètres d1 et d2
    const d1 = (Math.log(S / K) + (r + 0.5 * sigma * sigma) * T) / (sigma * sqrtT);
    const d2 = d1 - sigma * sqrtT;
    
    // Fonction de répartition normale standard (utiliser jStat si disponible)
    let cdfD1, cdfD2, cdfNegD1, cdfNegD2, pdfD1;
    
    if (typeof jStat !== 'undefined') {
        cdfD1 = jStat.normal.cdf(d1, 0, 1);
        cdfD2 = jStat.normal.cdf(d2, 0, 1);
        cdfNegD1 = jStat.normal.cdf(-d1, 0, 1);
        cdfNegD2 = jStat.normal.cdf(-d2, 0, 1);
        pdfD1 = jStat.normal.pdf(d1, 0, 1);
    } else {
        cdfD1 = normalCDF(d1);
        cdfD2 = normalCDF(d2);
        cdfNegD1 = normalCDF(-d1);
        cdfNegD2 = normalCDF(-d2);
        pdfD1 = normalPDF(d1);
    }
    
    // Prix de l'option
    let price;
    if (optionType === 'call') {
        price = S * cdfD1 - K * Math.exp(-r * T) * cdfD2;
    } else { // put
        price = K * Math.exp(-r * T) * cdfNegD2 - S * cdfNegD1;
    }
    
    // Calcul des grecques
    const delta = optionType === 'call' ? cdfD1 : cdfD1 - 1;
    const gamma = pdfD1 / (S * sigma * sqrtT);
    
    // Theta (exprimé en base annuelle)
    let theta;
    if (optionType === 'call') {
        theta = -S * pdfD1 * sigma / (2 * sqrtT) - r * K * Math.exp(-r * T) * cdfD2;
    } else { // put
        theta = -S * pdfD1 * sigma / (2 * sqrtT) + r * K * Math.exp(-r * T) * cdfNegD2;
    }
    
    // Vega (pour 1% de changement de volatilité)
    const vega = S * pdfD1 * sqrtT;
    
    // Rho (pour 1% de changement de taux)
    const rho = optionType === 'call' ? 
        K * T * Math.exp(-r * T) * cdfD2 / 100 :
        -K * T * Math.exp(-r * T) * cdfNegD2 / 100;
    
    return {
        price,
        delta,
        gamma,
        theta,
        vega,
        rho,
        d1,
        d2
    };
}

// Calcul des grecques et affichage des surfaces 3D
function calculateGreeks() {
    // Afficher l'indicateur de chargement
    document.getElementById('loading').style.display = 'block';
    document.getElementById('greeks-result-card').style.display = 'none';
    
    // Simuler un délai de calcul
    setTimeout(function() {
        try {
            // Les grecques sont déjà calculées avec le prix, les afficher simplement
            displayGreeksResults();
            
            // Tracer les surfaces 3D des grecques
            drawDeltaSurface();
            
            // Les autres surfaces seront tracées lors de la navigation entre les onglets
            
        } catch (error) {
            console.error('Erreur lors du calcul des grecques:', error);
            showNotification('Erreur lors du calcul des grecques: ' + error.message, 'error');
        } finally {
            document.getElementById('loading').style.display = 'none';
        }
    }, 800); // Délai simulé pour l'effet de calcul
}

// Afficher les résultats du prix
function displayPriceResults() {
    // Afficher le prix et les paramètres
    document.getElementById('option-price').textContent = optionResults.price.toFixed(4);
    document.getElementById('d1-value').textContent = optionResults.d1.toFixed(4);
    document.getElementById('d2-value').textContent = optionResults.d2.toFixed(4);
    document.getElementById('nd1-value').textContent = optionResults.Nd1.toFixed(4);
    document.getElementById('nd2-value').textContent = optionResults.Nd2.toFixed(4);
    
    // Afficher la carte des résultats
    document.getElementById('price-result-card').style.display = 'block';
}

// Afficher les résultats des grecques
function displayGreeksResults() {
    // Afficher les valeurs des grecques
    document.getElementById('delta-value').textContent = optionResults.delta.toFixed(4);
    document.getElementById('gamma-value').textContent = optionResults.gamma.toFixed(4);
    document.getElementById('theta-value').textContent = optionResults.theta.toFixed(4);
    document.getElementById('vega-value').textContent = optionResults.vega.toFixed(4);
    
    // Afficher rho si l'élément existe
    if (document.getElementById('rho-value')) {
        document.getElementById('rho-value').textContent = optionResults.rho.toFixed(4);
    }
    
    // Afficher la carte des résultats
    document.getElementById('greeks-result-card').style.display = 'block';
}

// Tracer le graphique du prix de l'option
function drawPriceChart() {
    const { spotPrice, strikePrice, optionType } = optionParams;
    
    // Générer une plage de prix du sous-jacent
    const minSpot = Math.max(0.5 * spotPrice, 1);
    const maxSpot = 1.5 * spotPrice;
    const step = (maxSpot - minSpot) / 100;
    
    const spotPrices = [];
    const optionPrices = [];
    const intrinsicValues = [];
    
    for (let s = minSpot; s <= maxSpot; s += step) {
        spotPrices.push(s);
        
        // Calculer le prix pour ce spot
        const price = calculateOptionPriceForSpot(s);
        optionPrices.push(price);
        
        // Calculer la valeur intrinsèque
        if (optionType === 'call') {
            intrinsicValues.push(Math.max(0, s - strikePrice));
        } else {
            intrinsicValues.push(Math.max(0, strikePrice - s));
        }
    }
    
    // Créer le graphique avec Plotly
    const traces = [
        {
            x: spotPrices,
            y: optionPrices,
            mode: 'lines',
            name: 'Prix de l\'option',
            line: { color: '#3B3B1A', width: 3 }
        },
        {
            x: spotPrices,
            y: intrinsicValues,
            mode: 'lines',
            name: 'Valeur intrinsèque',
            line: { color: '#8A8A65', width: 2, dash: 'dash' }
        },
        {
            x: [spotPrice],
            y: [optionResults.price],
            mode: 'markers',
            name: 'Prix actuel',
            marker: { size: 10, color: '#FF5252' }
        }
    ];
    
    const layout = {
        margin: { t: 20, r: 20, b: 40, l: 50 },
        xaxis: { 
            title: 'Prix du sous-jacent (S)', 
            gridcolor: 'rgba(0,0,0,0.1)' 
        },
        yaxis: { 
            title: 'Prix de l\'option', 
            gridcolor: 'rgba(0,0,0,0.1)' 
        },
        shapes: [{
            type: 'line',
            x0: strikePrice,
            y0: 0,
            x1: strikePrice,
            y1: Math.max(...optionPrices) * 1.1,
            line: { color: 'rgba(0,0,0,0.3)', width: 1, dash: 'dot' }
        }],
        annotations: [{
            x: strikePrice,
            y: 0,
            xref: 'x',
            yref: 'y',
            text: 'Strike',
            showarrow: true,
            arrowhead: 7,
            ax: 0,
            ay: -30
        }],
        legend: { x: 0.01, y: 0.99 },
        plot_bgcolor: '#f8f8f8',
        paper_bgcolor: '#ffffff'
    };
    
    Plotly.newPlot('price-chart', traces, layout);
}

// Tracer la surface 3D du delta
function drawDeltaSurface() {
    // Générer les données pour la surface 3D
    const spotRange = generateRange(optionParams.spotPrice * 0.5, optionParams.spotPrice * 1.5, 20);
    const timeRange = generateRange(0.01, optionParams.timeToMaturity, 20);
    
    const x = []; // Prix du sous-jacent
    const y = []; // Temps jusqu'à maturité
    const z = []; // Delta
    
    for (let t of timeRange) {
        const deltaRow = [];
        for (let s of spotRange) {
            const delta = calculateDeltaForSpotAndTime(s, t);
            deltaRow.push(delta);
        }
        z.push(deltaRow);
    }
    
    // Créer les données x et y pour la surface
    for (let i = 0; i < timeRange.length; i++) {
        x.push(spotRange);
        y.push(Array(spotRange.length).fill(timeRange[i]));
    }
    
    const surfaceData = [{
        type: 'surface',
        x: x,
        y: y,
        z: z,
        colorscale: 'Viridis',
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f462",
                project: { z: true }
            }
        }
    }];
    
    const layout = {
        title: 'Surface du Delta (Δ)',
        scene: {
            xaxis: { title: 'Prix du sous-jacent (S)' },
            yaxis: { title: 'Temps à maturité (T)' },
            zaxis: { title: 'Delta (Δ)' },
            camera: {
                eye: { x: 1.5, y: -1.5, z: 1 }
            }
        },
        margin: { t: 30, b: 0, l: 0, r: 0 },
        width: document.getElementById('delta-surface').offsetWidth,
        height: 400
    };
    
    Plotly.newPlot('delta-surface', surfaceData, layout);
    
    // Marquer comme tracé
    chartInstances.delta = true;
}

// Tracer la surface 3D du gamma
function drawGammaSurface() {
    // Générer les données pour la surface 3D
    const spotRange = generateRange(optionParams.spotPrice * 0.5, optionParams.spotPrice * 1.5, 20);
    const timeRange = generateRange(0.01, optionParams.timeToMaturity, 20);
    
    const x = []; // Prix du sous-jacent
    const y = []; // Temps jusqu'à maturité
    const z = []; // Gamma
    
    for (let t of timeRange) {
        const gammaRow = [];
        for (let s of spotRange) {
            const gamma = calculateGammaForSpotAndTime(s, t);
            gammaRow.push(gamma);
        }
        z.push(gammaRow);
    }
    
    // Créer les données x et y pour la surface
    for (let i = 0; i < timeRange.length; i++) {
        x.push(spotRange);
        y.push(Array(spotRange.length).fill(timeRange[i]));
    }
    
    const surfaceData = [{
        type: 'surface',
        x: x,
        y: y,
        z: z,
        colorscale: 'Plasma',
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f462",
                project: { z: true }
            }
        }
    }];
    
    const layout = {
        title: 'Surface du Gamma (Γ)',
        scene: {
            xaxis: { title: 'Prix du sous-jacent (S)' },
            yaxis: { title: 'Temps à maturité (T)' },
            zaxis: { title: 'Gamma (Γ)' },
            camera: {
                eye: { x: 1.5, y: -1.5, z: 1 }
            }
        },
        margin: { t: 30, b: 0, l: 0, r: 0 },
        width: document.getElementById('gamma-surface').offsetWidth,
        height: 400
    };
    
    Plotly.newPlot('gamma-surface', surfaceData, layout);
    
    // Marquer comme tracé
    chartInstances.gamma = true;
}

// Tracer la surface 3D du theta
function drawThetaSurface() {
    // Générer les données pour la surface 3D
    const spotRange = generateRange(optionParams.spotPrice * 0.5, optionParams.spotPrice * 1.5, 20);
    const timeRange = generateRange(0.01, optionParams.timeToMaturity, 20);
    
    const x = []; // Prix du sous-jacent
    const y = []; // Temps jusqu'à maturité
    const z = []; // Theta
    
    for (let t of timeRange) {
        const thetaRow = [];
        for (let s of spotRange) {
            const theta = calculateThetaForSpotAndTime(s, t);
            thetaRow.push(theta);
        }
        z.push(thetaRow);
    }
    
    // Créer les données x et y pour la surface
    for (let i = 0; i < timeRange.length; i++) {
        x.push(spotRange);
        y.push(Array(spotRange.length).fill(timeRange[i]));
    }
    
    const surfaceData = [{
        type: 'surface',
        x: x,
        y: y,
        z: z,
        colorscale: 'Jet',
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f462",
                project: { z: true }
            }
        }
    }];
    
    const layout = {
        title: 'Surface du Theta (Θ)',
        scene: {
            xaxis: { title: 'Prix du sous-jacent (S)' },
            yaxis: { title: 'Temps à maturité (T)' },
            zaxis: { title: 'Theta (Θ)' },
            camera: {
                eye: { x: 1.5, y: -1.5, z: 1 }
            }
        },
        margin: { t: 30, b: 0, l: 0, r: 0 },
        width: document.getElementById('theta-surface').offsetWidth,
        height: 400
    };
    
    Plotly.newPlot('theta-surface', surfaceData, layout);
    
    // Marquer comme tracé
    chartInstances.theta = true;
}

// Tracer la surface 3D du vega
function drawVegaSurface() {
    // Pour le vega, nous utiliserons la volatilité comme deuxième dimension au lieu du temps
    const spotRange = generateRange(optionParams.spotPrice * 0.5, optionParams.spotPrice * 1.5, 20);
    const volRange = generateRange(0.05, 0.5, 20); // 5% à 50%
    
    const x = []; // Prix du sous-jacent
    const y = []; // Volatilité
    const z = []; // Vega
    
    for (let vol of volRange) {
        const vegaRow = [];
        for (let s of spotRange) {
            const vega = calculateVegaForSpotAndVol(s, vol);
            vegaRow.push(vega);
        }
        z.push(vegaRow);
    }
    
    // Créer les données x et y pour la surface
    for (let i = 0; i < volRange.length; i++) {
        x.push(spotRange);
        y.push(Array(spotRange.length).fill(volRange[i]));
    }
    
    const surfaceData = [{
        type: 'surface',
        x: x,
        y: y,
        z: z,
        colorscale: 'Cividis',
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f462",
                project: { z: true }
            }
        }
    }];
    
    const layout = {
        title: 'Surface du Vega (ν)',
        scene: {
            xaxis: { title: 'Prix du sous-jacent (S)' },
            yaxis: { title: 'Volatilité (σ)' },
            zaxis: { title: 'Vega (ν)' },
            camera: {
                eye: { x: 1.5, y: -1.5, z: 1 }
            }
        },
        margin: { t: 30, b: 0, l: 0, r: 0 },
        width: document.getElementById('vega-surface').offsetWidth,
        height: 400
    };
    
    Plotly.newPlot('vega-surface', surfaceData, layout);
    
    // Marquer comme tracé
    chartInstances.vega = true;
}

// Tracer la surface 3D du rho (NOUVEAU)
function drawRhoSurface() {
    // Pour le rho, nous utiliserons le taux comme deuxième dimension
    const spotRange = generateRange(optionParams.spotPrice * 0.5, optionParams.spotPrice * 1.5, 20);
    const rateRange = generateRange(0.01, 0.1, 20); // 1% à 10%
    
    const x = []; // Prix du sous-jacent
    const y = []; // Taux d'intérêt
    const z = []; // Rho
    
    for (let rate of rateRange) {
        const rhoRow = [];
        for (let s of spotRange) {
            const rho = calculateRhoForSpotAndRate(s, rate);
            rhoRow.push(rho);
        }
        z.push(rhoRow);
    }
    
    // Créer les données x et y pour la surface
    for (let i = 0; i < rateRange.length; i++) {
        x.push(spotRange);
        y.push(Array(spotRange.length).fill(rateRange[i]));
    }
    
    const surfaceData = [{
        type: 'surface',
        x: x,
        y: y,
        z: z,
        colorscale: 'Portland',
        contours: {
            z: {
                show: true,
                usecolormap: true,
                highlightcolor: "#42f462",
                project: { z: true }
            }
        }
    }];
    
    const layout = {
        title: 'Surface du Rho (ρ)',
        scene: {
            xaxis: { title: 'Prix du sous-jacent (S)' },
            yaxis: { title: 'Taux d\'intérêt (r)' },
            zaxis: { title: 'Rho (ρ)' },
            camera: {
                eye: { x: 1.5, y: -1.5, z: 1 }
            }
        },
        margin: { t: 30, b: 0, l: 0, r: 0 },
        width: document.getElementById('rho-surface').offsetWidth,
        height: 400
    };
    
    Plotly.newPlot('rho-surface', surfaceData, layout);
    
    // Marquer comme tracé
    chartInstances.rho = true;
}

// Fonctions utilitaires pour les calculs

// Calculer le prix de l'option pour un prix spot donné
function calculateOptionPriceForSpot(spot) {
    const { strikePrice, timeToMaturity, riskFreeRate, volatility, optionType } = optionParams;
    
    const results = blackScholesPriceAndGreeks(
        optionType, 
        spot, 
        strikePrice, 
        timeToMaturity, 
        riskFreeRate, 
        volatility
    );
    
    return results.price;
}

// Calculer le delta pour un prix spot et un temps donnés
function calculateDeltaForSpotAndTime(spot, time) {
    const { strikePrice, riskFreeRate, volatility, optionType } = optionParams;
    
    const results = blackScholesPriceAndGreeks(
        optionType, 
        spot, 
        strikePrice, 
        time, 
        riskFreeRate, 
        volatility
    );
    
    return results.delta;
}

// Calculer le gamma pour un prix spot et un temps donnés
function calculateGammaForSpotAndTime(spot, time) {
    const { strikePrice, riskFreeRate, volatility, optionType } = optionParams;
    
    const results = blackScholesPriceAndGreeks(
        optionType, 
        spot, 
        strikePrice, 
        time, 
        riskFreeRate, 
        volatility
    );
    
    return results.gamma;
}

// Calculer le theta pour un prix spot et un temps donnés
function calculateThetaForSpotAndTime(spot, time) {
    const { strikePrice, riskFreeRate, volatility, optionType } = optionParams;
    
    const results = blackScholesPriceAndGreeks(
        optionType, 
        spot, 
        strikePrice, 
        time, 
        riskFreeRate, 
        volatility
    );
    
    return results.theta;
}

// Calculer le vega pour un prix spot et une volatilité donnés
function calculateVegaForSpotAndVol(spot, vol) {
    const { strikePrice, timeToMaturity, riskFreeRate, optionType } = optionParams;
    
    const results = blackScholesPriceAndGreeks(
        optionType, 
        spot, 
        strikePrice, 
        timeToMaturity, 
        riskFreeRate, 
        vol
    );
    
    return results.vega;
}

// Calculer le rho pour un prix spot et un taux donnés (NOUVEAU)
function calculateRhoForSpotAndRate(spot, rate) {
    const { strikePrice, timeToMaturity, volatility, optionType } = optionParams;
    
    const results = blackScholesPriceAndGreeks(
        optionType, 
        spot, 
        strikePrice, 
        timeToMaturity, 
        rate, 
        volatility
    );
    
    return results.rho;
}

// Générer une plage de valeurs
function generateRange(min, max, steps) {
    const range = [];
    const step = (max - min) / (steps - 1);
    for (let i = 0; i < steps; i++) {
        range.push(min + i * step);
    }
    return range;
}

// Fonction de distribution normale cumulative (CDF) améliorée
function normalCDF(x) {
    // Gestion des cas extrêmes
    if (x < -8) return 0;
    if (x > 8) return 1;
    
    // Pour les valeurs négatives, utiliser la symétrie de la fonction
    if (x < 0) {
        return 1 - normalCDF(-x);
    }
    
    // Approximation d'Abramowitz et Stegun (précision ~7 décimales)
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const t = 1.0 / (1.0 + p * x);
    const y = ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t;
    
    return 1.0 - y * Math.exp(-x * x / 2) / 2;
}

// Fonction de densité normale (PDF)
function normalPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Redimensionner le graphique lorsqu'un onglet est affiché
function resizeChart(tabId) {
    switch (tabId) {
        case 'gamma-content':
            if (!chartInstances.gamma) {
                drawGammaSurface();
            } else {
                Plotly.relayout('gamma-surface', {
                    width: document.getElementById('gamma-surface').offsetWidth
                });
            }
            break;
        case 'theta-content':
            if (!chartInstances.theta) {
                drawThetaSurface();
            } else {
                Plotly.relayout('theta-surface', {
                    width: document.getElementById('theta-surface').offsetWidth
                });
            }
            break;
        case 'vega-content':
            if (!chartInstances.vega) {
                drawVegaSurface();
            } else {
                Plotly.relayout('vega-surface', {
                    width: document.getElementById('vega-surface').offsetWidth
                });
            }
            break;
        case 'delta-content':
            Plotly.relayout('delta-surface', {
                width: document.getElementById('delta-surface').offsetWidth
            });
            break;
        case 'rho-content':
            if (!chartInstances.rho) {
                drawRhoSurface();
            } else {
                Plotly.relayout('rho-surface', {
                    width: document.getElementById('rho-surface').offsetWidth
                });
            }
            break;
    }
}

// Exporter les résultats
function exportResults() {
    const exportData = {
        parameters: optionParams,
        results: optionResults
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `black_scholes_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Résultats exportés avec succès', 'success');
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Si la fonction existe dans main.js, l'utiliser
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Sinon, implémentation locale
    // Supprimer les notifications existantes
    document.querySelectorAll('.notification').forEach(notification => {
        notification.remove();
    });
    
    // Créer l'élément de notification
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Ajouter l'icône selon le type
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    if (type === 'warning') icon = 'exclamation-triangle';
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-message">${message}</div>
        <button type="button" class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Ajouter au DOM
    document.body.appendChild(notification);
    
    // Ajouter le gestionnaire pour fermer
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.classList.add('notification-hide');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    });
    
    // Afficher la notification avec animation
    setTimeout(() => {
        notification.classList.add('notification-show');
    }, 10);
    
    // Fermer automatiquement après 5 secondes
    setTimeout(() => {
        if (document.body.contains(notification)) {
            notification.classList.add('notification-hide');
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }
    }, 5000);
}