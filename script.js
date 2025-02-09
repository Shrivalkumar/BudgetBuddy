class BudgetBuddy {
    constructor() {
        this.SPOONACULAR_API_KEY = '1f7088a35fe24c92bf755618b143b800';
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.init();
    }

    init() {
        this.updateUI();
        this.setupEventListeners();
        this.searchDeals();
        this.searchRecipes();
    }

    setupEventListeners() {
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Add event listeners for search inputs
        document.getElementById('recipe-search')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.searchRecipes();
        });

        document.getElementById('game-search')?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.searchDeals();
        });
    }

    addTransaction() {
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const description = document.getElementById('description').value;

        if (!amount || !description) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            amount,
            type,
            description,
            date: new Date().toISOString()
        };

        this.transactions.push(transaction);
        this.saveToLocalStorage();
        this.updateUI();
        this.showNotification('Transaction added successfully', 'success');
        document.getElementById('transaction-form').reset();
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.updateUI();
            this.showNotification('Transaction deleted', 'success');
        }
    }

    async searchRecipes() {
        const query = document.getElementById('recipe-search').value || 'budget';
        const container = document.getElementById('recipes-container');
        
        try {
            container.innerHTML = '<div class="loading">Searching recipes...</div>';
            
            const response = await fetch(
                `https://api.spoonacular.com/recipes/complexSearch?apiKey=${this.SPOONACULAR_API_KEY}&query=${query}&maxPrice=5&number=3&addRecipeNutrition=true`
            );
            const data = await response.json();

            if (data.results.length === 0) {
                container.innerHTML = '<div class="no-results">No recipes found</div>';
                return;
            }

            this.displayRecipes(data.results);
        } catch (error) {
            console.error('Error fetching recipes:', error);
            container.innerHTML = '<div class="error">Error loading recipes</div>';
        }
    }

    displayRecipes(recipes) {
        const container = document.getElementById('recipes-container');
        container.innerHTML = '';

        recipes.forEach(recipe => {
            const pricePerServing = (recipe.pricePerServing / 100).toFixed(2);
            const card = document.createElement('div');
            card.className = 'recipe-card';
            card.innerHTML = `
                <div class="recipe-image-container">
                    <img src="${recipe.image}" alt="${recipe.title}" class="recipe-image">
                    <div class="recipe-overlay">
                        <span class="recipe-time">
                            <i class="fas fa-clock"></i> ${recipe.readyInMinutes || 'N/A'} min
                        </span>
                    </div>
                </div>
                <div class="recipe-info">
                    <h4 class="recipe-title">${recipe.title}</h4>
                    
                    <div class="recipe-details">
                        <div class="detail-item">
                            <span class="detail-label">Time</span>
                            <span class="detail-value">${recipe.readyInMinutes || 'N/A'}min</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Servings</span>
                            <span class="detail-value">${recipe.servings || '1'}</span>
                        </div>
                    </div>

                    <span class="recipe-price">$${pricePerServing} per serving</span>

                    <div class="nutrition-tags">
                        ${recipe.diets ? recipe.diets.slice(0, 3).map(diet => 
                            `<span class="nutrition-tag">${diet}</span>`
                        ).join('') : ''}
                    </div>

                    <button onclick="app.getRecipeDetails(${recipe.id})">
                        <i class="fas fa-utensils"></i> View Recipe
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    async searchDeals() {
        const container = document.getElementById('deals-container');
        
        try {
            container.innerHTML = '<div class="loading">Finding best deals...</div>';
            
            const response = await fetch('https://www.cheapshark.com/api/1.0/deals?storeID=1&upperPrice=15&pageSize=3');
            const deals = await response.json();

            if (deals.length === 0) {
                container.innerHTML = '<div class="no-results">No deals found</div>';
                return;
            }

            this.displayDeals(deals);
        } catch (error) {
            console.error('Error fetching deals:', error);
            container.innerHTML = '<div class="error">Error loading deals</div>';
        }
    }

    displayDeals(deals) {
        const container = document.getElementById('deals-container');
        container.innerHTML = '';

        deals.forEach(deal => {
            const savings = ((deal.normalPrice - deal.salePrice) / deal.normalPrice * 100).toFixed(0);
            const card = document.createElement('div');
            card.className = 'deal-card';
            card.innerHTML = `
                <h4>${deal.title}</h4>
                <div class="price-info">
                    <span class="original-price">$${deal.normalPrice}</span>
                    <span class="deal-price">$${deal.salePrice}</span>
                </div>
                <span class="savings">Save ${savings}%</span>
                <button onclick="window.open('https://www.cheapshark.com/redirect?dealID=${deal.dealID}')">
                    <i class="fas fa-shopping-cart"></i> Get Deal
                </button>
            `;
            container.appendChild(card);
        });
    }

    async getRecipeDetails(recipeId) {
        try {
            const response = await fetch(
                `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${this.SPOONACULAR_API_KEY}`
            );
            const recipe = await response.json();
            
            const details = `
                Recipe: ${recipe.title}
                Time to Cook: ${recipe.readyInMinutes} minutes
                Servings: ${recipe.servings}
                Cost per serving: $${(recipe.pricePerServing / 100).toFixed(2)}
                
                Instructions: ${recipe.instructions || 'Not available'}
            `;
            
            alert(details); // You might want to replace this with a modal
        } catch (error) {
            console.error('Error fetching recipe details:', error);
            this.showNotification('Error loading recipe details', 'error');
        }
    }

    updateUI() {
        this.updateBalance();
        this.updateTransactionsList();
    }

    updateBalance() {
        const totals = this.calculateTotals();
        document.getElementById('total-balance').textContent = this.formatCurrency(totals.balance);
        document.getElementById('total-income').textContent = this.formatCurrency(totals.income);
        document.getElementById('total-expenses').textContent = this.formatCurrency(totals.expenses);
    }

    calculateTotals() {
        return this.transactions.reduce((acc, transaction) => {
            if (transaction.type === 'income') {
                acc.income += transaction.amount;
            } else {
                acc.expenses += transaction.amount;
            }
            acc.balance = acc.income - acc.expenses;
            return acc;
        }, { income: 0, expenses: 0, balance: 0 });
    }

    updateTransactionsList() {
        const container = document.getElementById('transactions-container');
        container.innerHTML = '';

        if (this.transactions.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet</p>
                </div>
            `;
            return;
        }

        this.transactions.slice(-5).reverse().forEach(transaction => {
            const date = new Date(transaction.date).toLocaleDateString();
            const div = document.createElement('div');
            div.className = `transaction-item ${transaction.type}`;
            div.innerHTML = `
                <div class="transaction-content">
                    <div class="transaction-icon">
                        <i class="fas ${transaction.type === 'income' ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
                    </div>
                    <div class="transaction-details">
                        <div class="transaction-description">${transaction.description}</div>
                        <div class="transaction-date">${date}</div>
                    </div>
                </div>
                <span class="transaction-amount">${this.formatCurrency(transaction.amount)}</span>
                <button class="transaction-delete" onclick="app.deleteTransaction(${transaction.id})">
                    <i class="fas fa-times"></i>
                </button>
            `;
            container.appendChild(div);
        });
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
            ${message}
        `;

        // Add to document
        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }
}

// Initialize the app
const app = new BudgetBuddy();