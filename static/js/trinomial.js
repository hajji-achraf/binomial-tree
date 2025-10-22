/**
 * OptionPricer - Modèle Trinomial
 * Développé par Achraf Hajji
 */

// Variables globales
/*let optionParams = {};
let treeParams = {};
let treeData = {};
let optionResults = {};
let currentView = 'price'; // 'price', 'option', ou 'probability'

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser les formules avec KaTeX
    renderFormulas();
    
    // Ajouter les écouteurs d'événements
    document.getElementById('trinomial-form').addEventListener('submit', function(e) {
        e.preventDefault();
        calculateTrinomial();
    });
    
    // Contrôles pour le nombre d'étapes
    document.getElementById('increase-steps').addEventListener('click', function() {
        const stepsInput = document.getElementById('steps');
        if (parseInt(stepsInput.value) < parseInt(stepsInput.max)) {
            stepsInput.value = parseInt(stepsInput.value) + 1;
        }
    });
    
    document.getElementById('decrease-steps').addEventListener('click', function() {
        const stepsInput = document.getElementById('steps');
        if (parseInt(stepsInput.value) > parseInt(stepsInput.min)) {
            stepsInput.value = parseInt(stepsInput.value) - 1;
        }
    });
    
    // Contrôles pour la visualisation de l'arbre
    document.getElementById('view-price-tree').addEventListener('click', function() {
        document.getElementById('view-price-tree').classList.add('active');
        document.getElementById('view-option-tree').classList.remove('active');
        document.getElementById('view-probabilities').classList.remove('active');
        updateTreeVisualization('price');
    });
    
    document.getElementById('view-option-tree').addEventListener('click', function() {
        document.getElementById('view-price-tree').classList.remove('active');
        document.getElementById('view-option-tree').classList.add('active');
        document.getElementById('view-probabilities').classList.remove('active');
        updateTreeVisualization('option');
    });
    
    document.getElementById('view-probabilities').addEventListener('click', function() {
        document.getElementById('view-price-tree').classList.remove('active');
        document.getElementById('view-option-tree').classList.remove('active');
        document.getElementById('view-probabilities').classList.add('active');
        updateTreeVisualization('probability');
    });
    
    // Contrôles de zoom
    document.getElementById('zoom-in').addEventListener('click', function() {
        const scale = 1.2;
        transformTree(scale);
    });
    
    document.getElementById('zoom-out').addEventListener('click', function() {
        const scale = 0.8;
        transformTree(scale);
    });
    
    document.getElementById('zoom-reset').addEventListener('click', function() {
        const container = document.getElementById('trinomial-tree-container');
        if (container.querySelector('svg')) {
            container.querySelector('svg').removeAttribute('transform');
            const svgElement = container.querySelector('svg g');
            if (svgElement) {
                svgElement.setAttribute('transform', 'translate(30, 30)');
            }
        }
    });
    
    // Export des résultats
    document.getElementById('export-results').addEventListener('click', exportResults);
    
    // Afficher/masquer les éléments spécifiques aux options américaines
    document.getElementById('american').addEventListener('change', function() {
        document.querySelectorAll('.american-only').forEach(el => {
            el.style.display = 'flex';
        });
    });
    
    document.getElementById('european').addEventListener('change', function() {
        document.querySelectorAll('.american-only').forEach(el => {
            el.style.display = 'none';
        });
    });
});

// Fonction pour transformer l'arbre (zoom)
function transformTree(scale) {
    const container = document.getElementById('trinomial-tree-container');
    const svg = container.querySelector('svg g');
    if (svg) {
        // Obtenir la transformation actuelle
        let currentTransform = svg.getAttribute('transform') || '';
        let currentScale = 1;
        
        // Extraire l'échelle actuelle si elle existe
        const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
        if (scaleMatch && scaleMatch[1]) {
            currentScale = parseFloat(scaleMatch[1]);
        }
        
        // Calculer la nouvelle échelle
        const newScale = currentScale * scale;
        
        // Appliquer la nouvelle transformation
        let newTransform = currentTransform.replace(/scale\([^)]+\)/, '');
        newTransform = `${newTransform} scale(${newScale})`.trim();
        svg.setAttribute('transform', newTransform);
    }
}

// Rendre les formules mathématiques avec KaTeX
function renderFormulas() {
    try {
        // Formule principale
        katex.render("\\text{Prix} = \\sum_{j=-n}^{n} p_u^{(j+n)/2} p_m^{n-(j+n)/2} p_d^{(n-j)/2} \\times \\text{Payoff}(S_0 u^j m^{n-|j|} d^{-j})", 
                   document.getElementById('trinomial-formula'));
        
        // Paramètres du modèle
        katex.render("u = e^{\\sigma\\sqrt{2\\Delta t}}", document.getElementById('trinomial-u-formula'));
        katex.render("m = 1", document.getElementById('trinomial-m-formula'));
        katex.render("d = \\frac{1}{u} = e^{-\\sigma\\sqrt{2\\Delta t}}", document.getElementById('trinomial-d-formula'));
        katex.render("p_u = \\left(\\frac{e^{(r-q)\\Delta t/2} - e^{-\\sigma\\sqrt{\\Delta t/2}}}{e^{\\sigma\\sqrt{\\Delta t/2}} - e^{-\\sigma\\sqrt{\\Delta t/2}}}\\right)^2", 
                   document.getElementById('trinomial-pu-formula'));
        katex.render("p_m = 1 - p_u - p_d", document.getElementById('trinomial-pm-formula'));
        katex.render("p_d = \\left(\\frac{e^{\\sigma\\sqrt{\\Delta t/2}} - e^{(r-q)\\Delta t/2}}{e^{\\sigma\\sqrt{\\Delta t/2}} - e^{-\\sigma\\sqrt{\\Delta t/2}}}\\right)^2", 
                   document.getElementById('trinomial-pd-formula'));
        
        // Formule récursive
        katex.render("V_{i,j} = \\max\\left\\{e^{-r\\Delta t}(p_u V_{i+1,j+1} + p_m V_{i+1,j} + p_d V_{i+1,j-1}), \\text{Payoff}(S_{i,j})\\right\\}", 
                   document.getElementById('trinomial-recursive-formula'));
    } catch (error) {
        console.error('Erreur lors du rendu des formules:', error);
    }
}

// Calculer le prix de l'option avec le modèle trinomial
function calculateTrinomial() {
    // Afficher l'indicateur de chargement
    document.getElementById('tree-loading').style.display = 'block';
    document.getElementById('calculate-btn').disabled = true;
    document.getElementById('calculate-btn').innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Calcul en cours...';
    
    // Récupérer les paramètres du formulaire
    const optionType = document.querySelector('input[name="optionType"]:checked').id;
    const optionStyle = document.querySelector('input[name="optionStyle"]:checked').id;
    const spotPrice = parseFloat(document.getElementById('spot-price').value);
    const strikePrice = parseFloat(document.getElementById('strike-price').value);
    const timeToMaturity = parseFloat(document.getElementById('time-to-maturity').value);
    const riskFreeRate = parseFloat(document.getElementById('risk-free-rate').value) / 100;
    const volatility = parseFloat(document.getElementById('volatility').value) / 100;
    const dividendYield = parseFloat(document.getElementById('dividend-yield').value) / 100;
    const steps = parseInt(document.getElementById('steps').value);
    
    // Stocker les paramètres
    optionParams = {
        optionType,
        optionStyle,
        spotPrice,
        strikePrice,
        timeToMaturity,
        riskFreeRate,
        volatility,
        dividendYield,
        steps
    };
    
    // Utiliser setTimeout pour ne pas bloquer l'interface utilisateur
    setTimeout(() => {
        try {
            // Calculer les paramètres du modèle trinomial
            const dt = timeToMaturity / steps;
            const u = Math.exp(volatility * Math.sqrt(2 * dt));
            const d = 1 / u;
            const m = 1; // Facteur du milieu (stagnation)
            
            // Probabilités de transition
            const pu = Math.pow((Math.exp((riskFreeRate - dividendYield) * dt/2) - Math.exp(-volatility * Math.sqrt(dt/2))) / 
                              (Math.exp(volatility * Math.sqrt(dt/2)) - Math.exp(-volatility * Math.sqrt(dt/2))), 2);
            const pd = Math.pow((Math.exp(volatility * Math.sqrt(dt/2)) - Math.exp((riskFreeRate - dividendYield) * dt/2)) / 
                              (Math.exp(volatility * Math.sqrt(dt/2)) - Math.exp(-volatility * Math.sqrt(dt/2))), 2);
            const pm = 1 - pu - pd;
            
            // Stocker les paramètres de l'arbre
            treeParams = { u, m, d, pu, pm, pd, dt };
            
            // Construire l'arbre trinomial
            const result = buildTrinomialTree();
            
            // Afficher les résultats
            displayResults();
            
            // Créer la visualisation de l'arbre
            createTrinomialTreeVisualization();
            
            // Afficher un message de succès
            showNotification('Calcul effectué avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur:', error);
            showNotification('Erreur lors du calcul: ' + error.message, 'error');
        } finally {
            // Masquer l'indicateur de chargement et réactiver le bouton
            document.getElementById('tree-loading').style.display = 'none';
            document.getElementById('calculate-btn').disabled = false;
            document.getElementById('calculate-btn').innerHTML = '<i class="fas fa-calculator me-2"></i>Calculer';
        }
    }, 100);
}

// Construire l'arbre trinomial
function buildTrinomialTree() {
    const { optionType, optionStyle, spotPrice, strikePrice, steps } = optionParams;
    const { u, m, d, pu, pm, pd, dt } = treeParams;
    const r = optionParams.riskFreeRate;
    
    // Initialiser les tableaux pour les prix et les valeurs d'option
    const priceTree = [];
    const optionTree = [];
    const exerciseFlags = [];
    
    for (let i = 0; i <= steps; i++) {
        priceTree[i] = [];
        optionTree[i] = [];
        exerciseFlags[i] = [];
        
        const nodeCount = 2 * i + 1;
        
        for (let j = 0; j < nodeCount; j++) {
            // Pour un arbre trinomial, nous avons 2*i+1 nœuds à l'étape i
            // Le nœud central (j = i) représente le cas où le prix est resté inchangé
            // Les nœuds j < i représentent des mouvements vers le haut (u)
            // Les nœuds j > i représentent des mouvements vers le bas (d)
            
            const position = j - i;  // Position relative au nœud central (0)
            const price = spotPrice * Math.pow(u, position);
            priceTree[i][j] = price;
            
            // À l'échéance, calculer les payoffs
            if (i === steps) {
                if (optionType === 'call') {
                    optionTree[i][j] = Math.max(0, price - strikePrice);
                } else { // put
                    optionTree[i][j] = Math.max(0, strikePrice - price);
                }
                exerciseFlags[i][j] = optionTree[i][j] > 0;
            }
        }
    }
    
    // Remonter l'arbre pour calculer les valeurs de l'option
    const discount = Math.exp(-r * dt);
    
    for (let i = steps - 1; i >= 0; i--) {
        for (let j = 0; j < 2 * i + 1; j++) {
            // Pour chaque nœud, calculer la valeur espérée actualisée
            const expectedValue = discount * (
                pu * optionTree[i + 1][j] + 
                pm * optionTree[i + 1][j + 1] + 
                pd * optionTree[i + 1][j + 2]
            );
            
            if (optionStyle === 'european') {
                optionTree[i][j] = expectedValue;
                exerciseFlags[i][j] = false;
            } else { // american
                // Pour une option américaine, comparer avec la valeur d'exercice immédiat
                let exerciseValue;
                if (optionType === 'call') {
                    exerciseValue = Math.max(0, priceTree[i][j] - strikePrice);
                } else { // put
                    exerciseValue = Math.max(0, strikePrice - priceTree[i][j]);
                }
                
                optionTree[i][j] = Math.max(expectedValue, exerciseValue);
                exerciseFlags[i][j] = exerciseValue > expectedValue && exerciseValue > 0;
            }
        }
    }
    
    // Calculer les grecques
    const delta = calculateDelta(optionTree, priceTree);
    const gamma = calculateGamma(optionTree, priceTree);
    
    // Calculer les prix de référence pour comparaison
    const bsPrice = calculateBlackScholesPrice();
    const binPrice = calculateBinomialPrice();
    
    treeData = {
        priceTree,
        optionTree,
        exerciseFlags
    };
    
    // Stocker les résultats
    optionResults = {
        price: optionTree[0][0],
        delta,
        gamma,
        bsPrice,
        binPrice,
        bsDiff: (optionTree[0][0] - bsPrice) / bsPrice * 100,
        binDiff: (optionTree[0][0] - binPrice) / binPrice * 100
    };
    
    return treeData;
}

// Calculer le delta (sensibilité au prix spot)
function calculateDelta(optionTree, priceTree) {
    // Delta = (V(up) - V(down)) / (S(up) - S(down))
    const upOptionPrice = optionTree[1][0];
    const downOptionPrice = optionTree[1][2];
    const upSpotPrice = priceTree[1][0];
    const downSpotPrice = priceTree[1][2];
    
    return (upOptionPrice - downOptionPrice) / (upSpotPrice - downSpotPrice);
}

// Calculer le gamma (sensibilité du delta)
function calculateGamma(optionTree, priceTree) {
    // Pour calculer gamma, on a besoin de trois points
    const upOptionPrice = optionTree[1][0];
    const midOptionPrice = optionTree[1][1];
    const downOptionPrice = optionTree[1][2];
    const upSpotPrice = priceTree[1][0];
    const midSpotPrice = priceTree[1][1];
    const downSpotPrice = priceTree[1][2];
    
    // Calculer les deltas
    const deltaUp = (upOptionPrice - midOptionPrice) / (upSpotPrice - midSpotPrice);
    const deltaDown = (midOptionPrice - downOptionPrice) / (midSpotPrice - downSpotPrice);
    
    // Gamma = (deltaUp - deltaDown) / ((S(up) - S(down))/2)
    const avgSpotDiff = (upSpotPrice - downSpotPrice) / 2;
    return (deltaUp - deltaDown) / avgSpotDiff;
}

// Calculer le prix Black-Scholes pour comparaison
function calculateBlackScholesPrice() {
    const { optionType, spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, dividendYield } = optionParams;
    
    // Formule standard de Black-Scholes
    const d1 = (Math.log(spotPrice / strikePrice) + 
              (riskFreeRate - dividendYield + 0.5 * volatility * volatility) * timeToMaturity) / 
              (volatility * Math.sqrt(timeToMaturity));
    const d2 = d1 - volatility * Math.sqrt(timeToMaturity);
    
    if (optionType === 'call') {
        return spotPrice * Math.exp(-dividendYield * timeToMaturity) * normalCDF(d1) - 
              strikePrice * Math.exp(-riskFreeRate * timeToMaturity) * normalCDF(d2);
    } else {
        return strikePrice * Math.exp(-riskFreeRate * timeToMaturity) * normalCDF(-d2) - 
              spotPrice * Math.exp(-dividendYield * timeToMaturity) * normalCDF(-d1);
    }
}

// Calculer le prix avec le modèle binomial pour comparaison
function calculateBinomialPrice() {
    const { optionType, optionStyle, spotPrice, strikePrice, timeToMaturity, riskFreeRate, volatility, dividendYield, steps } = optionParams;
    
    // Paramètres du modèle binomial
    const dt = timeToMaturity / steps;
    const u = Math.exp(volatility * Math.sqrt(dt));
    const d = 1 / u;
    const p = (Math.exp((riskFreeRate - dividendYield) * dt) - d) / (u - d);
    
    // Initialiser l'arbre des prix et des valeurs d'option
    const priceTree = [];
    const optionTree = [];
    
    // Construire l'arbre des prix
    for (let i = 0; i <= steps; i++) {
        priceTree[i] = [];
        optionTree[i] = [];
        
        for (let j = 0; j <= i; j++) {
            priceTree[i][j] = spotPrice * Math.pow(u, j) * Math.pow(d, i - j);
            
            // À l'échéance, calculer les payoffs
            if (i === steps) {
                if (optionType === 'call') {
                    optionTree[i][j] = Math.max(0, priceTree[i][j] - strikePrice);
                } else {
                    optionTree[i][j] = Math.max(0, strikePrice - priceTree[i][j]);
                }
            }
        }
    }
    
    // Remonter l'arbre
    const discount = Math.exp(-riskFreeRate * dt);
    
    for (let i = steps - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            // Valeur espérée actualisée
            const expectedValue = discount * (p * optionTree[i + 1][j + 1] + (1 - p) * optionTree[i + 1][j]);
            
            if (optionStyle === 'european') {
                optionTree[i][j] = expectedValue;
            } else { // american
                // Pour une option américaine, comparer avec la valeur d'exercice immédiat
                let exerciseValue;
                if (optionType === 'call') {
                    exerciseValue = Math.max(0, priceTree[i][j] - strikePrice);
                } else {
                    exerciseValue = Math.max(0, strikePrice - priceTree[i][j]);
                }
                
                optionTree[i][j] = Math.max(expectedValue, exerciseValue);
            }
        }
    }
    
    return optionTree[0][0];
}

// Afficher les résultats dans l'interface
function displayResults() {
    // Prix et grecques
    document.getElementById('option-price').textContent = optionResults.price.toFixed(4);
    document.getElementById('delta-value').textContent = optionResults.delta.toFixed(4);
    document.getElementById('gamma-value').textContent = optionResults.gamma.toFixed(4);
    
    // Paramètres de l'arbre
    document.getElementById('u-factor').textContent = treeParams.u.toFixed(4);
    document.getElementById('m-factor').textContent = treeParams.m.toFixed(4);
    document.getElementById('d-factor').textContent = treeParams.d.toFixed(4);
    document.getElementById('probabilities').textContent = 
        `pu=${treeParams.pu.toFixed(3)}, pm=${treeParams.pm.toFixed(3)}, pd=${treeParams.pd.toFixed(3)}`;
    
    // Comparaisons
    document.getElementById('bs-price').textContent = optionResults.bsPrice.toFixed(4);
    document.getElementById('bin-price').textContent = optionResults.binPrice.toFixed(4);
    
    // Différences
    const bsDiff = document.getElementById('bs-diff');
    bsDiff.textContent = `${optionResults.bsDiff.toFixed(2)}%`;
    bsDiff.className = optionResults.bsDiff > 0 ? 'comparison-diff positive' : 'comparison-diff negative';
    
    const binDiff = document.getElementById('bin-diff');
    binDiff.textContent = `${optionResults.binDiff.toFixed(2)}%`;
    binDiff.className = optionResults.binDiff > 0 ? 'comparison-diff positive' : 'comparison-diff negative';
    
    // Option américaine
    if (optionParams.optionStyle === 'american') {
        document.querySelectorAll('.american-only').forEach(el => {
            el.style.display = 'flex';
        });
    } else {
        document.querySelectorAll('.american-only').forEach(el => {
            el.style.display = 'none';
        });
    }
}

// Créer une visualisation simplifiée de l'arbre trinomial
function createTrinomialTreeVisualization() {
    const container = document.getElementById('trinomial-tree-container');
    container.innerHTML = '';
    
    const width = container.clientWidth;
    const height = 450;
    const margin = { top: 30, right: 30, bottom: 30, left: 30 };
    
    // Créer l'élément SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    container.appendChild(svg);
    
    // Créer un groupe pour contenir l'arbre
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${margin.left}, ${margin.top})`);
    svg.appendChild(g);
    
    // Nombre d'étapes
    const steps = optionParams.steps;
    
    // Dimensions
    const nodeRadius = 15;
    const horizontalSpacing = (width - margin.left - margin.right) / (steps > 0 ? steps : 1);
    const verticalSpacing = nodeRadius * 4;
    
    // Créer les nœuds et les liens
    for (let i = 0; i <= steps; i++) {
        const nodeCount = 2 * i + 1;
        const centerY = height / 2;
        
        for (let j = 0; j < nodeCount; j++) {
            // Position du nœud
            const x = i * horizontalSpacing;
            const y = centerY + (j - i) * verticalSpacing;
            
            // Créer le nœud (cercle)
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', nodeRadius);
            circle.setAttribute('fill', '#fff');
            circle.setAttribute('stroke', treeData.exerciseFlags[i][j] ? '#FF9800' : '#4CAF50');
            circle.setAttribute('stroke-width', 2);
            circle.setAttribute('class', 'node');
            g.appendChild(circle);
            
            // Ajouter le prix
            const priceText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            priceText.setAttribute('x', x);
            priceText.setAttribute('y', y - 20);
            priceText.setAttribute('text-anchor', 'middle');
            priceText.setAttribute('class', 'node-price');
            priceText.textContent = treeData.priceTree[i][j].toFixed(2);
            g.appendChild(priceText);
            
            // Ajouter la valeur de l'option
            const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            valueText.setAttribute('x', x);
            valueText.setAttribute('y', y);
            valueText.setAttribute('text-anchor', 'middle');
            valueText.setAttribute('class', 'node-value');
            valueText.textContent = treeData.optionTree[i][j].toFixed(2);
            g.appendChild(valueText);
            
            // Ajouter les probabilités (pour les nœuds non terminaux)
            if (i < steps) {
                const probText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                probText.setAttribute('x', x);
                probText.setAttribute('y', y + 20);
                probText.setAttribute('text-anchor', 'middle');
                probText.setAttribute('class', 'node-probability');
                probText.setAttribute('opacity', '0');
                probText.textContent = `${treeParams.pu.toFixed(2)}, ${treeParams.pm.toFixed(2)}, ${treeParams.pd.toFixed(2)}`;
                g.appendChild(probText);
                
                // Ajouter les liens vers les nœuds de l'étape suivante
                // Lien haut
                if (j < nodeCount + 1) {
                    const linkUp = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    linkUp.setAttribute('x1', x);
                    linkUp.setAttribute('y1', y);
                    linkUp.setAttribute('x2', x + horizontalSpacing);
                    linkUp.setAttribute('y2', y - verticalSpacing);
                    linkUp.setAttribute('stroke', '#ccc');
                    linkUp.setAttribute('stroke-width', 1.5);
                    g.appendChild(linkUp);
                }
                
                // Lien milieu
                const linkMiddle = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                linkMiddle.setAttribute('x1', x);
                linkMiddle.setAttribute('y1', y);
                linkMiddle.setAttribute('x2', x + horizontalSpacing);
                linkMiddle.setAttribute('y2', y);
                linkMiddle.setAttribute('stroke', '#ccc');
                linkMiddle.setAttribute('stroke-width', 1.5);
                g.appendChild(linkMiddle);
                
                // Lien bas
                if (j + 1 < nodeCount + 2) {
                    const linkDown = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                    linkDown.setAttribute('x1', x);
                    linkDown.setAttribute('y1', y);
                    linkDown.setAttribute('x2', x + horizontalSpacing);
                    linkDown.setAttribute('y2', y + verticalSpacing);
                    linkDown.setAttribute('stroke', '#ccc');
                    linkDown.setAttribute('stroke-width', 1.5);
                    g.appendChild(linkDown);
                }
            }
        }
    }
    
    // Afficher la vue par défaut (prix)
    updateTreeVisualization('price');
}

// Mettre à jour la visualisation de l'arbre
function updateTreeVisualization(viewType) {
    const container = document.getElementById('trinomial-tree-container');
    
    // Vérifier si l'arbre existe
    if (!container.querySelector('svg')) return;
    
    // Mettre à jour la visibilité des textes selon la vue sélectionnée
    const priceElements = container.querySelectorAll('.node-price');
    const valueElements = container.querySelectorAll('.node-value');
    const probElements = container.querySelectorAll('.node-probability');
    
    switch (viewType) {
        case 'price':
            priceElements.forEach(el => {
                el.style.opacity = '1';
                el.style.fontWeight = 'bold';
            });
            valueElements.forEach(el => {
                el.style.opacity = '0.3';
                el.style.fontWeight = 'normal';
            });
            probElements.forEach(el => {
                el.style.opacity = '0';
            });
            break;
        case 'option':
            priceElements.forEach(el => {
                el.style.opacity = '0.3';
                el.style.fontWeight = 'normal';
            });
            valueElements.forEach(el => {
                el.style.opacity = '1';
                el.style.fontWeight = 'bold';
            });
            probElements.forEach(el => {
                el.style.opacity = '0';
            });
            break;
        case 'probability':
            priceElements.forEach(el => {
                el.style.opacity = '0.3';
                el.style.fontWeight = 'normal';
            });
            valueElements.forEach(el => {
                el.style.opacity = '0.3';
                el.style.fontWeight = 'normal';
            });
            probElements.forEach(el => {
                el.style.opacity = '1';
                el.style.fontWeight = 'bold';
            });
            break;
    }
}

// Exporter les résultats
function exportResults() {
    const exportData = {
        parameters: optionParams,
        treeParameters: treeParams,
        results: optionResults
    };
    
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `trinomial_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Résultats exportés avec succès', 'success');
}

// Fonction de distribution normale cumulative (CDF)
function normalCDF(x) {
    // Approximation de la fonction de répartition normale
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    
    const sign = x < 0 ? -1 : 1;
    const absX = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * absX);
    const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
    
    return 0.5 * (1.0 + sign * y);
}

// Fonction de densité normale (PDF)
function normalPDF(x) {
    return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Si la fonction existe dans main.js, l'utiliser
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Sinon, implémentation locale simplifiée
    alert(message);
}
    */