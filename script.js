// Gestionnaire de transactions Mobile Money
class TransactionManager {
    constructor() {
        this.transactions = this.loadTransactions();
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.filteredTransactions = [...this.transactions];
        this.currentTransactionType = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDateTime();
        this.renderTransactions();
        this.updateStatistics();
    }

    setupEventListeners() {
        // Formulaire
        document.getElementById('transactionForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Réinitialisation du formulaire
        document.getElementById('transactionForm').addEventListener('reset', () => {
            this.setDefaultDateTime();
            this.hideQuickInfo();
        });

        // Recherche
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTransactions(e.target.value);
        });

        // Filtres
        document.getElementById('filterType').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterDirection').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterOperator').addEventListener('change', () => this.applyFilters());

        // Export et impression
        document.getElementById('exportBtn').addEventListener('click', () => this.exportTransactions());
        document.getElementById('printBtn').addEventListener('click', () => this.printTransactions());

        // Modal de suppression
        document.getElementById('confirmDelete').addEventListener('click', () => {
            this.confirmDelete();
        });

        // Validation du numéro de téléphone
        document.getElementById('phone').addEventListener('input', (e) => {
            this.validatePhoneNumber(e.target);
        });
    }

    // Fonctions pour les questions guidées
    startGuidedTransaction(type) {
        const [transactionType, direction] = type.split('-');
        this.currentTransactionType = { transactionType, direction };
        
        // Masquer les questions, montrer le formulaire
        document.getElementById('guidedQuestions').style.display = 'none';
        document.getElementById('transactionFormSection').style.display = 'block';
        
        // Pré-remplir le formulaire
        document.getElementById('transactionType').value = transactionType;
        document.getElementById('direction').value = direction;
        
        // Mettre à jour le titre
        const titles = {
            'transfert-envoye': 'Transfert d\'argent',
            'depot-recu': 'Dépôt d\'argent',
            'retrait-envoye': 'Retrait d\'argent',
            'paiement-envoye': 'Paiement'
        };
        document.getElementById('formTitle').textContent = titles[type] || 'Nouvelle Transaction';
        
        // Afficher les informations rapides
        this.showQuickInfo(transactionType, direction);
        
        // Focus sur le premier champ essentiel
        document.getElementById('amount').focus();
    }

    showQuickInfo(transactionType, direction) {
        const quickInfo = document.getElementById('quickInfo');
        const quickInfoText = document.getElementById('quickInfoText');
        
        const messages = {
            'transfert-envoye': 'Vous envoyez de l\'argent à quelqu\'un',
            'depot-recu': 'Vous recevez un dépôt d\'argent',
            'retrait-envoye': 'Vous retirez de l\'argent',
            'paiement-envoye': 'Vous payez un bien ou service'
        };
        
        quickInfoText.textContent = messages[`${transactionType}-${direction}`] || '';
        quickInfo.style.display = 'block';
    }

    hideQuickInfo() {
        document.getElementById('quickInfo').style.display = 'none';
    }

    showManualForm() {
        document.getElementById('guidedQuestions').style.display = 'none';
        document.getElementById('transactionFormSection').style.display = 'block';
        document.getElementById('formTitle').textContent = 'Nouvelle Transaction';
        this.currentTransactionType = null;
    }

    backToQuestions() {
        document.getElementById('guidedQuestions').style.display = 'block';
        document.getElementById('transactionFormSection').style.display = 'none';
        document.getElementById('transactionForm').reset();
        this.setDefaultDateTime();
        this.hideQuickInfo();
        this.currentTransactionType = null;
    }

    toggleOptionalFields() {
        const optionalFields = document.getElementById('optionalFields');
        const toggleBtn = document.getElementById('toggleFieldsBtn');
        
        if (optionalFields.style.display === 'none') {
            optionalFields.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i> Moins d\'options';
        } else {
            optionalFields.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-cog"></i> Plus d\'options';
        }
    }

    setDefaultDateTime() {
        const now = new Date();
        document.getElementById('date').value = now.toISOString().split('T')[0];
        document.getElementById('time').value = now.toTimeString().slice(0, 5);
    }

    validatePhoneNumber(input) {
        let value = input.value.replace(/[^\d+]/g, '');
        if (!value.startsWith('+')) {
            value = '+261' + value.replace(/^261/, '');
        }
        input.value = value;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    addTransaction() {
        const formData = new FormData(document.getElementById('transactionForm'));
        const transaction = {
            id: this.generateId(),
            type: document.getElementById('transactionType').value,
            direction: document.getElementById('direction').value,
            amount: parseFloat(document.getElementById('amount').value) || 0,
            fees: parseFloat(document.getElementById('fees').value) || 0,
            name: document.getElementById('name').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            date: document.getElementById('date').value,
            time: document.getElementById('time').value,
            reference: document.getElementById('reference').value.trim(),
            operator: document.getElementById('operator').value,
            description: document.getElementById('description').value.trim(),
            timestamp: new Date().toISOString()
        };

        // Calculer le montant net
        transaction.net = transaction.direction === 'envoye' 
            ? transaction.amount + transaction.fees 
            : transaction.amount - transaction.fees;

        this.transactions.unshift(transaction);
        this.saveTransactions();
        this.applyFilters();
        this.updateStatistics();

        // Réinitialiser et retourner aux questions
        document.getElementById('transactionForm').reset();
        this.setDefaultDateTime();
        this.hideQuickInfo();
        
        if (this.currentTransactionType) {
            this.backToQuestions();
        }

        // Afficher une notification
        this.showNotification('Transaction enregistrée avec succès!', 'success');
    }

    deleteTransaction(id) {
        this.transactionToDelete = id;
        const transaction = this.transactions.find(t => t.id === id);
        
        if (transaction) {
            document.getElementById('deleteTransactionDetails').innerHTML = `
                <strong>${transaction.name}</strong> - ${transaction.amount} Ar<br>
                ${transaction.direction === 'envoye' ? 'Envoyé' : 'Reçu'} le ${this.formatDate(transaction.date)}
            `;
            document.getElementById('deleteModal').classList.add('show');
        }
    }

    confirmDelete() {
        if (this.transactionToDelete) {
            this.transactions = this.transactions.filter(t => t.id !== this.transactionToDelete);
            this.saveTransactions();
            this.applyFilters();
            this.updateStatistics();
            this.closeDeleteModal();
            this.showNotification('Transaction supprimée avec succès!', 'success');
        }
    }

    viewTransaction(id) {
        const transaction = this.transactions.find(t => t.id === id);
        if (transaction) {
            const detailsHTML = `
                <div class="transaction-detail-item">
                    <label>Type:</label>
                    <span>${this.getTransactionTypeLabel(transaction.type)}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Direction:</label>
                    <span class="direction-badge ${transaction.direction}">${transaction.direction === 'envoye' ? 'Envoyé' : 'Reçu'}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Montant:</label>
                    <span class="amount ${transaction.direction}">${transaction.amount.toLocaleString()} Ar</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Frais:</label>
                    <span class="fees">${transaction.fees.toLocaleString()} Ar</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Net:</label>
                    <span class="amount">${transaction.net.toLocaleString()} Ar</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Nom:</label>
                    <span>${transaction.name}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Téléphone:</label>
                    <span>${transaction.phone}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Date:</label>
                    <span>${this.formatDate(transaction.date)}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Heure:</label>
                    <span>${transaction.time}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Opérateur:</label>
                    <span class="operator-badge ${transaction.operator}">${this.getOperatorLabel(transaction.operator)}</span>
                </div>
                <div class="transaction-detail-item">
                    <label>Référence:</label>
                    <span>${transaction.reference || 'N/A'}</span>
                </div>
                ${transaction.description ? `
                <div class="transaction-detail-item">
                    <label>Description:</label>
                    <span>${transaction.description}</span>
                </div>
                ` : ''}
            `;
            
            document.getElementById('transactionDetails').innerHTML = detailsHTML;
            document.getElementById('detailsModal').classList.add('show');
        }
    }

    searchTransactions(query) {
        const searchTerm = query.toLowerCase();
        this.filteredTransactions = this.transactions.filter(transaction => 
            transaction.name.toLowerCase().includes(searchTerm) ||
            transaction.phone.includes(searchTerm) ||
            transaction.reference.toLowerCase().includes(searchTerm) ||
            transaction.description.toLowerCase().includes(searchTerm)
        );
        this.currentPage = 1;
        this.renderTransactions();
    }

    applyFilters() {
        const typeFilter = document.getElementById('filterType').value;
        const directionFilter = document.getElementById('filterDirection').value;
        const operatorFilter = document.getElementById('filterOperator').value;

        this.filteredTransactions = this.transactions.filter(transaction => {
            return (!typeFilter || transaction.type === typeFilter) &&
                   (!directionFilter || transaction.direction === directionFilter) &&
                   (!operatorFilter || transaction.operator === operatorFilter);
        });

        this.currentPage = 1;
        this.renderTransactions();
    }

    renderTransactions() {
        const tbody = document.getElementById('transactionsList');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredTransactions.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        emptyState.style.display = 'none';

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedTransactions = this.filteredTransactions.slice(startIndex, endIndex);

        tbody.innerHTML = paginatedTransactions.map(transaction => `
            <tr>
                <td>${this.formatDate(transaction.date)}</td>
                <td>${transaction.time}</td>
                <td><span class="type-badge">${this.getTransactionTypeLabel(transaction.type)}</span></td>
                <td><span class="direction-badge ${transaction.direction}">${transaction.direction === 'envoye' ? 'Envoyé' : 'Reçu'}</span></td>
                <td><span class="amount ${transaction.direction}">${transaction.amount.toLocaleString()} Ar</span></td>
                <td><span class="fees">${transaction.fees.toLocaleString()} Ar</span></td>
                <td><span class="amount">${transaction.net.toLocaleString()} Ar</span></td>
                <td>${transaction.name}</td>
                <td>${transaction.phone}</td>
                <td><span class="operator-badge ${transaction.operator}">${this.getOperatorLabel(transaction.operator)}</span></td>
                <td>${transaction.reference || '-'}</td>
                <td>
                    <div class="action-buttons-cell">
                        <button class="btn-icon view" onclick="transactionManager.viewTransaction('${transaction.id}')" title="Voir">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-icon delete" onclick="transactionManager.deleteTransaction('${transaction.id}')" title="Supprimer">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        this.renderPagination();
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = `
            <button onclick="transactionManager.goToPage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;

        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 1 && i <= this.currentPage + 1)) {
                paginationHTML += `
                    <button onclick="transactionManager.goToPage(${i})" class="${i === this.currentPage ? 'active' : ''}">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 2 || i === this.currentPage + 2) {
                paginationHTML += '<span>...</span>';
            }
        }

        paginationHTML += `
            <button onclick="transactionManager.goToPage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;

        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredTransactions.length / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderTransactions();
        }
    }

    updateStatistics() {
        const totalSent = this.transactions
            .filter(t => t.direction === 'envoye')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalReceived = this.transactions
            .filter(t => t.direction === 'recu')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalFees = this.transactions
            .reduce((sum, t) => sum + t.fees, 0);

        const avgTransaction = this.transactions.length > 0 
            ? this.transactions.reduce((sum, t) => sum + t.amount, 0) / this.transactions.length 
            : 0;

        const balance = totalReceived - totalSent;

        document.getElementById('totalBalance').textContent = `${balance.toLocaleString()} Ar`;
        document.getElementById('totalTransactions').textContent = this.transactions.length;
        document.getElementById('totalSent').textContent = `${totalSent.toLocaleString()} Ar`;
        document.getElementById('totalReceived').textContent = `${totalReceived.toLocaleString()} Ar`;
        document.getElementById('totalFees').textContent = `${totalFees.toLocaleString()} Ar`;
        document.getElementById('avgTransaction').textContent = `${Math.round(avgTransaction).toLocaleString()} Ar`;
    }

    exportTransactions() {
        const csvContent = this.generateCSV();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Transactions exportées avec succès!', 'success');
    }

    generateCSV() {
        const headers = [
            'Date', 'Heure', 'Type', 'Direction', 'Montant', 'Frais', 'Net',
            'Nom', 'Téléphone', 'Opérateur', 'Référence', 'Description'
        ];
        
        const rows = this.transactions.map(transaction => [
            transaction.date,
            transaction.time,
            this.getTransactionTypeLabel(transaction.type),
            transaction.direction === 'envoye' ? 'Envoyé' : 'Reçu',
            transaction.amount,
            transaction.fees,
            transaction.net,
            transaction.name,
            transaction.phone,
            this.getOperatorLabel(transaction.operator),
            transaction.reference || '',
            transaction.description || ''
        ]);

        return [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
    }

    printTransactions() {
        window.print();
        this.showNotification('Impression lancée!', 'info');
    }

    getTransactionTypeLabel(type) {
        const labels = {
            transfert: 'Transfert',
            depot: 'Dépôt',
            retrait: 'Retrait',
            paiement: 'Paiement'
        };
        return labels[type] || type;
    }

    getOperatorLabel(operator) {
        const labels = {
            telma: 'Telma Money',
            mtn: 'Mvola',
            airtel: 'Airtel Money'
        };
        return labels[operator] || operator;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            display: flex;
            align-items: center;
            gap: 10px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    saveTransactions() {
        localStorage.setItem('mobileMoneyTransactions', JSON.stringify(this.transactions));
    }

    loadTransactions() {
        const stored = localStorage.getItem('mobileMoneyTransactions');
        return stored ? JSON.parse(stored) : [];
    }
}

// Fonctions globales pour les questions guidées
function startGuidedTransaction(type) {
    transactionManager.startGuidedTransaction(type);
}

function showManualForm() {
    transactionManager.showManualForm();
}

function backToQuestions() {
    transactionManager.backToQuestions();
}

function toggleOptionalFields() {
    transactionManager.toggleOptionalFields();
}

// Fonctions globales pour les modals
function closeDeleteModal() {
    document.getElementById('deleteModal').classList.remove('show');
}

function closeDetailsModal() {
    document.getElementById('detailsModal').classList.remove('show');
}

// Styles pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
    
    .transaction-detail-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid var(--border-color);
    }
    
    .transaction-detail-item:last-child {
        border-bottom: none;
    }
    
    .transaction-detail-item label {
        font-weight: 600;
        color: var(--text-secondary);
    }
    
    .transaction-detail-item span {
        text-align: right;
        max-width: 60%;
        word-break: break-word;
    }
`;
document.head.appendChild(style);

// Initialiser l'application
let transactionManager;
document.addEventListener('DOMContentLoaded', () => {
    transactionManager = new TransactionManager();
});

// Fermer les modals en cliquant à l'extérieur
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('show');
    }
});

// Raccourcis clavier
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N: Nouvelle transaction
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('name').focus();
    }
    
    // Ctrl/Cmd + F: Recherche
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
    
    // Escape: Fermer les modals
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
    }
});
