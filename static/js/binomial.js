/**
 * OptionPricer - Modèle Binomial (sans dividendes)
 * Développé par Hajji Achraf
 * Date: 2025-10-19
 */

// Variables globales
let optionParams = {};
let binomialTree = {};
let optionResults = {};
let treeVisualization = {
    zoomLevel: 1,
    mode: 'price' // 'price' ou 'option'
};

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM chargé, initialisation du modèle binomial...");
    
    // Message initial dans le conteneur d'arbre
    const treeContainer = document.getElementById('binomial-tree-container');
    if (treeContainer) {
        treeContainer.innerHTML = `
            <div class="alert alert-info">
                <strong>État initial :</strong> En attente du calcul de l'arbre binomial...
                <br>
                <small>Cliquez sur "Calculer" pour générer l'arbre.</small>
            </div>
        `;
    }
    
    // Initialiser les formules avec KaTeX
    renderFormulas();
    
    // Ajouter les écouteurs d'événements
    const form = document.getElementById('binomial-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            calculateBinomialOption();
        });
    }
    
    // Écouteurs pour les boutons de contrôle de l'arbre
    setupEventListeners();
});

// Configurer tous les écouteurs d'événements
function setupEventListeners() {
    // Boutons de vue de l'arbre
    const viewPriceBtn = document.getElementById('view-price-tree');
    if (viewPriceBtn) {
        viewPriceBtn.addEventListener('click', function() {
            switchTreeView('price');
        });
    }
    
    const viewOptionBtn = document.getElementById('view-option-tree');
    if (viewOptionBtn) {
        viewOptionBtn.addEventListener('click', function() {
            switchTreeView('option');
        });
    }
    
    // Contrôles du nombre d'étapes
    const increaseBtn = document.getElementById('increase-steps');
    if (increaseBtn) {
        increaseBtn.addEventListener('click', function() {
            const stepsInput = document.getElementById('steps');
            if (parseInt(stepsInput.value) < parseInt(stepsInput.max)) {
                stepsInput.value = parseInt(stepsInput.value) + 1;
            }
        });
    }
    
    const decreaseBtn = document.getElementById('decrease-steps');
    if (decreaseBtn) {
        decreaseBtn.addEventListener('click', function() {
            const stepsInput = document.getElementById('steps');
            if (parseInt(stepsInput.value) > parseInt(stepsInput.min)) {
                stepsInput.value = parseInt(stepsInput.value) - 1;
            }
        });
    }
    
    // Contrôles de zoom pour l'arbre
    const zoomInBtn = document.getElementById('zoom-in');
    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', function() {
            zoomTree(1.2);
        });
    }
    
    const zoomOutBtn = document.getElementById('zoom-out');
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', function() {
            zoomTree(0.8);
        });
    }
    
    const zoomResetBtn = document.getElementById('zoom-reset');
    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', function() {
            resetTreeZoom();
        });
    }
    
    // Écouteur pour le style d'option (européenne/américaine)
    const europeanBtn = document.getElementById('european');
    if (europeanBtn) {
        europeanBtn.addEventListener('change', function() {
            document.querySelectorAll('.american-only').forEach(el => {
                el.style.display = 'none';
            });
        });
    }
    
    const americanBtn = document.getElementById('american');
    if (americanBtn) {
        americanBtn.addEventListener('change', function() {
            document.querySelectorAll('.american-only').forEach(el => {
                el.style.display = 'flex';
            });
        });
    }
    
    // Écouteur pour l'export des résultats
    const exportBtn = document.getElementById('export-results');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportResults);
    }
}

// Rendu des formules mathématiques
function renderFormulas() {
    try {
        // Formules principales
        if (document.getElementById('binomial-formula')) {
            katex.render("C_t = e^{-r\\Delta t}[pC_{t+\\Delta t}^u + (1-p)C_{t+\\Delta t}^d]", document.getElementById('binomial-formula'));
        }
        
        // Paramètres du modèle binomial (sans dividendes)
        if (document.getElementById('binomial-u-formula')) {
            katex.render("u = e^{\\sigma\\sqrt{\\Delta t}}", document.getElementById('binomial-u-formula'));
        }
        
        if (document.getElementById('binomial-d-formula')) {
            katex.render("d = e^{-\\sigma\\sqrt{\\Delta t}} = \\frac{1}{u}", document.getElementById('binomial-d-formula'));
        }
        
        if (document.getElementById('binomial-p-formula')) {
            katex.render("p = \\frac{e^{r\\Delta t} - d}{u - d}", document.getElementById('binomial-p-formula'));
        }
        
        // Formule récursive
        if (document.getElementById('binomial-recursive-formula')) {
            katex.render("V_{i,j} = \\begin{cases} \\max\\{\\text{Payoff}(S_{i,j}), e^{-r\\Delta t}[pV_{i+1,j+1} + (1-p)V_{i+1,j}]\\} & \\text{si américaine} \\\\ e^{-r\\Delta t}[pV_{i+1,j+1} + (1-p)V_{i+1,j}] & \\text{si européenne} \\end{cases}", document.getElementById('binomial-recursive-formula'));
        }
        
    } catch (error) {
        console.error('Erreur lors du rendu des formules:', error);
    }
}

// Calcul de l'option avec le modèle binomial
function calculateBinomialOption() {
    // Récupérer les paramètres du formulaire
    const optionType = document.querySelector('input[name="optionType"]:checked').id;
    const optionStyle = document.querySelector('input[name="optionStyle"]:checked').id;
    const spotPrice = parseFloat(document.getElementById('spot-price').value);
    const strikePrice = parseFloat(document.getElementById('strike-price').value);
    const timeToMaturity = parseFloat(document.getElementById('time-to-maturity').value);
    const riskFreeRate = parseFloat(document.getElementById('risk-free-rate').value) / 100;
    const volatility = parseFloat(document.getElementById('volatility').value) / 100;
    const steps = parseInt(document.getElementById('steps').value);
    
    // Vérifier que les valeurs sont valides
    if (isNaN(spotPrice) || isNaN(strikePrice) || isNaN(timeToMaturity) || 
        isNaN(riskFreeRate) || isNaN(volatility) || isNaN(steps)) {
        showNotification("Veuillez entrer des valeurs numériques valides", "error");
        return;
    }
    
    if (spotPrice <= 0 || strikePrice <= 0 || timeToMaturity <= 0 || volatility <= 0 || steps <= 0) {
        showNotification("Les valeurs doivent être strictement positives", "error");
        return;
    }
    
    // Stocker les paramètres
    optionParams = {
        optionType,
        optionStyle,
        spotPrice,
        strikePrice,
        timeToMaturity,
        riskFreeRate,
        volatility,
        steps
    };
    
    // Afficher l'indicateur de chargement
    document.getElementById('binomial-tree-container').innerHTML = `
        <div class="d-flex justify-content-center align-items-center w-100 h-100">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Chargement...</span>
            </div>
            <span class="ms-3">Construction de l'arbre binomial...</span>
        </div>
    `;
    
    // Calculer avec un petit délai pour permettre l'affichage de l'indicateur
    setTimeout(() => {
        try {
            // Calculer les paramètres du modèle binomial (sans dividendes)
            const dt = timeToMaturity / steps;
            const u = Math.exp(volatility * Math.sqrt(dt));
            const d = 1 / u;
            const p = (Math.exp(riskFreeRate * dt) - d) / (u - d);
            
            // Vérifier que les probabilités sont valides
            if (p < 0 || p > 1) {
                showNotification("Paramètres invalides: la probabilité de hausse calculée est " + p.toFixed(4), "error");
                return;
            }
            
            // Construire l'arbre binomial
            binomialTree = buildBinomialTree(optionParams, u, d, p, dt);
            
            // Stocker les résultats
            optionResults = {
                price: binomialTree.optionTree[0][0],
                u: u,
                d: d,
                p: p,
                tree: binomialTree
            };
            
            // Afficher les résultats
            displayResults();
            
            // Visualiser l'arbre
            visualizeBinomialTree(binomialTree);
            
            // Notification de succès
            showNotification("Calcul effectué avec succès", "success");
            
        } catch (error) {
            console.error("Erreur lors du calcul:", error);
            showNotification("Erreur lors du calcul: " + error.message, "error");
        }
    }, 100);
}

// Construire l'arbre binomial
function buildBinomialTree(params, u, d, p, dt) {
    const { optionType, optionStyle, spotPrice, strikePrice, riskFreeRate, steps } = params;
    
    // Initialiser les arbres de prix et d'option
    const priceTree = Array(steps + 1).fill().map(() => Array(0));
    const optionTree = Array(steps + 1).fill().map(() => Array(0));
    const exerciseFlags = Array(steps + 1).fill().map(() => Array(0));
    
    // Construire l'arbre des prix (de t=0 à t=T)
    for (let i = 0; i <= steps; i++) {
        for (let j = 0; j <= i; j++) {
            // Prix à ce nœud: S * u^j * d^(i-j)
            priceTree[i][j] = spotPrice * Math.pow(u, j) * Math.pow(d, i - j);
            
            // À l'échéance, calculer la valeur intrinsèque
            if (i === steps) {
                if (optionType === 'call') {
                    optionTree[i][j] = Math.max(0, priceTree[i][j] - strikePrice);
                } else { // put
                    optionTree[i][j] = Math.max(0, strikePrice - priceTree[i][j]);
                }
                exerciseFlags[i][j] = optionTree[i][j] > 0;
            }
        }
    }
    
    // Remonter l'arbre (backward induction) de t=T-dt à t=0
    const discount = Math.exp(-riskFreeRate * dt);
    
    for (let i = steps - 1; i >= 0; i--) {
        for (let j = 0; j <= i; j++) {
            // Calculer la valeur de continuation
            const continuation = discount * (p * optionTree[i + 1][j + 1] + (1 - p) * optionTree[i + 1][j]);
            
            // Calculer la valeur intrinsèque
            let intrinsic = 0;
            if (optionType === 'call') {
                intrinsic = Math.max(0, priceTree[i][j] - strikePrice);
            } else { // put
                intrinsic = Math.max(0, strikePrice - priceTree[i][j]);
            }
            
            // Décider si exercer ou continuer
            if (optionStyle === 'european') {
                optionTree[i][j] = continuation;
                exerciseFlags[i][j] = false;
            } else { // american
                optionTree[i][j] = Math.max(intrinsic, continuation);
                exerciseFlags[i][j] = intrinsic > continuation && intrinsic > 0;
            }
        }
    }
    
    return {
        priceTree,
        optionTree,
        exerciseFlags,
        steps,
        u,
        d,
        p
    };
}

// Afficher les résultats
function displayResults() {
    // Afficher le prix de l'option
    document.getElementById('option-price').textContent = optionResults.price.toFixed(4);
    
    // Afficher les paramètres de l'arbre
    document.getElementById('u-factor').textContent = optionResults.u.toFixed(4);
    document.getElementById('d-factor').textContent = optionResults.d.toFixed(4);
    document.getElementById('p-prob').textContent = optionResults.p.toFixed(4);
    
    // Afficher ou masquer les éléments spécifiques aux options américaines
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

// Visualiser l'arbre binomial avec D3.js
function visualizeBinomialTree(tree) {
    // Nettoyer le conteneur
    const container = document.getElementById('binomial-tree-container');
    container.innerHTML = '';
    
    // Dimensions et marges
    const margin = { top: 40, right: 120, bottom: 40, left: 120 };
    const width = container.clientWidth - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
    
    // Créer l'élément SVG
    const svg = d3.select(container)
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("id", "tree-svg-container");
    
    // Convertir l'arbre en structure de données hiérarchique pour D3
    const root = convertTreeToHierarchy(tree);
    
    // Créer le layout d'arbre
    const treeLayout = d3.tree()
        .size([height, width]);
    
    // Calculer les positions des nœuds
    const treeData = treeLayout(root);
    
    // Créer les liens entre les nœuds
    const links = svg.selectAll(".link")
        .data(treeData.links())
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x));
    
    // Créer les nœuds
    const nodes = svg.selectAll(".node")
        .data(treeData.descendants())
        .enter().append("g")
        .attr("class", d => "node" + (d.children ? " node-internal" : " node-leaf"))
        .attr("transform", d => `translate(${d.y},${d.x})`);
    
    // Ajouter les cercles aux nœuds
    nodes.append("circle")
        .attr("r", 5)
        .attr("class", d => {
            if (d.data.exercise) return "node-exercise";
            return "node-normal";
        });
    
    // Ajouter les valeurs de prix
    nodes.append("text")
        .attr("dy", "-1.2em")
        .attr("x", d => d.children ? -13 : 13)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .attr("class", "node-price")
        .text(d => `S=${d.data.price.toFixed(2)}`);
    
    // Ajouter les valeurs d'option
    nodes.append("text")
        .attr("dy", "1.2em")
        .attr("x", d => d.children ? -13 : 13)
        .attr("text-anchor", d => d.children ? "end" : "start")
        .attr("class", d => {
            if (d.data.exercise) return "node-exercise";
            return "node-value";
        })
        .text(d => `V=${d.data.option.toFixed(2)}`);
    
    // Sauvegarder la référence à la visualisation pour le zoom
    treeVisualization.svg = svg;
    
    // Initialiser le mode d'affichage (prix ou option)
    switchTreeView('price');
}

// Convertir l'arbre binomial en structure hiérarchique pour D3
function convertTreeToHierarchy(tree) {
    // Fonction récursive pour construire l'arbre
    function buildNode(i, j, tree) {
        if (i > tree.steps) return null;
        
        // Créer un nœud
        const node = {
            price: tree.priceTree[i][j],
            option: tree.optionTree[i][j],
            exercise: tree.exerciseFlags[i][j],
            children: []
        };
        
        // Ajouter les enfants (nœuds au pas de temps suivant)
        if (i < tree.steps) {
            const upChild = buildNode(i + 1, j + 1, tree);
            const downChild = buildNode(i + 1, j, tree);
            
            if (upChild) node.children.push(upChild);
            if (downChild) node.children.push(downChild);
        }
        
        return node;
    }
    
    // Commencer à la racine (t=0)
    const rootNode = buildNode(0, 0, tree);
    
    // Convertir en hiérarchie D3
    return d3.hierarchy(rootNode);
}

// Changer le mode d'affichage de l'arbre (prix ou valeur d'option)
function switchTreeView(mode) {
    // Mettre à jour le mode actif
    treeVisualization.mode = mode;
    
    // Mettre à jour la classe active des boutons
    if (mode === 'price') {
        document.getElementById('view-price-tree').classList.add('active');
        document.getElementById('view-option-tree').classList.remove('active');
    } else {
        document.getElementById('view-price-tree').classList.remove('active');
        document.getElementById('view-option-tree').classList.add('active');
    }
    
    // Mettre à jour la visualisation
    const svg = treeVisualization.svg;
    if (!svg) return;
    
    // Mettre à jour les classes des nœuds pour l'affichage
    svg.selectAll(".node-price")
        .style("font-weight", mode === 'price' ? "bold" : "normal")
        .style("font-size", mode === 'price' ? "12px" : "10px")
        .style("opacity", mode === 'price' ? 1 : 0.6);
    
    svg.selectAll(".node-value, .node-exercise")
        .style("font-weight", mode === 'option' ? "bold" : "normal")
        .style("font-size", mode === 'option' ? "12px" : "10px")
        .style("opacity", mode === 'option' ? 1 : 0.6);
}

// Fonctions de zoom pour l'arbre
function zoomTree(factor) {
    treeVisualization.zoomLevel *= factor;
    
    const svg = document.getElementById('tree-svg-container');
    if (svg) {
        svg.style.transform = `scale(${treeVisualization.zoomLevel})`;
        svg.style.transformOrigin = 'center';
    }
}

function resetTreeZoom() {
    treeVisualization.zoomLevel = 1;
    
    const svg = document.getElementById('tree-svg-container');
    if (svg) {
        svg.style.transform = 'scale(1)';
    }
}

// Exporter les résultats
function exportResults() {
    // Vérifier que des résultats sont disponibles
    if (!optionResults.price) {
        showNotification("Aucun résultat à exporter. Veuillez d'abord calculer le prix de l'option.", "warning");
        return;
    }
    
    // Créer un objet avec les données à exporter
    const exportData = {
        parameters: optionParams,
        results: {
            price: optionResults.price,
            u: optionResults.u,
            d: optionResults.d,
            p: optionResults.p
        },
        timestamp: new Date().toISOString()
    };
    
    // Convertir en JSON
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `binomial_results_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Résultats exportés avec succès', 'success');
}

// Afficher une notification
function showNotification(message, type = 'info') {
    // Si une fonction globale showNotification existe, l'utiliser
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
        return;
    }
    
    // Sinon, implémenter localement
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