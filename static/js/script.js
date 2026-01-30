document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const amountInput = document.getElementById('amount');
    const fromCurrencySelect = document.getElementById('fromCurrency');
    const toCurrencySelect = document.getElementById('toCurrency');
    const convertBtn = document.getElementById('convert-btn');
    const reverseBtn = document.getElementById('reverse-currencies');
    const resultContainer = document.getElementById('result-container');
    const errorContainer = document.getElementById('error-container');
    const resultText = document.getElementById('result-text');
    const rateText = document.getElementById('rate-text');
    const copyBtn = document.getElementById('copy-result');
    const ratesTable = document.getElementById('rates-table');
    const baseCurrencySelect = document.getElementById('baseCurrencySelect');
    const apiStatusText = document.getElementById('status-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    const btnText = document.getElementById('btn-text');

    // State
    let currencies = {};
    let lastConversion = null;

    // Initialize application
    initApp();

    async function initApp() {
        try {
            // Load currencies
            await loadCurrencies();
            
            // Load initial rates
            await loadRates('USD');
            
            // Perform initial conversion
            await performConversion();
            
            // Update API status
            updateApiStatus(true);
        } catch (error) {
            console.error('Initialization error:', error);
            updateApiStatus(false);
            showError('Failed to initialize application. Please refresh the page.');
        }
    }

    // Load available currencies
    async function loadCurrencies() {
        try {
            showLoading(true);
            const response = await fetch('/api/currencies');
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            currencies = await response.json();
            
            // Clear existing options (keeping first default)
            while (fromCurrencySelect.options.length > 1) {
                fromCurrencySelect.remove(1);
            }
            while (toCurrencySelect.options.length > 1) {
                toCurrencySelect.remove(1);
            }
            
            // Add currency options
            for (const [code, name] of Object.entries(currencies)) {
                const option1 = new Option(`${code} - ${name}`, code);
                const option2 = new Option(`${code} - ${name}`, code);
                
                fromCurrencySelect.add(option1);
                toCurrencySelect.add(option2);
            }
            
            showLoading(false);
        } catch (error) {
            console.error('Failed to load currencies:', error);
            showError('Unable to load currency list. Please try again.');
            showLoading(false);
        }
    }

    // Perform currency conversion
    async function performConversion() {
        const amount = parseFloat(amountInput.value);
        const from = fromCurrencySelect.value;
        const to = toCurrencySelect.value;
        
        // Validation
        if (isNaN(amount) || amount <= 0) {
            showError('Please enter a valid amount greater than 0');
            return;
        }
        
        if (from === to) {
            showError('Please select different currencies for conversion');
            return;
        }
        
        try {
            showLoading(true);
            
            const response = await fetch(
                `/api/convert?amount=${amount}&from=${from}&to=${to}`
            );
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            if (result.error) {
                throw new Error(result.error);
            }
            
            // Store last conversion
            lastConversion = result;
            
            // Display result
            resultText.textContent = 
                `${formatNumber(amount)} ${from} = ${formatNumber(result.result)} ${to}`;
            
            // Calculate and display rate
            const rate = result.result / amount;
            rateText.textContent = `1 ${from} = ${formatNumber(rate)} ${to}`;
            
            // Show result, hide error
            resultContainer.classList.remove('d-none');
            errorContainer.classList.add('d-none');
            
        } catch (error) {
            console.error('Conversion error:', error);
            showError(`Conversion failed: ${error.message}`);
        } finally {
            showLoading(false);
        }
    }

    // Load exchange rates for table
    async function loadRates(baseCurrency) {
        try {
            const response = await fetch(`/api/rates?from=${baseCurrency}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const ratesData = await response.json();
            
            if (ratesData.error) {
                throw new Error(ratesData.error);
            }
            
            // Update table
            updateRatesTable(ratesData, baseCurrency);
            
        } catch (error) {
            console.error('Failed to load rates:', error);
            ratesTable.innerHTML = `
                <tr>
                    <td colspan="3" class="text-center text-danger py-4">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load exchange rates
                    </td>
                </tr>
            `;
        }
    }

    // Update rates table
    function updateRatesTable(ratesData, baseCurrency) {
        // Define popular currencies to display
        const popularCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'INR'];
        
        let tableHTML = '';
        
        popularCurrencies.forEach(currency => {
            if (currency !== baseCurrency && ratesData[currency]) {
                const rate = ratesData[currency];
                const currencyName = currencies[currency] || currency;
                
                tableHTML += `
                    <tr>
                        <td class="align-middle">
                            <strong>${currencyName}</strong>
                        </td>
                        <td class="align-middle">
                            <span class="badge bg-primary rounded-pill">${currency}</span>
                        </td>
                        <td class="text-end align-middle">
                            <span class="fw-bold fs-5">${formatNumber(rate)}</span>
                            <small class="text-muted ms-1">${baseCurrency}</small>
                        </td>
                    </tr>
                `;
            }
        });
        
        ratesTable.innerHTML = tableHTML;
    }

    // Format number with commas and 4 decimal places
    function formatNumber(num) {
        return parseFloat(num).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 4
        });
    }

    // Show/hide loading state
    function showLoading(isLoading) {
        if (isLoading) {
            loadingSpinner.classList.remove('d-none');
            btnText.textContent = 'Converting...';
            convertBtn.disabled = true;
        } else {
            loadingSpinner.classList.add('d-none');
            btnText.textContent = 'Convert Currency';
            convertBtn.disabled = false;
        }
    }

    // Show error message
    function showError(message) {
        errorContainer.classList.remove('d-none');
        resultContainer.classList.add('d-none');
        document.getElementById('error-text').textContent = message;
    }

    // Update API status display
    function updateApiStatus(isOnline) {
        const statusIcon = apiStatusText.parentElement.querySelector('i');
        
        if (isOnline) {
            apiStatusText.textContent = 'Online';
            apiStatusText.parentElement.classList.remove('text-danger');
            apiStatusText.parentElement.classList.add('text-success');
            statusIcon.className = 'fas fa-circle text-success me-1';
        } else {
            apiStatusText.textContent = 'Offline';
            apiStatusText.parentElement.classList.remove('text-success');
            apiStatusText.parentElement.classList.add('text-danger');
            statusIcon.className = 'fas fa-circle text-danger me-1';
        }
    }

    // Event Listeners
    convertBtn.addEventListener('click', performConversion);
    
    // Reverse currencies
    reverseBtn.addEventListener('click', function() {
        const fromValue = fromCurrencySelect.value;
        const toValue = toCurrencySelect.value;
        
        fromCurrencySelect.value = toValue;
        toCurrencySelect.value = fromValue;
        
        // Trigger conversion if we have an amount
        if (amountInput.value && parseFloat(amountInput.value) > 0) {
            performConversion();
        }
    });
    
    // Copy result to clipboard
    copyBtn.addEventListener('click', function() {
        if (lastConversion) {
            const text = `${amountInput.value} ${fromCurrencySelect.value} = ${lastConversion.result} ${toCurrencySelect.value}`;
            navigator.clipboard.writeText(text).then(() => {
                // Show success feedback
                const originalHTML = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check me-1"></i>Copied!';
                copyBtn.classList.remove('btn-outline-success');
                copyBtn.classList.add('btn-success');
                
                setTimeout(() => {
                    copyBtn.innerHTML = originalHTML;
                    copyBtn.classList.remove('btn-success');
                    copyBtn.classList.add('btn-outline-success');
                }, 2000);
            });
        }
    });
    
    // Load rates when base currency changes
    baseCurrencySelect.addEventListener('change', function() {
        loadRates(this.value);
    });
    
    // Real-time conversion on input change
    amountInput.addEventListener('input', debounce(performConversion, 500));
    fromCurrencySelect.addEventListener('change', performConversion);
    toCurrencySelect.addEventListener('change', performConversion);
    
    // Enter key support
    amountInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performConversion();
        }
    });

    // Utility: Debounce function
    function debounce(func, delay) {
        let timeoutId;
        return function(...args) {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func.apply(this, args);
            }, delay);
        };
    }

    // Check API status periodically
    setInterval(async () => {
        try {
            const response = await fetch('/api/currencies');
            updateApiStatus(response.ok);
        } catch (error) {
            updateApiStatus(false);
        }
    }, 30000);
});