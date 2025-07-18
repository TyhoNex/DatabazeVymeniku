// Firebase Database Navigator - Complete Application Logic
// Globální proměnné
let companies = [];
let exchangers = [];
let editingCompanyId = null;
let editingExchangerId = null;
let filteredCompanyId = null;

// Funkce pro zobrazení notifikací
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let icon = 'info';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'x-circle';
    
    toast.innerHTML = `
        <div class="flex items-start gap-3">
            <i data-lucide="${icon}" class="icon flex-shrink-0 mt-0.5"></i>
            <div class="flex-1">
                <p class="font-medium">${message}</p>
            </div>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Inicializace ikon
    lucide.createIcons();
    
    // Zobrazení toastu
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Skrytí toastu
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Funkce pro zobrazení/skrytí loading indikátoru
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.add('show');
    } else {
        loading.classList.remove('show');
    }
}

// Funkce pro zobrazení sync indikátoru
function showSyncIndicator() {
    const syncIndicator = document.getElementById('sync-indicator');
    syncIndicator.classList.add('show');
    setTimeout(() => {
        syncIndicator.classList.remove('show');
    }, 2000);
}

// Firebase funkce pro načtení dat
async function loadDataFromFirebase() {
    showLoading(true);
    try {
        // Načtení firem
        const companiesQuery = window.firestore.query(
            window.firestore.collection(window.db, 'companies'),
            window.firestore.orderBy('name')
        );
        const companiesSnapshot = await window.firestore.getDocs(companiesQuery);
        companies = companiesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Načtení výměníků
        const exchangersQuery = window.firestore.query(
            window.firestore.collection(window.db, 'exchangers'),
            window.firestore.orderBy('manufacturingDate', 'desc')
        );
        const exchangersSnapshot = await window.firestore.getDocs(exchangersQuery);
        exchangers = exchangersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderCompanies();
        renderExchangers();
        populateCompanySelect();
        
        showToast('Data byla úspěšně načtena z Firebase', 'success');
    } catch (error) {
        console.error('Chyba při načítání dat z Firebase:', error);
        showToast('Chyba při načítání dat z Firebase: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Firebase funkce pro uložení firmy
async function saveCompanyToFirebase(companyData) {
    try {
        if (editingCompanyId) {
            // Aktualizace existující firmy
            const companyRef = window.firestore.doc(window.db, 'companies', editingCompanyId);
            await window.firestore.updateDoc(companyRef, companyData);
            
            showToast('Firma byla úspěšně aktualizována', 'success');
        } else {
            // Přidání nové firmy
            const docRef = await window.firestore.addDoc(
                window.firestore.collection(window.db, 'companies'), 
                companyData
            );
            
            showToast('Firma byla úspěšně přidána', 'success');
        }
        
        // Real-time listener automaticky aktualizuje lokální data
        showSyncIndicator();
        
    } catch (error) {
        console.error('Chyba při ukládání firmy:', error);
        showToast('Chyba při ukládání firmy: ' + error.message, 'error');
    }
}

// Firebase funkce pro uložení výměníku
async function saveExchangerToFirebase(exchangerData) {
    try {
        if (editingExchangerId) {
            // Aktualizace existujícího výměníku
            const exchangerRef = window.firestore.doc(window.db, 'exchangers', editingExchangerId);
            await window.firestore.updateDoc(exchangerRef, exchangerData);
            
            showToast('Výměník byl úspěšně aktualizován', 'success');
        } else {
            // Přidání nového výměníku
            const docRef = await window.firestore.addDoc(
                window.firestore.collection(window.db, 'exchangers'), 
                exchangerData
            );
            
            showToast('Výměník byl úspěšně přidán', 'success');
        }
        
        // Real-time listener automaticky aktualizuje lokální data
        showSyncIndicator();
        
    } catch (error) {
        console.error('Chyba při ukládání výměníku:', error);
        showToast('Chyba při ukládání výměníku: ' + error.message, 'error');
    }
}

// Firebase funkce pro smazání firmy
async function deleteCompanyFromFirebase(companyId) {
    try {
        // Ověření, zda firma nemá přiřazené výměníky
        const companyExchangers = exchangers.filter(e => e.companyId === companyId);
        if (companyExchangers.length > 0) {
            showToast('Nelze smazat firmu, která má přiřazené výměníky. Nejprve smažte všechny výměníky této firmy.', 'error');
            return false;
        }

        await window.firestore.deleteDoc(window.firestore.doc(window.db, 'companies', companyId));
        
        showToast('Firma byla úspěšně smazána', 'success');
        showSyncIndicator();
        
        return true;
    } catch (error) {
        console.error('Chyba při mazání firmy:', error);
        showToast('Chyba při mazání firmy: ' + error.message, 'error');
        return false;
    }
}

// Firebase funkce pro smazání výměníku
async function deleteExchangerFromFirebase(exchangerId) {
    try {
        await window.firestore.deleteDoc(window.firestore.doc(window.db, 'exchangers', exchangerId));
        
        showToast('Výměník byl úspěšně smazán', 'success');
        showSyncIndicator();
        
        return true;
    } catch (error) {
        console.error('Chyba při mazání výměníku:', error);
        showToast('Chyba při mazání výměníku: ' + error.message, 'error');
        return false;
    }
}

// Nastavení real-time listenerů pro automatickou synchronizaci
function setupRealtimeListeners() {
    // Listener pro firmy
    const companiesQuery = window.firestore.query(
        window.firestore.collection(window.db, 'companies'),
        window.firestore.orderBy('name')
    );
    
    window.firestore.onSnapshot(companiesQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const companyData = { id: change.doc.id, ...change.doc.data() };
                const index = companies.findIndex(c => c.id === change.doc.id);
                
                if (index !== -1) {
                    companies[index] = companyData;
                } else {
                    companies.push(companyData);
                }
            }
            if (change.type === 'removed') {
                companies = companies.filter(c => c.id !== change.doc.id);
            }
        });
        
        renderCompanies();
        populateCompanySelect();
        
        if (snapshot.docChanges().length > 0) {
            showSyncIndicator();
        }
    });

    // Listener pro výměníky
    const exchangersQuery = window.firestore.query(
        window.firestore.collection(window.db, 'exchangers'),
        window.firestore.orderBy('manufacturingDate', 'desc')
    );
    
    window.firestore.onSnapshot(exchangersQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const exchangerData = { id: change.doc.id, ...change.doc.data() };
                const index = exchangers.findIndex(e => e.id === change.doc.id);
                
                if (index !== -1) {
                    exchangers[index] = exchangerData;
                } else {
                    exchangers.push(exchangerData);
                }
            }
            if (change.type === 'removed') {
                exchangers = exchangers.filter(e => e.id !== change.doc.id);
            }
        });
        
        renderExchangers();
        renderCompanies(); // Aktualizace počtu výměníků u firem
        
        if (snapshot.docChanges().length > 0) {
            showSyncIndicator();
        }
    });
}

// Funkce pro přepínání tabů
function showTab(tabName) {
    // Skrytí všech tabů
    document.getElementById('companies-tab').classList.add('hidden');
    document.getElementById('exchangers-tab').classList.add('hidden');
    
    // Odstranění aktivní třídy ze všech tabů
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    
    // Zobrazení vybraného tabu
    document.getElementById(`${tabName}-tab`).classList.remove('hidden');
    
    // Přidání aktivní třídy k vybranému tabu
    event.target.classList.add('active');
    
    // Reset filtru při přepnutí na výměníky
    if (tabName === 'exchangers') {
        resetExchangerFilter();
    }
}

// Funkce pro vykreslení firem
function renderCompanies() {
    const tbody = document.getElementById('companies-tbody');
    tbody.innerHTML = '';
    
    companies.forEach((company, index) => {
        // Počet výměníků pro tuto firmu
        const exchangerCount = exchangers.filter(e => e.companyId === company.id).length;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-medium">${index + 1}</td>
            <td>${company.industry || '-'}</td>
            <td class="font-medium">${company.name}</td>
            <td>${company.city}</td>
            <td>${company.street}</td>
            <td>${company.postalCode}</td>
            <td>${company.ico}</td>
            <td>${company.gpsCoordinates || '-'}</td>
            <td>${company.contactPerson}</td>
            <td>${company.position || '-'}</td>
            <td>${company.phone}</td>
            <td>${company.email}</td>
            <td>
                <span class="status-badge ${getStatusClass(company.status)}">${company.status}</span>
            </td>
            <td>
                <div class="flex gap-1">
                    ${exchangerCount > 0 ? 
                        `<button class="btn btn-small btn-outline" onclick="showCompanyExchangers('${company.id}')" title="Zobrazit výměníky této firmy">
                            ${exchangerCount} VT
                        </button>` : 
                        '<span class="text-gray-400 text-xs">0 VT</span>'
                    }
                    <button class="btn btn-small btn-outline" onclick="editCompany('${company.id}')" title="Upravit">
                        <i data-lucide="edit-2" class="icon"></i>
                    </button>
                    <button class="btn btn-small btn-outline text-red-600 hover:bg-red-50" onclick="deleteCompany('${company.id}')" title="Smazat">
                        <i data-lucide="trash-2" class="icon"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Inicializace ikon
    lucide.createIcons();
}

// Funkce pro vykreslení výměníků s možností filtrace
function renderExchangers() {
    const tbody = document.getElementById('exchangers-tbody');
    tbody.innerHTML = '';
    
    let exchangersToRender = exchangers;
    
    // Aplikovat filtr podle firmy, pokud je aktivní
    if (filteredCompanyId) {
        exchangersToRender = exchangers.filter(e => e.companyId === filteredCompanyId);
    }
    
    exchangersToRender.forEach((exchanger, index) => {
        const company = companies.find(c => c.id === exchanger.companyId);
        const companyName = company ? company.name : 'Neznámá firma';
        const companyNumber = company ? (companies.indexOf(company) + 1) : '-';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-medium">${index + 1}</td>
            <td>${companyNumber}</td>
            <td class="font-medium">${companyName}</td>
            <td>${exchanger.manufacturer}</td>
            <td>${exchanger.type}</td>
            <td>${exchanger.plateCount}</td>
            <td>${exchanger.serialNumber}</td>
            <td>${exchanger.registrationNumber || '-'}</td>
            <td>${exchanger.manufacturingDate ? new Date(exchanger.manufacturingDate).toLocaleDateString('cs-CZ') : '-'}</td>
            <td>${exchanger.heatingMedium}</td>
            <td>${exchanger.city}</td>
            <td>${exchanger.street}</td>
            <td>${exchanger.location || '-'}</td>
            <td>${exchanger.inspectionInterval} měsíců</td>
            <td>${exchanger.lastInspectionDate ? new Date(exchanger.lastInspectionDate).toLocaleDateString('cs-CZ') : '-'}</td>
            <td>${exchanger.nextInspectionDate ? new Date(exchanger.nextInspectionDate).toLocaleDateString('cs-CZ') : '-'}</td>
            <td>
                <div class="flex gap-1">
                    <button class="btn btn-small btn-outline" onclick="editExchanger('${exchanger.id}')" title="Upravit">
                        <i data-lucide="edit-2" class="icon"></i>
                    </button>
                    <button class="btn btn-small btn-outline text-red-600 hover:bg-red-50" onclick="deleteExchanger('${exchanger.id}')" title="Smazat">
                        <i data-lucide="trash-2" class="icon"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Inicializace ikon
    lucide.createIcons();
}

// Funkce pro zobrazení výměníků konkrétní firmy
function showCompanyExchangers(companyId) {
    filteredCompanyId = companyId;
    const company = companies.find(c => c.id === companyId);
    
    // Přepnout na tab výměníků
    showTab('exchangers');
    
    // Vyplnit vyhledávací pole názvem firmy
    if (company) {
        document.getElementById('exchanger-search').value = company.name;
        showToast(`Zobrazeny výměníky firmy: ${company.name}`, 'info');
    }
    
    // Spustit vyhledávání (které teď automaticky respektuje filtr podle firmy)
    searchExchangers();
}

// Funkce pro reset filtru výměníků
function resetExchangerFilter() {
    filteredCompanyId = null;
    document.getElementById('exchanger-search').value = '';
    searchExchangers(); // Použijeme searchExchangers místo renderExchangers pro konzistenci
}

// Funkce pro získání CSS třídy pro stav
function getStatusClass(status) {
    switch (status) {
        case 'stávající zákazník': return 'status-existing';
        case 'umístěný výměník': return 'status-installed';
        case 'potenciální zákazník': return 'status-potential';
        case 'odmítnutí': return 'status-rejected';
        case 'jednorázové čištění': return 'status-cleaning';
        default: return 'status-cleaning';
    }
}

// Funkce pro naplnění selectu zákazníků
function populateCompanySelect() {
    const select = document.querySelector('select[name="companyId"]');
    select.innerHTML = '<option value="">Vyberte zákazníka</option>';
    
    companies.forEach((company, index) => {
        const option = document.createElement('option');
        option.value = company.id;
        option.textContent = `${index + 1}. ${company.name}`;
        select.appendChild(option);
    });
}

// Modal funkce pro firmy
function openCompanyModal() {
    editingCompanyId = null;
    document.getElementById('company-modal-title').textContent = 'Přidat novou firmu';
    document.getElementById('company-submit-text').textContent = 'Přidat firmu';
    document.getElementById('company-form').reset();
    document.getElementById('company-modal').classList.add('show');
}

function closeCompanyModal() {
    document.getElementById('company-modal').classList.remove('show');
    editingCompanyId = null;
}

function editCompany(companyId) {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    
    editingCompanyId = companyId;
    document.getElementById('company-modal-title').textContent = 'Upravit firmu';
    document.getElementById('company-submit-text').textContent = 'Uložit změny';
    
    const form = document.getElementById('company-form');
    Object.keys(company).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && key !== 'id') {
            input.value = company[key] || '';
        }
    });
    
    document.getElementById('company-modal').classList.add('show');
}

async function deleteCompany(companyId) {
    const company = companies.find(c => c.id === companyId);
    if (!company) return;
    
    if (confirm(`Opravdu chcete smazat firmu "${company.name}"?`)) {
        await deleteCompanyFromFirebase(companyId);
    }
}

// Modal funkce pro výměníky
function openExchangerModal() {
    editingExchangerId = null;
    document.getElementById('exchanger-modal-title').textContent = 'Přidat nový výměník';
    document.getElementById('exchanger-submit-text').textContent = 'Přidat výměník';
    document.getElementById('exchanger-form').reset();
    document.querySelector('[name="inspectionInterval"]').value = '12';
    document.getElementById('exchanger-modal').classList.add('show');
}

function closeExchangerModal() {
    document.getElementById('exchanger-modal').classList.remove('show');
    editingExchangerId = null;
}

function editExchanger(exchangerId) {
    const exchanger = exchangers.find(e => e.id === exchangerId);
    if (!exchanger) return;
    
    editingExchangerId = exchangerId;
    document.getElementById('exchanger-modal-title').textContent = 'Upravit výměník';
    document.getElementById('exchanger-submit-text').textContent = 'Uložit změny';
    
    const form = document.getElementById('exchanger-form');
    Object.keys(exchanger).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && key !== 'id') {
            if (input.type === 'date' && exchanger[key]) {
                input.value = exchanger[key].split('T')[0];
            } else {
                input.value = exchanger[key] || '';
            }
        }
    });
    
    document.getElementById('exchanger-modal').classList.add('show');
}

async function deleteExchanger(exchangerId) {
    const exchanger = exchangers.find(e => e.id === exchangerId);
    if (!exchanger) return;
    
    if (confirm(`Opravdu chcete smazat výměník "${exchanger.type}" (SN: ${exchanger.serialNumber})?`)) {
        await deleteExchangerFromFirebase(exchangerId);
    }
}

// Vyhledávání
function searchCompanies() {
    const query = document.getElementById('company-search').value.toLowerCase();
    const rows = document.querySelectorAll('#companies-tbody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function searchExchangers() {
    const query = document.getElementById('exchanger-search').value.toLowerCase();
    const tbody = document.getElementById('exchangers-tbody');
    tbody.innerHTML = '';
    
    let exchangersToRender = exchangers;
    
    // Aplikovat filtr podle firmy, pokud je aktivní
    if (filteredCompanyId) {
        exchangersToRender = exchangers.filter(e => e.companyId === filteredCompanyId);
    }
    
    // Aplikovat textové vyhledávání
    if (query) {
        exchangersToRender = exchangersToRender.filter(exchanger => {
            const company = companies.find(c => c.id === exchanger.companyId);
            const companyName = company ? company.name.toLowerCase() : '';
            
            return (
                exchanger.manufacturer.toLowerCase().includes(query) ||
                exchanger.type.toLowerCase().includes(query) ||
                exchanger.serialNumber.toLowerCase().includes(query) ||
                (exchanger.registrationNumber && exchanger.registrationNumber.toLowerCase().includes(query)) ||
                exchanger.heatingMedium.toLowerCase().includes(query) ||
                exchanger.city.toLowerCase().includes(query) ||
                exchanger.street.toLowerCase().includes(query) ||
                (exchanger.location && exchanger.location.toLowerCase().includes(query)) ||
                companyName.includes(query)
            );
        });
    }
    
    // Vykreslit výsledky
    exchangersToRender.forEach((exchanger, index) => {
        const company = companies.find(c => c.id === exchanger.companyId);
        const companyName = company ? company.name : 'Neznámá firma';
        const companyNumber = company ? (companies.indexOf(company) + 1) : '-';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="font-medium">${index + 1}</td>
            <td>${companyNumber}</td>
            <td class="font-medium">${companyName}</td>
            <td>${exchanger.manufacturer}</td>
            <td>${exchanger.type}</td>
            <td>${exchanger.plateCount}</td>
            <td>${exchanger.serialNumber}</td>
            <td>${exchanger.registrationNumber || '-'}</td>
            <td>${exchanger.manufacturingDate ? new Date(exchanger.manufacturingDate).toLocaleDateString('cs-CZ') : '-'}</td>
            <td>${exchanger.heatingMedium}</td>
            <td>${exchanger.city}</td>
            <td>${exchanger.street}</td>
            <td>${exchanger.location || '-'}</td>
            <td>${exchanger.inspectionInterval} měsíců</td>
            <td>${exchanger.lastInspectionDate ? new Date(exchanger.lastInspectionDate).toLocaleDateString('cs-CZ') : '-'}</td>
            <td>${exchanger.nextInspectionDate ? new Date(exchanger.nextInspectionDate).toLocaleDateString('cs-CZ') : '-'}</td>
            <td>
                <div class="flex gap-1">
                    <button class="btn btn-small btn-outline" onclick="editExchanger('${exchanger.id}')" title="Upravit">
                        <i data-lucide="edit-2" class="icon"></i>
                    </button>
                    <button class="btn btn-small btn-outline text-red-600 hover:bg-red-50" onclick="deleteExchanger('${exchanger.id}')" title="Smazat">
                        <i data-lucide="trash-2" class="icon"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Inicializace ikon
    lucide.createIcons();
}

// ARES API integrace - fallback na ruční zadání
async function fetchAresData() {
    const form = document.getElementById('company-form');
    const icoInput = form.querySelector('[name="ico"]');
    const ico = icoInput.value.trim();
    
    if (!ico || ico.length !== 8) {
        showToast('Pro načtení dat z ARES zadejte platné 8místné IČO.', 'error');
        return;
    }
    
    showToast('Načítání dat z ARES...', 'info');
    
    try {
        // Pokus o přímé volání ARES API
        const response = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Extrakce dat z ARES odpovědi
        const obchodniJmeno = data.obchodniJmeno || '';
        const sidlo = data.sidlo || {};
        
        // Sestavení adresy
        const ulice = sidlo.nazevUlice || '';
        const cisloDomovni = sidlo.cisloDomovni || '';
        const cisloOrientacni = sidlo.cisloOrientacni || '';
        const cisloOrientacniPismeno = sidlo.cisloOrientacniPismeno || '';
        
        let fullAddress = ulice;
        if (cisloDomovni) {
            fullAddress += ` ${cisloDomovni}`;
        }
        if (cisloOrientacni) {
            fullAddress += `/${cisloOrientacni}`;
            if (cisloOrientacniPismeno) {
                fullAddress += cisloOrientacniPismeno;
            }
        }
        
        // GPS souřadnice
        const mesto = sidlo.nazevObce || '';
        const kraj = sidlo.nazevKraje || '';
        const gpsCoords = mesto && kraj ? `${mesto}, ${kraj}` : '';
        
        // Vyplnění formuláře
        form.querySelector('[name="name"]').value = obchodniJmeno;
        form.querySelector('[name="city"]').value = mesto;
        form.querySelector('[name="street"]').value = fullAddress.trim();
        form.querySelector('[name="postalCode"]').value = sidlo.psc ? sidlo.psc.toString() : '';
        form.querySelector('[name="gpsCoordinates"]').value = gpsCoords;
        
        showToast(`Údaje o subjektu ${obchodniJmeno} byly úspěšně načteny z ARES.`, 'success');
        
    } catch (error) {
        console.error('ARES API Error:', error);
        
        // Zobrazit dialog pro ruční zadání
        if (confirm('ARES API není dostupné. Chcete zadat data ručně?')) {
            showManualEntryDialog();
        } else {
            showToast('Nepodařilo se načíst data z ARES. Zkontrolujte IČO nebo zkuste později.', 'error');
        }
    }
}

// Dialog pro ruční zadání údajů firmy
function showManualEntryDialog() {
    const form = document.getElementById('company-form');
    
    // Získání základních údajů
    const companyName = prompt('Zadejte název firmy:');
    if (!companyName) return;
    
    const city = prompt('Zadejte město:');
    const street = prompt('Zadejte ulici a číslo:');
    const postalCode = prompt('Zadejte PSČ:');
    
    // Vyplnění formuláře
    form.querySelector('[name="name"]').value = companyName || '';
    form.querySelector('[name="city"]').value = city || '';
    form.querySelector('[name="street"]').value = street || '';
    form.querySelector('[name="postalCode"]').value = postalCode || '';
    
    showToast('Údaje byly zadány ručně', 'info');
}

// Funkce pro výpočet data příští kontroly
function calculateNextInspection() {
    const lastInspectionInput = document.querySelector('[name="lastInspectionDate"]');
    const intervalInput = document.querySelector('[name="inspectionInterval"]');
    const nextInspectionInput = document.querySelector('[name="nextInspectionDate"]');
    
    const lastInspection = lastInspectionInput.value;
    const interval = parseInt(intervalInput.value);
    
    if (lastInspection && interval) {
        const lastDate = new Date(lastInspection);
        const nextDate = new Date(lastDate);
        nextDate.setMonth(nextDate.getMonth() + interval);
        
        nextInspectionInput.value = nextDate.toISOString().split('T')[0];
    } else {
        nextInspectionInput.value = '';
    }
}

// Funkce pro změnu výběru firmy u výměníku
function onCompanySelect() {
    const companySelect = document.querySelector('[name="companyId"]');
    const selectedCompanyId = companySelect.value;
    
    if (selectedCompanyId) {
        const company = companies.find(c => c.id === selectedCompanyId);
        if (company) {
            // Automatické vyplnění adresy z firmy
            document.querySelector('[name="city"]').value = company.city || '';
            document.querySelector('[name="street"]').value = company.street || '';
        }
    }
}

// Event handlery pro formuláře
document.getElementById('company-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const companyData = Object.fromEntries(formData.entries());
    
    await saveCompanyToFirebase(companyData);
    closeCompanyModal();
});

document.getElementById('exchanger-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const exchangerData = Object.fromEntries(formData.entries());
    
    // Převedení číselných hodnot
    if (exchangerData.plateCount) {
        exchangerData.plateCount = parseInt(exchangerData.plateCount);
    }
    if (exchangerData.inspectionInterval) {
        exchangerData.inspectionInterval = parseInt(exchangerData.inspectionInterval);
    }
    
    await saveExchangerToFirebase(exchangerData);
    closeExchangerModal();
});

// Zavření modálů při kliknutí mimo ně
document.getElementById('company-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeCompanyModal();
    }
});

document.getElementById('exchanger-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeExchangerModal();
    }
});

// Monitoring připojení
function updateConnectionStatus() {
    const statusElement = document.getElementById('connection-status');
    
    if (navigator.onLine) {
        statusElement.innerHTML = `
            <i data-lucide="wifi" class="icon text-green-500"></i>
            <span class="text-green-600">Online</span>
        `;
    } else {
        statusElement.innerHTML = `
            <i data-lucide="wifi-off" class="icon text-red-500"></i>
            <span class="text-red-600">Offline</span>
        `;
    }
    
    lucide.createIcons();
}

// Event listenery pro připojení
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

// Inicializace aplikace
document.addEventListener('DOMContentLoaded', async function() {
    // Čekání na načtení Firebase
    let retries = 0;
    const maxRetries = 50;
    
    while (!window.db && retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    if (!window.db) {
        showToast('Chyba při inicializaci Firebase. Zkontrolujte konfiguraci.', 'error');
        return;
    }
    
    // Inicializace ikon
    lucide.createIcons();
    
    // Aktualizace stavu připojení
    updateConnectionStatus();
    
    // Načtení dat z Firebase
    await loadDataFromFirebase();
    
    // Nastavení real-time listenerů
    setupRealtimeListeners();
    
    console.log('Firebase aplikace byla úspěšně inicializována');
});
