// ============================================================================
// QURAN AUDIO PLAYER APPLICATION
// ============================================================================

const APP = {
    // Configuration
    config: {
        itemsPerPage: 12,
        apiBaseUrls: [
            'https://api.quran.com/api/v4',
            'https://api.alquran.cloud/v1',
        ],
        reciterId: 1, // Default reciter (Mishari Alafasy)
    },

    // State Management
    state: {
        allSourates: [],
        displayedSourates: [],
        currentPage: 1,
        searchQuery: '',
        searchQueryRaw: '',
        lengthFilter: 'all',
        minVerses: null,
        maxVerses: null,
        favoritesOnly: false,
        sortMode: 'number',
        selectedReciter: 1,
        availableReciters: [],
        audioEditions: [],  // Add: store audio editions from alquran.cloud
    selectedRecitationEdition: null,
    currentVerseIndex: 0,
    isPlayingFullSurah: false,
        favorites: [],
        currentSurah: null,
        currentAudioUrl: null,
    },

    // DOM Elements
    elements: {
        searchInput: document.getElementById('searchInput'),
        searchSummary: document.getElementById('searchSummary'),
        clearSearch: document.getElementById('clearSearch'),
        reciterSelect: document.getElementById('reciterSelect'),
        resetBtn: document.getElementById('resetBtn'),
        lengthFilterChips: document.querySelectorAll('[data-length-filter]'),
        minVerses: document.getElementById('minVerses'),
        maxVerses: document.getElementById('maxVerses'),
        favoritesOnlyToggle: document.getElementById('favoritesOnly'),
        sortSelect: document.getElementById('sortSelect'),
        souratesContainer: document.getElementById('souratesContainer'),
        paginationContainer: document.getElementById('paginationContainer'),
        loadingSpinner: document.getElementById('loadingSpinner'),
        errorMessage: document.getElementById('errorMessage'),
        errorText: document.getElementById('errorText'),
        retryBtn: document.getElementById('retryBtn'),
        pageInfo: document.getElementById('pageInfo'),
        prevBtn: document.getElementById('prevBtn'),
        nextBtn: document.getElementById('nextBtn'),
        statsContainer: document.getElementById('statsContainer'),
        totalSourates: document.getElementById('totalSourates'),
        totalReciters: document.getElementById('totalReciters'),
        playerModal: document.getElementById('playerModal'),
        closeModal: document.getElementById('closeModal'),
        modalTitle: document.getElementById('modalTitle'),
        modalReciter: document.getElementById('modalReciter'),
        audioPlayer: document.getElementById('audioPlayer'),
    // Verse-by-verse elements
    versesContainer: document.getElementById('versesContainer'),
    versesList: document.getElementById('versesList'),
    prevVerse: document.getElementById('prevVerse'),
    nextVerse: document.getElementById('nextVerse'),
    playCurrentVerse: document.getElementById('playCurrentVerse'),
    playFullSurah: document.getElementById('playFullSurah'),
        infoNumber: document.getElementById('infoNumber'),
        infoArabicName: document.getElementById('infoArabicName'),
        infoEnglishName: document.getElementById('infoEnglishName'),
        infoVerses: document.getElementById('infoVerses'),
        prevSurah: document.getElementById('prevSurah'),
        nextSurah: document.getElementById('nextSurah'),
        favoritesBtn: document.getElementById('favoritesBtn'),
        favoritesModal: document.getElementById('favoritesModal'),
        closeFavoritesModal: document.getElementById('closeFavoritesModal'),
        favoriteCount: document.getElementById('favoriteCount'),
        favoritesList: document.getElementById('favoritesList'),
    },

    // ========== INITIALIZATION ==========
    async init() {
        console.log('Initializing Quran Audio Player...');
        this.setupEventListeners();
        this.loadFavorites();
        await this.fetchAudioEditions();  // Fetch available recitations with audio URLs
        await this.fetchSourates();
        await this.fetchReciters();
    },

    setupEventListeners() {
        // (Removed GitHub Pages banner) — no persistent banner is shown by default.

        // Search and filter
        this.elements.searchInput.addEventListener('input', (e) => {
            const value = e.target.value || '';
            this.state.searchQueryRaw = value.trim();
            this.state.searchQuery = this.state.searchQueryRaw.toLowerCase();
            this.filterAndDisplay();
            this.updateClearSearchVisibility();
        });

        if (this.elements.clearSearch) {
            this.elements.clearSearch.addEventListener('click', () => {
                this.elements.searchInput.value = '';
                this.state.searchQuery = '';
                this.state.searchQueryRaw = '';
                this.filterAndDisplay();
                this.updateClearSearchVisibility();
            });
        }

        if (this.elements.lengthFilterChips.length) {
            this.elements.lengthFilterChips.forEach(chip => {
                chip.addEventListener('click', () => {
                    const filterKey = chip.dataset.lengthFilter || 'all';
                    this.setLengthFilter(filterKey);
                });
            });
        }

        if (this.elements.minVerses) {
            this.elements.minVerses.addEventListener('input', (e) => {
                this.handleVerseRangeInput('minVerses', e.target.value);
            });
        }

        if (this.elements.maxVerses) {
            this.elements.maxVerses.addEventListener('input', (e) => {
                this.handleVerseRangeInput('maxVerses', e.target.value);
            });
        }

        if (this.elements.favoritesOnlyToggle) {
            this.elements.favoritesOnlyToggle.addEventListener('change', (e) => {
                this.state.favoritesOnly = e.target.checked;
                this.filterAndDisplay();
            });
        }

        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', (e) => {
                this.state.sortMode = e.target.value || 'number';
                this.filterAndDisplay();
            });
        }

        // Note: reciterSelect change listener is now added in populateReciterSelectFromEditions()
        // to handle switching between audio editions from alquran.cloud

        this.elements.resetBtn.addEventListener('click', () => {
            this.resetFilters();
        });

        // Pagination
        this.elements.prevBtn.addEventListener('click', () => {
            if (this.state.currentPage > 1) {
                this.state.currentPage--;
                this.displaySourates();
            }
        });

        this.elements.nextBtn.addEventListener('click', () => {
            const maxPages = Math.ceil(this.state.displayedSourates.length / this.config.itemsPerPage);
            if (this.state.currentPage < maxPages) {
                this.state.currentPage++;
                this.displaySourates();
            }
        });

        // Modal controls
        this.elements.closeModal.addEventListener('click', () => {
            this.closePlayerModal();
        });

        this.elements.closeFavoritesModal.addEventListener('click', () => {
            this.closeFavoritesModal();
        });

        this.elements.prevSurah.addEventListener('click', () => {
            this.playPreviousSurah();
        });

        this.elements.nextSurah.addEventListener('click', () => {
            this.playNextSurah();
        });

        // Favorites
        this.elements.favoritesBtn.addEventListener('click', () => {
            this.openFavoritesModal();
        });

        // Audio player error handling
        this.elements.audioPlayer.addEventListener('error', (e) => {
            console.error('Audio player error:', e);
            console.error('Error code:', this.elements.audioPlayer.error?.code);
            console.error('Error message:', this.elements.audioPlayer.error?.message);
        });

        this.elements.audioPlayer.addEventListener('loadstart', () => {
            console.log('Audio loading started...');
        });

        this.elements.audioPlayer.addEventListener('canplay', () => {
            console.log('Audio can play');
        });

        // Close modal on outside click
        window.addEventListener('click', (e) => {
            if (e.target === this.elements.playerModal) {
                this.closePlayerModal();
            }
            if (e.target === this.elements.favoritesModal) {
                this.closeFavoritesModal();
            }
        });

        // Error retry
        this.elements.retryBtn.addEventListener('click', () => {
            this.init();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.elements.playerModal.style.display !== 'none') {
                this.closePlayerModal();
            }
            if (e.key === 'Escape' && this.elements.favoritesModal.style.display !== 'none') {
                this.closeFavoritesModal();
            }
        });

        this.updateLengthFilterChips();
        this.updateClearSearchVisibility();
    },

    // ========== AUDIO EDITIONS ==========
    async fetchAudioEditions() {
        try {
            const response = await fetch('https://api.alquran.cloud/v1/edition?language=ar&format=audio');
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();

            if (data && data.code === 200 && Array.isArray(data.data)) {
                // Store audio editions for use when playing
                this.state.audioEditions = data.data.filter(ed => ed.format === 'audio');
                console.log(`Loaded ${this.state.audioEditions.length} audio editions from alquran.cloud`);
                
                // Use the first (most popular) recitation
                if (this.state.audioEditions.length > 0) {
                    this.state.selectedRecitationEdition = this.state.audioEditions[0].identifier;
                    console.log(`Selected recitation: ${this.state.selectedRecitationEdition}`);
                    
                    // Populate reciter/edition dropdown with audio editions
                    this.populateReciterSelectFromEditions();
                }
            }
        } catch (err) {
            console.warn('Failed to fetch audio editions:', err.message);
            // Fall back to known working edition
            this.state.selectedRecitationEdition = 'ar.abdulbasitmurattal';
            this.populateReciterSelectFromEditions();
        }
    },

    populateReciterSelectFromEditions() {
        const editions = this.state.audioEditions;
        
        // If there's only one edition, hide the reciter filter
        if (editions.length <= 1) {
            const reciterFilterDiv = document.querySelector('.reciter-filter');
            if (reciterFilterDiv) {
                reciterFilterDiv.style.display = 'none';
            }
            console.log('Only one audio edition available; reciter selector hidden.');
            return;
        }
        
        // If multiple editions, populate the dropdown
        const options = editions.map(ed => 
            `<option value="${ed.identifier}">${ed.englishName || ed.name || ed.identifier}</option>`
        ).join('');

        this.elements.reciterSelect.innerHTML = '<option value="">-- Select Reciter --</option>' + options;
        
        // Set the first edition as default
        this.elements.reciterSelect.value = this.state.selectedRecitationEdition;
        
        // Add change listener to update selected edition
        this.elements.reciterSelect.addEventListener('change', (e) => {
            const newEdition = e.target.value;
            if (newEdition) {
                this.state.selectedRecitationEdition = newEdition;
                console.log(`Switched recitation to: ${newEdition}`);
                // If a surah is currently open, refetch its ayahs with the new edition
                if (this.state.currentSurah && this.state.currentSurah.ayahs) {
                    this.fetchSurahAyahs(this.state.currentSurah);
                }
            }
        });
    },

    getCurrentReciterName() {
        if (!Array.isArray(this.state.audioEditions) || this.state.audioEditions.length === 0) {
            return 'Mishari Al-Afasy';
        }
        const current = this.state.audioEditions.find(ed => ed.identifier === this.state.selectedRecitationEdition);
        return current ? (current.englishName || current.name || current.identifier) : 'Mishari Al-Afasy';
    },

    // ========== API CALLS ==========
    async fetchSourates() {
        try {
            this.showLoading(true);
            this.showError(false);

            // Prefer api.quran.com (v4). If it fails, fall back to api.alquran.cloud, then to hardcoded data.
            this.state.allSourates = [];

            // 1) Try api.quran.com
            try {
                const resp = await fetch('https://api.quran.com/api/v4/chapters');
                if (!resp.ok) throw new Error(`quran.com HTTP ${resp.status}`);
                const json = await resp.json();

                // Expected shape: { chapters: [ { id, name_simple, name_arabic, verses_count, translated_name } ] }
                if (json && Array.isArray(json.chapters) && json.chapters.length > 0) {
                    this.state.allSourates = json.chapters.map(ch => {
                        const revelationRaw = ch.revelation_place || ch.revelationPlace || '';
                        return {
                        number: ch.id || ch.chapter_number || ch.number,
                        name: ch.name_simple || (ch.translated_name && ch.translated_name.name) || ch.name || ch.name_arabic,
                        name_english: (ch.translated_name && ch.translated_name.name) || ch.name_simple || ch.name || '',
                        name_arabic: ch.name_arabic || ch.name || '',
                        verses_count: ch.verses_count || ch.verses || 0,
                        revelation_place: revelationRaw ? revelationRaw.toLowerCase() : 'unknown',
                        audioUrl: `/audio/surah/${ch.id || ch.chapter_number || ch.number}`,
                        // Add direct alquran.cloud audio URL (works on GitHub Pages without CORS issues)
                        alquranCloudAudioUrl: `https://api.alquran.cloud/v1/surah/${ch.id || ch.chapter_number || ch.number}/${this.state.selectedRecitationEdition || 'ar.abdulbasitmurattal'}`,
                        remoteAudioUrl: `https://cdn.islamic.network/quran/audio-surah/${String(ch.id || ch.chapter_number || ch.number).padStart(3,'0')}/ar.alafasy.mp3`,
                        };
                    });
                    console.log('Loaded sourates from api.quran.com');
                } else {
                    throw new Error('Unexpected api.quran.com response shape');
                }
            } catch (errQuranCom) {
                console.warn('api.quran.com failed:', errQuranCom.message);

                // 2) Fallback to api.alquran.cloud
                try {
                    const response = await fetch('https://api.alquran.cloud/v1/surah');
                    if (!response.ok) throw new Error(`alquran.cloud HTTP ${response.status}`);
                    const data = await response.json();

                    if (data && (data.code === 200 || data.status === 'OK') && Array.isArray(data.data)) {
                        this.state.allSourates = data.data.map(surah => {
                            const revelationRaw = surah.revelationType || surah.revelation_type || '';
                            return {
                            number: surah.number,
                            name: surah.englishName || surah.name || '',
                            name_english: surah.englishName || surah.englishNameTranslation || surah.name || '',
                            name_arabic: surah.name || '',
                            verses_count: surah.numberOfAyahs || surah.ayahs || 0,
                            revelation_place: revelationRaw ? revelationRaw.toLowerCase() : 'unknown',
                            audioUrl: `/audio/surah/${surah.number}`,
                            // Add direct alquran.cloud audio URL (works on GitHub Pages without CORS issues)
                            alquranCloudAudioUrl: `https://api.alquran.cloud/v1/surah/${surah.number}/${this.state.selectedRecitationEdition || 'ar.abdulbasitmurattal'}`,
                            remoteAudioUrl: `https://cdn.islamic.network/quran/audio-surah/${String(surah.number).padStart(3,'0')}/ar.alafasy.mp3`,
                            };
                        });
                        console.log('Loaded sourates from api.alquran.cloud');
                    } else {
                        throw new Error('Unexpected alquran.cloud response shape');
                    }
                } catch (errAlQuran) {
                    console.warn('api.alquran.cloud failed:', errAlQuran.message);
                    // 3) Final fallback: hardcoded list
                    this.state.allSourates = this.getHardcodedSourates();
                    console.log('Using hardcoded sourates as fallback');
                }
            }

            if (!this.state.allSourates || this.state.allSourates.length === 0) {
                this.state.allSourates = this.getHardcodedSourates();
            }

            console.log(`Loaded ${this.state.allSourates.length} sourates`);
            this.elements.totalSourates.textContent = this.state.allSourates.length;

            this.filterAndDisplay();
            this.showLoading(false);
            this.elements.statsContainer.style.display = 'grid';

        } catch (error) {
            console.error('Error fetching sourates (final):', error);
            // Fallback to hardcoded data
            this.state.allSourates = this.getHardcodedSourates();
            this.elements.totalSourates.textContent = this.state.allSourates.length;
            this.filterAndDisplay();
            this.showLoading(false);
            this.elements.statsContainer.style.display = 'grid';
        }
    },

    // Hardcoded sourates data as fallback
    getHardcodedSourates() {
        return [
            { number: 1, name: "Al-Fatiha", name_english: "Al-Fatiha", name_arabic: "الفاتحة", verses_count: 7, audioUrl: "./audio/001.mp3" },
            { number: 2, name: "Al-Baqarah", name_english: "Al-Baqarah", name_arabic: "البقرة", verses_count: 286, audioUrl: "./audio/002.mp3" },
            { number: 3, name: "Al-Imran", name_english: "Al-Imran", name_arabic: "آل عمران", verses_count: 200, audioUrl: "./audio/003.mp3" },
            { number: 4, name: "An-Nisa", name_english: "An-Nisa", name_arabic: "النساء", verses_count: 176, audioUrl: "./audio/004.mp3" },
            { number: 5, name: "Al-Maidah", name_english: "Al-Maidah", name_arabic: "المائدة", verses_count: 120, audioUrl: "./audio/005.mp3" },
            { number: 6, name: "Al-Anam", name_english: "Al-Anam", name_arabic: "الأنعام", verses_count: 165, audioUrl: "./audio/006.mp3" },
            { number: 7, name: "Al-Araf", name_english: "Al-Araf", name_arabic: "الأعراف", verses_count: 206, audioUrl: "./audio/007.mp3" },
            { number: 8, name: "Al-Anfal", name_english: "Al-Anfal", name_arabic: "الأنفال", verses_count: 75, audioUrl: "./audio/008.mp3" },
            { number: 9, name: "At-Tawbah", name_english: "At-Tawbah", name_arabic: "التوبة", verses_count: 129, audioUrl: "./audio/009.mp3" },
            { number: 10, name: "Yunus", name_english: "Yunus", name_arabic: "يونس", verses_count: 109, audioUrl: "./audio/010.mp3" },
            { number: 11, name: "Hud", name_english: "Hud", name_arabic: "هود", verses_count: 123, audioUrl: "./audio/011.mp3" },
            { number: 12, name: "Yusuf", name_english: "Yusuf", name_arabic: "يوسف", verses_count: 111, audioUrl: "./audio/012.mp3" },
            { number: 13, name: "Ar-Rad", name_english: "Ar-Rad", name_arabic: "الرعد", verses_count: 43, audioUrl: "./audio/013.mp3" },
            { number: 14, name: "Ibrahim", name_english: "Ibrahim", name_arabic: "إبراهيم", verses_count: 52, audioUrl: "./audio/014.mp3" },
            { number: 15, name: "Al-Hijr", name_english: "Al-Hijr", name_arabic: "الحجر", verses_count: 99, audioUrl: "./audio/015.mp3" },
            { number: 16, name: "An-Nahl", name_english: "An-Nahl", name_arabic: "النحل", verses_count: 128, audioUrl: "./audio/016.mp3" },
            { number: 17, name: "Al-Isra", name_english: "Al-Isra", name_arabic: "الإسراء", verses_count: 111, audioUrl: "./audio/017.mp3" },
            { number: 18, name: "Al-Kahf", name_english: "Al-Kahf", name_arabic: "الكهف", verses_count: 110, audioUrl: "./audio/018.mp3" },
            { number: 19, name: "Maryam", name_english: "Maryam", name_arabic: "مريم", verses_count: 98, audioUrl: "./audio/019.mp3" },
            { number: 20, name: "Taha", name_english: "Taha", name_arabic: "طه", verses_count: 135, audioUrl: "./audio/020.mp3" },
            { number: 21, name: "Al-Anbiya", name_english: "Al-Anbiya", name_arabic: "الأنبياء", verses_count: 112, audioUrl: "./audio/021.mp3" },
            { number: 22, name: "Al-Hajj", name_english: "Al-Hajj", name_arabic: "الحج", verses_count: 78, audioUrl: "./audio/022.mp3" },
            { number: 23, name: "Al-Muminun", name_english: "Al-Muminun", name_arabic: "المؤمنون", verses_count: 118, audioUrl: "./audio/023.mp3" },
            { number: 24, name: "An-Nur", name_english: "An-Nur", name_arabic: "النور", verses_count: 64, audioUrl: "./audio/024.mp3" },
            { number: 25, name: "Al-Furqan", name_english: "Al-Furqan", name_arabic: "الفرقان", verses_count: 77, audioUrl: "./audio/025.mp3" },
            { number: 26, name: "Ash-Shuara", name_english: "Ash-Shuara", name_arabic: "الشعراء", verses_count: 227, audioUrl: "./audio/026.mp3" },
            { number: 27, name: "An-Naml", name_english: "An-Naml", name_arabic: "النمل", verses_count: 93, audioUrl: "./audio/027.mp3" },
            { number: 28, name: "Al-Qasas", name_english: "Al-Qasas", name_arabic: "القصص", verses_count: 88, audioUrl: "./audio/028.mp3" },
            { number: 29, name: "Al-Ankabut", name_english: "Al-Ankabut", name_arabic: "العنكبوت", verses_count: 69, audioUrl: "./audio/029.mp3" },
            { number: 30, name: "Ar-Rum", name_english: "Ar-Rum", name_arabic: "الروم", verses_count: 60, audioUrl: "./audio/030.mp3" },
            { number: 31, name: "Luqman", name_english: "Luqman", name_arabic: "لقمان", verses_count: 34, audioUrl: "./audio/031.mp3" },
            { number: 32, name: "As-Sajdah", name_english: "As-Sajdah", name_arabic: "السجدة", verses_count: 30, audioUrl: "./audio/032.mp3" },
            { number: 33, name: "Al-Ahzab", name_english: "Al-Ahzab", name_arabic: "الأحزاب", verses_count: 73, audioUrl: "./audio/033.mp3" },
            { number: 34, name: "Saba", name_english: "Saba", name_arabic: "سبأ", verses_count: 54, audioUrl: "./audio/034.mp3" },
            { number: 35, name: "Fatir", name_english: "Fatir", name_arabic: "فاطر", verses_count: 45, audioUrl: "./audio/035.mp3" },
            { number: 36, name: "Ya-Sin", name_english: "Ya-Sin", name_arabic: "يس", verses_count: 83, audioUrl: "./audio/036.mp3" },
            { number: 37, name: "As-Saffat", name_english: "As-Saffat", name_arabic: "الصافات", verses_count: 182, audioUrl: "./audio/037.mp3" },
            { number: 38, name: "Sad", name_english: "Sad", name_arabic: "ص", verses_count: 88, audioUrl: "./audio/038.mp3" },
            { number: 39, name: "Az-Zumar", name_english: "Az-Zumar", name_arabic: "الزمر", verses_count: 75, audioUrl: "./audio/039.mp3" },
            { number: 40, name: "Ghafir", name_english: "Ghafir", name_arabic: "غافر", verses_count: 85, audioUrl: "./audio/040.mp3" },
            { number: 41, name: "Fussilat", name_english: "Fussilat", name_arabic: "فصلت", verses_count: 54, audioUrl: "./audio/041.mp3" },
            { number: 42, name: "Ash-Shura", name_english: "Ash-Shura", name_arabic: "الشورى", verses_count: 53, audioUrl: "./audio/042.mp3" },
            { number: 43, name: "Az-Zukhruf", name_english: "Az-Zukhruf", name_arabic: "الزخرف", verses_count: 89, audioUrl: "./audio/043.mp3" },
            { number: 44, name: "Ad-Dukhan", name_english: "Ad-Dukhan", name_arabic: "الدخان", verses_count: 59, audioUrl: "./audio/044.mp3" },
            { number: 45, name: "Al-Jathiyah", name_english: "Al-Jathiyah", name_arabic: "الجاثية", verses_count: 37, audioUrl: "./audio/045.mp3" },
            { number: 46, name: "Al-Ahqaf", name_english: "Al-Ahqaf", name_arabic: "الأحقاف", verses_count: 35, audioUrl: "./audio/046.mp3" },
            { number: 47, name: "Muhammad", name_english: "Muhammad", name_arabic: "محمد", verses_count: 38, audioUrl: "./audio/047.mp3" },
            { number: 48, name: "Al-Fath", name_english: "Al-Fath", name_arabic: "الفتح", verses_count: 29, audioUrl: "./audio/048.mp3" },
            { number: 49, name: "Al-Hujurat", name_english: "Al-Hujurat", name_arabic: "الحجرات", verses_count: 18, audioUrl: "./audio/049.mp3" },
            { number: 50, name: "Qaf", name_english: "Qaf", name_arabic: "ق", verses_count: 45, audioUrl: "./audio/050.mp3" },
            { number: 51, name: "Adh-Dhariyat", name_english: "Adh-Dhariyat", name_arabic: "الذاريات", verses_count: 60, audioUrl: "./audio/051.mp3" },
            { number: 52, name: "At-Tur", name_english: "At-Tur", name_arabic: "الطور", verses_count: 49, audioUrl: "./audio/052.mp3" },
            { number: 53, name: "An-Najm", name_english: "An-Najm", name_arabic: "النجم", verses_count: 62, audioUrl: "./audio/053.mp3" },
            { number: 54, name: "Al-Qamar", name_english: "Al-Qamar", name_arabic: "القمر", verses_count: 55, audioUrl: "./audio/054.mp3" },
            { number: 55, name: "Ar-Rahman", name_english: "Ar-Rahman", name_arabic: "الرحمن", verses_count: 78, audioUrl: "./audio/055.mp3" },
            { number: 56, name: "Al-Waqi'ah", name_english: "Al-Waqi'ah", name_arabic: "الواقعة", verses_count: 96, audioUrl: "./audio/056.mp3" },
            { number: 57, name: "Al-Hadid", name_english: "Al-Hadid", name_arabic: "الحديد", verses_count: 29, audioUrl: "./audio/057.mp3" },
            { number: 58, name: "Al-Mujadilah", name_english: "Al-Mujadilah", name_arabic: "المجادلة", verses_count: 22, audioUrl: "./audio/058.mp3" },
            { number: 59, name: "Al-Hashr", name_english: "Al-Hashr", name_arabic: "الحشر", verses_count: 24, audioUrl: "./audio/059.mp3" },
            { number: 60, name: "Al-Mumtahinah", name_english: "Al-Mumtahinah", name_arabic: "الممتحنة", verses_count: 13, audioUrl: "./audio/060.mp3" },
            { number: 61, name: "As-Saff", name_english: "As-Saff", name_arabic: "الصف", verses_count: 14, audioUrl: "./audio/061.mp3" },
            { number: 62, name: "Al-Jumu'ah", name_english: "Al-Jumu'ah", name_arabic: "الجمعة", verses_count: 11, audioUrl: "./audio/062.mp3" },
            { number: 63, name: "Al-Munafiqun", name_english: "Al-Munafiqun", name_arabic: "المنافقون", verses_count: 11, audioUrl: "./audio/063.mp3" },
            { number: 64, name: "At-Taghabun", name_english: "At-Taghabun", name_arabic: "التغابن", verses_count: 18, audioUrl: "./audio/064.mp3" },
            { number: 65, name: "At-Talaq", name_english: "At-Talaq", name_arabic: "الطلاق", verses_count: 12, audioUrl: "./audio/065.mp3" },
            { number: 66, name: "At-Tahrim", name_english: "At-Tahrim", name_arabic: "التحريم", verses_count: 12, audioUrl: "./audio/066.mp3" },
            { number: 67, name: "Al-Mulk", name_english: "Al-Mulk", name_arabic: "الملك", verses_count: 30, audioUrl: "./audio/067.mp3" },
            { number: 68, name: "Al-Qalam", name_english: "Al-Qalam", name_arabic: "القلم", verses_count: 52, audioUrl: "./audio/068.mp3" },
            { number: 69, name: "Al-Haqqah", name_english: "Al-Haqqah", name_arabic: "الحاقة", verses_count: 52, audioUrl: "./audio/069.mp3" },
            { number: 70, name: "Al-Ma'arij", name_english: "Al-Ma'arij", name_arabic: "المعارج", verses_count: 44, audioUrl: "./audio/070.mp3" },
            { number: 71, name: "Nuh", name_english: "Nuh", name_arabic: "نوح", verses_count: 28, audioUrl: "./audio/071.mp3" },
            { number: 72, name: "Al-Jinn", name_english: "Al-Jinn", name_arabic: "الجن", verses_count: 28, audioUrl: "./audio/072.mp3" },
            { number: 73, name: "Al-Muzzammil", name_english: "Al-Muzzammil", name_arabic: "المزمل", verses_count: 20, audioUrl: "./audio/073.mp3" },
            { number: 74, name: "Al-Muddaththir", name_english: "Al-Muddaththir", name_arabic: "المدثر", verses_count: 56, audioUrl: "./audio/074.mp3" },
            { number: 75, name: "Al-Qiyamah", name_english: "Al-Qiyamah", name_arabic: "القيامة", verses_count: 40, audioUrl: "./audio/075.mp3" },
            { number: 76, name: "Al-Insan", name_english: "Al-Insan", name_arabic: "الإنسان", verses_count: 31, audioUrl: "./audio/076.mp3" },
            { number: 77, name: "Al-Mursalat", name_english: "Al-Mursalat", name_arabic: "المرسلات", verses_count: 50, audioUrl: "./audio/077.mp3" },
            { number: 78, name: "An-Naba", name_english: "An-Naba", name_arabic: "النبأ", verses_count: 40, audioUrl: "./audio/078.mp3" },
            { number: 79, name: "An-Naziat", name_english: "An-Naziat", name_arabic: "النازعات", verses_count: 46, audioUrl: "./audio/079.mp3" },
            { number: 80, name: "Abasa", name_english: "Abasa", name_arabic: "عبس", verses_count: 42, audioUrl: "./audio/080.mp3" },
            { number: 81, name: "At-Takwir", name_english: "At-Takwir", name_arabic: "التكوير", verses_count: 29, audioUrl: "./audio/081.mp3" },
            { number: 82, name: "Al-Infitar", name_english: "Al-Infitar", name_arabic: "الانفطار", verses_count: 19, audioUrl: "./audio/082.mp3" },
            { number: 83, name: "Al-Mutaffifin", name_english: "Al-Mutaffifin", name_arabic: "المطففين", verses_count: 36, audioUrl: "./audio/083.mp3" },
            { number: 84, name: "Al-Inshiqaq", name_english: "Al-Inshiqaq", name_arabic: "الانشقاق", verses_count: 25, audioUrl: "./audio/084.mp3" },
            { number: 85, name: "Al-Buruj", name_english: "Al-Buruj", name_arabic: "البروج", verses_count: 22, audioUrl: "./audio/085.mp3" },
            { number: 86, name: "At-Tariq", name_english: "At-Tariq", name_arabic: "الطارق", verses_count: 17, audioUrl: "./audio/086.mp3" },
            { number: 87, name: "Al-A'la", name_english: "Al-A'la", name_arabic: "الأعلى", verses_count: 19, audioUrl: "./audio/087.mp3" },
            { number: 88, name: "Al-Ghashiyah", name_english: "Al-Ghashiyah", name_arabic: "الغاشية", verses_count: 26, audioUrl: "./audio/088.mp3" },
            { number: 89, name: "Al-Fajr", name_english: "Al-Fajr", name_arabic: "الفجر", verses_count: 30, audioUrl: "./audio/089.mp3" },
            { number: 90, name: "Al-Balad", name_english: "Al-Balad", name_arabic: "البلد", verses_count: 20, audioUrl: "./audio/090.mp3" },
            { number: 91, name: "Ash-Shams", name_english: "Ash-Shams", name_arabic: "الشمس", verses_count: 15, audioUrl: "./audio/091.mp3" },
            { number: 92, name: "Al-Layl", name_english: "Al-Layl", name_arabic: "الليل", verses_count: 21, audioUrl: "./audio/092.mp3" },
            { number: 93, name: "Ad-Duha", name_english: "Ad-Duha", name_arabic: "الضحى", verses_count: 11, audioUrl: "./audio/093.mp3" },
            { number: 94, name: "Al-Inshirah", name_english: "Al-Inshirah", name_arabic: "الانشراح", verses_count: 8, audioUrl: "./audio/094.mp3" },
            { number: 95, name: "At-Tin", name_english: "At-Tin", name_arabic: "التين", verses_count: 8, audioUrl: "./audio/095.mp3" },
            { number: 96, name: "Al-Alaq", name_english: "Al-Alaq", name_arabic: "العلق", verses_count: 19, audioUrl: "./audio/096.mp3" },
            { number: 97, name: "Al-Qadr", name_english: "Al-Qadr", name_arabic: "القدر", verses_count: 5, audioUrl: "./audio/097.mp3" },
            { number: 98, name: "Al-Bayyinah", name_english: "Al-Bayyinah", name_arabic: "البينة", verses_count: 8, audioUrl: "./audio/098.mp3" },
            { number: 99, name: "Az-Zilzal", name_english: "Az-Zilzal", name_arabic: "الزلزلة", verses_count: 8, audioUrl: "./audio/099.mp3" },
            { number: 100, name: "Al-Adiyat", name_english: "Al-Adiyat", name_arabic: "العاديات", verses_count: 11, audioUrl: "./audio/100.mp3" },
            { number: 101, name: "Al-Qari'ah", name_english: "Al-Qari'ah", name_arabic: "القارعة", verses_count: 11, audioUrl: "./audio/101.mp3" },
            { number: 102, name: "At-Takathur", name_english: "At-Takathur", name_arabic: "التكاثر", verses_count: 8, audioUrl: "./audio/102.mp3" },
            { number: 103, name: "Al-Asr", name_english: "Al-Asr", name_arabic: "العصر", verses_count: 3, audioUrl: "./audio/103.mp3" },
            { number: 104, name: "Al-Humazah", name_english: "Al-Humazah", name_arabic: "الهمزة", verses_count: 9, audioUrl: "./audio/104.mp3" },
            { number: 105, name: "Al-Fil", name_english: "Al-Fil", name_arabic: "الفيل", verses_count: 5, audioUrl: "./audio/105.mp3" },
            { number: 106, name: "Quraysh", name_english: "Quraysh", name_arabic: "قريش", verses_count: 4, audioUrl: "./audio/106.mp3" },
            { number: 107, name: "Al-Ma'un", name_english: "Al-Ma'un", name_arabic: "الماعون", verses_count: 7, audioUrl: "./audio/107.mp3" },
            { number: 108, name: "Al-Kawthar", name_english: "Al-Kawthar", name_arabic: "الكوثر", verses_count: 3, audioUrl: "./audio/108.mp3" },
            { number: 109, name: "Al-Kafirun", name_english: "Al-Kafirun", name_arabic: "الكافرون", verses_count: 6, audioUrl: "./audio/109.mp3" },
            { number: 110, name: "An-Nasr", name_english: "An-Nasr", name_arabic: "النصر", verses_count: 3, audioUrl: "./audio/110.mp3" },
            { number: 111, name: "Al-Masad", name_english: "Al-Masad", name_arabic: "المسد", verses_count: 5, audioUrl: "./audio/111.mp3" },
            { number: 112, name: "Al-Ikhlas", name_english: "Al-Ikhlas", name_arabic: "الإخلاص", verses_count: 4, audioUrl: "./audio/112.mp3" },
            { number: 113, name: "Al-Falaq", name_english: "Al-Falaq", name_arabic: "الفلق", verses_count: 5, audioUrl: "./audio/113.mp3" },
            { number: 114, name: "An-Nas", name_english: "An-Nas", name_arabic: "الناس", verses_count: 6, audioUrl: "./audio/114.mp3" },
        ];
    },

    async fetchReciters() {
        // Reciters are now populated from alquran.cloud audio editions in fetchAudioEditions()
        this.state.availableReciters = this.state.audioEditions.map(ed => ({
            id: ed.identifier,
            reciter_name: ed.englishName || ed.name || ed.identifier
        }));
        
        this.elements.totalReciters.textContent = this.state.audioEditions.length;
    },

    // ========== DATA FILTERING & DISPLAY ==========
    filterAndDisplay() {
        const query = (this.state.searchQuery || '').trim();
        const { minRange, maxRange } = this.getNormalizedVerseRange();

        const filtered = this.state.allSourates.filter(surah => {
            const englishName = (surah.name_english || '').toLowerCase();
            const arabicName = (surah.name_arabic || '').toLowerCase();
            const latinName = (surah.name || '').toLowerCase();
            const revelationPlace = (surah.revelation_place || '').toLowerCase();

            const matchesQuery = !query || 
                latinName.includes(query) ||
                arabicName.includes(query) ||
                englishName.includes(query) ||
                revelationPlace.includes(query) ||
                surah.number.toString().includes(query);

            if (!matchesQuery) return false;

            const verses = surah.verses_count || 0;
            if (this.state.lengthFilter === 'short' && verses > 40) return false;
            if (this.state.lengthFilter === 'medium' && (verses <= 40 || verses > 100)) return false;
            if (this.state.lengthFilter === 'long' && verses <= 100) return false;

            if (minRange !== null && verses < minRange) return false;
            if (maxRange !== null && verses > maxRange) return false;

            if (this.state.favoritesOnly) {
                return this.state.favorites.some(fav => fav.number === surah.number);
            }

            return true;
        });

        this.state.displayedSourates = this.sortSourates(filtered);
        this.state.currentPage = 1;
        this.updateSearchSummary();
        this.updateClearSearchVisibility();
        this.displaySourates();
    },

    getNormalizedVerseRange() {
        const normalize = (value) => {
            if (value === null || value === undefined || value === '') return null;
            if (typeof value === 'number') return value;
            const parsed = parseInt(value, 10);
            return Number.isNaN(parsed) ? null : parsed;
        };

        let minRange = normalize(this.state.minVerses);
        let maxRange = normalize(this.state.maxVerses);

        if (minRange !== null && minRange < 1) minRange = 1;
        if (maxRange !== null && maxRange < 1) maxRange = 1;

        if (minRange !== null && maxRange !== null && minRange > maxRange) {
            [minRange, maxRange] = [maxRange, minRange];
        }

        return { minRange, maxRange };
    },

    sortSourates(list) {
        const sorted = [...list];
        switch (this.state.sortMode) {
            case 'name':
                sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
                break;
            case 'versesAsc':
                sorted.sort((a, b) => (a.verses_count || 0) - (b.verses_count || 0));
                break;
            case 'versesDesc':
                sorted.sort((a, b) => (b.verses_count || 0) - (a.verses_count || 0));
                break;
            default:
                sorted.sort((a, b) => a.number - b.number);
        }
        return sorted;
    },

    updateSearchSummary() {
        if (!this.elements.searchSummary) return;
        const total = this.state.displayedSourates.length;
        const queryText = this.state.searchQueryRaw ? `matching "${this.state.searchQueryRaw}"` : 'available';
        const filters = [];

        const lengthLabels = {
            short: 'Short < 40 ayat',
            medium: 'Medium 40-100 ayat',
            long: 'Long > 100 ayat',
        };

        if (this.state.lengthFilter !== 'all') {
            filters.push(lengthLabels[this.state.lengthFilter]);
        }

        const { minRange, maxRange } = this.getNormalizedVerseRange();
        if (minRange !== null || maxRange !== null) {
            if (minRange !== null && maxRange !== null) {
                filters.push(`Verses ${minRange}-${maxRange}`);
            } else if (minRange !== null) {
                filters.push(`≥ ${minRange} verses`);
            } else if (maxRange !== null) {
                filters.push(`≤ ${maxRange} verses`);
            }
        }

        if (this.state.favoritesOnly) {
            filters.push('Favorites only');
        }

        const filterText = filters.length ? ` • Filters: ${filters.join(', ')}` : '';
        this.elements.searchSummary.textContent = `${total} surahs ${queryText}${filterText}`;
    },

    handleVerseRangeInput(bound, rawValue) {
        const parsed = parseInt(rawValue, 10);
        this.state[bound] = Number.isNaN(parsed) ? null : Math.max(1, parsed);
        this.filterAndDisplay();
    },

    setLengthFilter(filterKey) {
        if (this.state.lengthFilter === filterKey && filterKey !== 'all') {
            this.state.lengthFilter = 'all';
        } else {
            this.state.lengthFilter = filterKey;
        }
        this.updateLengthFilterChips();
        this.filterAndDisplay();
    },

    updateLengthFilterChips() {
        if (!this.elements.lengthFilterChips.length) return;
        this.elements.lengthFilterChips.forEach(chip => {
            const key = chip.dataset.lengthFilter || 'all';
            chip.classList.toggle('active', key === this.state.lengthFilter);
        });
    },

    updateClearSearchVisibility() {
        if (!this.elements.clearSearch) return;
        const hasValue = Boolean(this.state.searchQueryRaw);
        this.elements.clearSearch.classList.toggle('is-visible', hasValue);
    },

    displaySourates() {
        const start = (this.state.currentPage - 1) * this.config.itemsPerPage;
        const end = start + this.config.itemsPerPage;
        const paginatedSourates = this.state.displayedSourates.slice(start, end);

        this.renderSourates(paginatedSourates);
        this.updatePagination();
    },

    renderSourates(sourates) {
        const reciterLabel = this.getCurrentReciterName();
        this.elements.souratesContainer.style.display = 'grid';

        if (!sourates.length) {
            this.elements.souratesContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>No surahs match your filters</h3>
                    <p>Try clearing the search bar or adjusting the filters above.</p>
                </div>
            `;
            return;
        }

        this.elements.souratesContainer.innerHTML = sourates.map(surah => {
            const isFavorite = this.state.favorites.some(fav => fav.number === surah.number);
            const revelationSlug = (surah.revelation_place || 'unknown').toLowerCase();
            const revelationClass = revelationSlug.replace(/\s+/g, '-');
            const revelationLabel = revelationSlug === 'unknown'
                ? 'Unknown'
                : revelationSlug.charAt(0).toUpperCase() + revelationSlug.slice(1);
            
            return `
                <div class="sourate-card">
                    <div class="sourate-header">
                        <h3>${surah.name}</h3>
                        <p class="sourate-arabic">${surah.name_arabic}</p>
                    </div>
                    
                    <div class="sourate-body">
                        <div class="sourate-info">
                            <div class="info-item">
                                <span class="info-label">English Name</span>
                                <span class="info-value">${surah.name_english || surah.name}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Reciter</span>
                                <span class="info-value">${reciterLabel}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Verses</span>
                                <span class="info-value">${surah.verses_count}</span>
                            </div>
                        </div>

                        <div class="card-tags">
                            <span class="card-tag"><i class="fas fa-list"></i>${surah.verses_count} verses</span>
                            <span class="card-tag"><i class="fas fa-place-of-worship"></i>${revelationLabel}</span>
                        </div>
                        
                        <div class="sourate-actions">
                            <button class="btn-play" data-surah-number="${surah.number}" title="Play ${surah.name}">
                                <i class="fas fa-play"></i> Play
                            </button>
                            <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                                    data-surah-number="${surah.number}" 
                                    title="${isFavorite ? 'Remove from favorites' : 'Add to favorites'}">
                                <i class="fas fa-heart"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Attach event listeners to buttons
        this.elements.souratesContainer.querySelectorAll('.btn-play').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const number = parseInt(btn.dataset.surahNumber);
                const surah = this.state.allSourates.find(s => s.number === number);
                if (surah) this.playSurah(surah);
            });
        });

        this.elements.souratesContainer.querySelectorAll('.btn-favorite').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const number = parseInt(btn.dataset.surahNumber);
                const surah = this.state.allSourates.find(s => s.number === number);
                if (surah) this.toggleFavorite(surah);
            });
        });
    },

    updatePagination() {
        const totalPages = Math.ceil(this.state.displayedSourates.length / this.config.itemsPerPage);

        if (totalPages <= 1) {
            this.elements.paginationContainer.style.display = 'none';
            return;
        }

        this.elements.pageInfo.textContent = `Page ${this.state.currentPage} of ${totalPages}`;
        this.elements.prevBtn.disabled = this.state.currentPage === 1;
        this.elements.nextBtn.disabled = this.state.currentPage === totalPages;
        this.elements.paginationContainer.style.display = 'flex';
    },

    // Reciter selection is now handled by populateReciterSelectFromEditions()
    populateReciterSelect() {
        // Kept for backward compatibility, but functionality moved to populateReciterSelectFromEditions
    },

    // ========== PLAYER FUNCTIONALITY ==========
    async playSurah(surah) {
        this.state.currentSurah = surah;
        
        // Update modal content
        this.elements.modalTitle.textContent = surah.name;
        this.elements.modalReciter.textContent = `🎤 ${this.getCurrentReciterName()}`;
        this.elements.infoNumber.textContent = surah.number;
        this.elements.infoArabicName.textContent = surah.name_arabic;
        this.elements.infoEnglishName.textContent = surah.name_english || surah.name;
        this.elements.infoVerses.textContent = surah.verses_count;

        // Update button states
        this.elements.prevSurah.disabled = surah.number === 1;
        this.elements.nextSurah.disabled = surah.number === 114;

        // Open modal
        this.elements.playerModal.style.display = 'flex';
        
        // Hide error message
        this.elements.errorMessage.style.display = 'none';
        
        // Load real audio files with multiple fallback sources
        try {
            // Fetch ayahs (verse-by-verse) including audio URLs from alquran.cloud
            await this.fetchSurahAyahs(surah);
            console.log('Fetched ayahs for verse-by-verse playback');
            // Prepare audio but do not auto-play; user can choose Play Verse or Play Full Surah
            this.setupVerseControls();
        } catch (error) {
            console.error('Error loading audio:', error);
            this.elements.errorMessage.style.display = 'block';
            this.elements.errorText.innerHTML = `
                <strong>⚠️ Unable to Load Audio</strong><br>
                Could not find audio for this Surah. Please try another.<br>
                <small>Error: ${error.message}</small>
            `;
        }
    },

    // Fetch ayahs (with audio URLs) from alquran.cloud for the selected recitation edition
    async fetchSurahAyahs(surah) {
        try {
            const edition = this.state.selectedRecitationEdition || 'ar.abdulbasitmurattal';
            const url = `https://api.alquran.cloud/v1/surah/${surah.number}/${edition}`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`alquran.cloud HTTP ${resp.status}`);
            const data = await resp.json();

            if (data && data.data && Array.isArray(data.data.ayahs)) {
                // Map ayahs to {index, text, audio}
                surah.ayahs = data.data.ayahs.map(a => ({
                    numberInSurah: a.numberInSurah,
                    text: a.text,
                    audio: a.audio || (a.audioSecondary && a.audioSecondary[0]) || null
                }));
                
                // Add Basmala (بسم الله الرحمن الرحيم) from Surah 1:1 to all surahs except Surah 9 (At-Tawbah)
                // Only prepend Basmala for surahs that do NOT already start with it (i.e., skip Surah 1 and Surah 9)
                if (surah.number > 1 && surah.number !== 9) {
                    try {
                        const basmalaUrl = `https://api.alquran.cloud/v1/surah/1/${edition}`;
                        const basmalaResp = await fetch(basmalaUrl);
                        if (basmalaResp.ok) {
                            const basmalaData = await basmalaResp.json();
                            if (basmalaData && basmalaData.data && basmalaData.data.ayahs && basmalaData.data.ayahs[0]) {
                                const basmala = basmalaData.data.ayahs[0];
                                const basmalaVerse = {
                                    numberInSurah: 0,
                                    text: basmala.text,
                                    audio: basmala.audio || (basmala.audioSecondary && basmala.audioSecondary[0]) || null,
                                    isBasmala: true
                                };
                                // Prepend Basmala to the beginning
                                surah.ayahs.unshift(basmalaVerse);
                                console.log(`Added Basmala to Surah ${surah.number}`);

                                // We will not mutate the original verse text here; rendering will hide any duplicated
                                // Basmala prefix to keep the original data intact and handle diacritic differences.
                            }
                        }
                    } catch (basmalaErr) {
                        console.warn(`Failed to fetch Basmala for Surah ${surah.number}:`, basmalaErr.message);
                        // Continue without Basmala if fetch fails
                    }
                }
                
                // Reset verse state
                this.state.currentVerseIndex = 0;
                this.state.isPlayingFullSurah = false;
                this.renderVersesList(surah.ayahs);
            } else {
                throw new Error('No ayahs in API response');
            }
        } catch (err) {
            console.warn('Failed to fetch ayahs from alquran.cloud:', err.message);
            // Fallback: if surah has no ayahs, try to use hardcoded or throw
            surah.ayahs = [];
            throw err;
        }
    },

    renderVersesList(ayahs) {
        const list = this.elements.versesList;
        list.innerHTML = '';

        // Helper: strip common Arabic diacritics and normalize spaces for comparison
        const normalize = (s = '') => s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '')
                                    .replace(/\s+/g, ' ')
                                    .replace(/\u0671/g, 'ا')
                                    .trim();

        // Build a set of basmala variants if present as first item
        const hasInsertedBasmala = ayahs[0] && ayahs[0].isBasmala;
        const basmalaText = hasInsertedBasmala ? (ayahs[0].text || '') : '';
        const basmalaNorm = normalize(basmalaText);

        ayahs.forEach((a, idx) => {
            const li = document.createElement('li');
            li.dataset.index = idx;
            li.style.padding = '8px';
            li.style.borderBottom = '1px solid #eee';
            li.style.cursor = 'pointer';

            let displayText = a.text || '';

            // If we've inserted Basmala as a separate first item, hide duplicated prefix from the original first verse
            if (hasInsertedBasmala && !a.isBasmala && idx === 1 && basmalaNorm) {
                const candidate = displayText;
                const candNorm = normalize(candidate);
                // If normalized starts with normalized basmala, attempt to remove the visible prefix
                if (candNorm.startsWith(basmalaNorm)) {
                    // Try direct substring remove using basmalaText if it's found at start
                    if (candidate.startsWith(basmalaText)) {
                        displayText = candidate.slice(basmalaText.length).trim();
                    } else {
                        // Fallback: remove approximate prefix by splitting words
                        const basmalaWords = basmalaNorm.split(' ');
                        const candWords = candNorm.split(' ');
                        // remove as many leading words as match the basmala words
                        let removeCount = 0;
                        for (let i = 0; i < basmalaWords.length && i < candWords.length; i++) {
                            if (candWords[i] === basmalaWords[i]) removeCount++; else break;
                        }
                        if (removeCount > 0) {
                            // Reconstruct displayText by slicing the original candidate by words
                            const originalWords = candidate.split(/\s+/);
                            displayText = originalWords.slice(removeCount).join(' ').trim();
                        }
                    }
                }
            }

            // Display label: "Basmala" for Basmala verse, "Verse N" for others
            const verseLabel = a.isBasmala ? 'Basmala' : `Verse ${a.numberInSurah}`;
            li.innerHTML = `<div style="font-size:0.95rem; color:#333;">${displayText}</div><div style="font-size:0.8rem; color:#777; margin-top:6px;">${verseLabel}</div>`;
            li.addEventListener('click', () => this.playVerse(idx));
            list.appendChild(li);
        });
        this.highlightCurrentVerse();
    },

    highlightCurrentVerse() {
        const items = this.elements.versesList.querySelectorAll('li');
        items.forEach(li => li.style.background = '');
        const cur = items[this.state.currentVerseIndex];
        if (cur) cur.style.background = 'linear-gradient(90deg,#f0f8ff,#ffffff)';
        // Scroll into view
        if (cur && this.elements.versesContainer) {
            const container = this.elements.versesContainer;
            const rect = cur.getBoundingClientRect();
            const crect = container.getBoundingClientRect();
            if (rect.top < crect.top || rect.bottom > crect.bottom) cur.scrollIntoView({behavior:'smooth', block:'center'});
        }
    },

    setupVerseControls() {
        // Wire up buttons
        this.elements.playCurrentVerse.onclick = () => this.playVerse(this.state.currentVerseIndex);
        this.elements.playFullSurah.onclick = () => {
            this.state.isPlayingFullSurah = true;
            this.playVerse(0);
        };
        this.elements.prevVerse.onclick = () => this.playPrevVerse();
        this.elements.nextVerse.onclick = () => this.playNextVerse();

        // Ensure audio ended event advances when full-surah mode is on
        const audio = this.elements.audioPlayer;
        audio.onended = () => {
            if (this.state.isPlayingFullSurah) {
                if (this.state.currentVerseIndex < (this.state.currentSurah.ayahs.length - 1)) {
                    this.playVerse(this.state.currentVerseIndex + 1);
                } else {
                    // reached end
                    this.state.isPlayingFullSurah = false;
                }
            }
        };
    },

    playVerse(idx) {
        const surah = this.state.currentSurah;
        if (!surah || !Array.isArray(surah.ayahs) || !surah.ayahs[idx]) {
            console.warn('Verse not available:', idx);
            return;
        }
        const verse = surah.ayahs[idx];
        if (!verse.audio) {
            console.warn('No audio URL for verse', idx);
            this.elements.errorMessage.style.display = 'block';
            this.elements.errorText.textContent = 'Audio not available for this verse.';
            return;
        }

        this.state.currentVerseIndex = idx;
        this.highlightCurrentVerse();
        const audio = this.elements.audioPlayer;
        audio.src = verse.audio;
        audio.load();
        audio.play().catch(err => console.warn('Play rejected:', err));
    },

    playNextVerse() {
        const next = this.state.currentVerseIndex + 1;
        if (this.state.currentSurah && next < this.state.currentSurah.ayahs.length) {
            this.playVerse(next);
        }
    },

    playPrevVerse() {
        const prev = this.state.currentVerseIndex - 1;
        if (this.state.currentSurah && prev >= 0) {
            this.playVerse(prev);
        }
    },

    async loadRealAudio(surah) {
        // Helper: try to load a URL or data URI by assigning it to the audio element and
        // waiting for either `canplay` or `error` event.
        const tryLoadUrl = (url, timeoutMs = 12000) => new Promise((resolve, reject) => {
            const audio = this.elements.audioPlayer;
            let resolved = false;

            const onCanPlay = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                resolve(url);
            };

            const onError = (e) => {
                if (resolved) return;
                resolved = true;
                cleanup();
                const code = audio.error && audio.error.code ? audio.error.code : 'unknown';
                reject(new Error(`Media error code=${code}`));
            };

            const onTimeout = () => {
                if (resolved) return;
                resolved = true;
                cleanup();
                reject(new Error(`Timeout after ${timeoutMs}ms`));
            };

            const cleanup = () => {
                audio.removeEventListener('canplay', onCanPlay);
                audio.removeEventListener('error', onError);
                clearTimeout(timer);
            };

            // Do not set crossOrigin: many public audio CDNs do not send CORS headers.
            // Setting crossOrigin can cause the browser to require CORS headers and
            // block playback if they are missing. Leave it unset to maximize
            // compatibility with public audio hosts.

            audio.src = url;
            audio.load();

            audio.addEventListener('canplay', onCanPlay);
            audio.addEventListener('error', onError);

            const timer = setTimeout(onTimeout, timeoutMs);
        });

        const padded = String(surah.number).padStart(3,'0');
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const isGitHubPages = window.location.hostname.includes('github.io');

        // Candidate audio sources (ordered for best compatibility)
        const candidates = [];

        if (surah.audioUrl) candidates.push(surah.audioUrl);
        
        // Try to fetch audio from alquran.cloud API (provides CORS-free audio URLs)
        if (surah.alquranCloudAudioUrl) {
            candidates.push({
                name: 'alquran.cloud API',
                url: surah.alquranCloudAudioUrl,
                isApi: true  // Signal to fetch and extract audio URL
            });
        }
        
        // Prefer server-side proxy endpoint (works when running server.js locally)
        if (isLocalhost) {
            candidates.push(`/audio/surah/${surah.number}`);
        }
        
        if (surah.remoteAudioUrl) candidates.push(surah.remoteAudioUrl);

    // Additional public mirrors (may be blocked by CORS if accessed from browser)
        candidates.push(`https://everyayah.com/quran/${padded}.mp3`);
        candidates.push(`https://data.alquran.cloud/files/audio/alafasy/${padded}.mp3`);
        candidates.push(`https://www.mp3quran.net/api/v3/files/get_file?file_id=${padded}_jbreen_128`);

        // Try candidates sequentially until one works
        for (const candidate of candidates) {
            try {
                let url = typeof candidate === 'string' ? candidate : candidate.url;
                const isApi = candidate.isApi;
                
                console.log(`Trying audio source: ${typeof candidate === 'string' ? candidate : candidate.name}`);
                
                // If it's an API endpoint, fetch it and extract the audio URL
                if (isApi) {
                    try {
                        const apiResp = await fetch(url);
                        if (!apiResp.ok) throw new Error(`API returned ${apiResp.status}`);
                        const apiData = await apiResp.json();
                        
                        // Extract audio URL from first ayah
                        if (apiData && apiData.data && apiData.data.ayahs && apiData.data.ayahs[0]) {
                            url = apiData.data.ayahs[0].audio;
                            console.log(`Extracted audio URL from API: ${url}`);
                        } else {
                            throw new Error('No audio data in API response');
                        }
                    } catch (apiErr) {
                        console.warn(`API extraction failed: ${apiErr.message}`);
                        continue;  // Try next candidate
                    }
                }
                
                await tryLoadUrl(url, 15000);
                console.log(`✅ Audio loaded from: ${url}`);
                this.elements.audioPlayer.play().catch(() => {});
                this.state.currentAudioUrl = url;
                return;
            } catch (err) {
                console.warn(`Source failed: ${typeof candidate === 'string' ? candidate : candidate.name} — ${err.message}`);
                // continue to next source
            }
        }

        // If none of the candidates worked, show helpful guidance
        console.warn(`⚠️ No audio available for Surah ${surah.number} after trying multiple sources`);
        
        if (isLocalhost) {
            console.warn('💡 Make sure the proxy server is running: `node server.js`');
        }

        throw new Error(
            isGitHubPages 
                ? `Audio unavailable. Tried alquran.cloud API and fallback sources. See console for details.`
                : `Audio not available for Surah ${surah.number}. Tried ${candidates.length} sources.`
        );
    },

    playPreviousSurah() {
        if (this.state.currentSurah.number > 1) {
            const previousSurah = this.state.allSourates.find(s => s.number === this.state.currentSurah.number - 1);
            if (previousSurah) this.playSurah(previousSurah);
        }
    },

    playNextSurah() {
        if (this.state.currentSurah.number < 114) {
            const nextSurah = this.state.allSourates.find(s => s.number === this.state.currentSurah.number + 1);
            if (nextSurah) this.playSurah(nextSurah);
        }
    },

    closePlayerModal() {
        this.elements.playerModal.style.display = 'none';
        this.elements.audioPlayer.pause();
        // stop full-surah playback
        this.state.isPlayingFullSurah = false;
    },

    // ========== FAVORITES MANAGEMENT ==========
    toggleFavorite(surah) {
        const index = this.state.favorites.findIndex(fav => fav.number === surah.number);
        
        if (index > -1) {
            this.state.favorites.splice(index, 1);
        } else {
            this.state.favorites.push({
                number: surah.number,
                name: surah.name,
                name_arabic: surah.name_arabic,
                verses_count: surah.verses_count,
                audioUrl: surah.audioUrl,
            });
        }

        this.saveFavorites();
        this.updateFavoriteButton(surah.number);
        this.updateFavoriteCount();
        
        // Refresh the display to update heart icons
        if (this.state.favoritesOnly) {
            this.filterAndDisplay();
            return;
        }
        const currentStart = (this.state.currentPage - 1) * this.config.itemsPerPage;
        const currentEnd = currentStart + this.config.itemsPerPage;
        const displayedSourates = this.state.displayedSourates.slice(currentStart, currentEnd);
        this.renderSourates(displayedSourates);
    },

    updateFavoriteButton(surahNumber) {
        const isFavorite = this.state.favorites.some(fav => fav.number === surahNumber);
        const button = document.querySelector(`[data-surah-number="${surahNumber}"].btn-favorite`);
        
        if (button) {
            if (isFavorite) {
                button.classList.add('active');
                button.title = 'Remove from favorites';
            } else {
                button.classList.remove('active');
                button.title = 'Add to favorites';
            }
        }
    },

    updateFavoriteCount() {
        this.elements.favoriteCount.textContent = this.state.favorites.length;
    },

    openFavoritesModal() {
        if (this.state.favorites.length === 0) {
            this.elements.favoritesList.innerHTML = `
                <div class="empty-favorites">
                    <i class="fas fa-heart-broken"></i>
                    <p>No favorite sourates yet!</p>
                    <p style="font-size: 0.9rem;">Start adding your favorite sourates to listen to them later.</p>
                </div>
            `;
        } else {
            this.elements.favoritesList.innerHTML = this.state.favorites.map(favorite => `
                <div class="favorite-item">
                    <div class="favorite-info">
                        <h4>${favorite.name}</h4>
                        <p>${favorite.name_arabic} • ${favorite.verses_count} verses</p>
                    </div>
                    <div class="favorite-actions">
                        <button class="btn btn-primary btn-small" data-fav-number="${favorite.number}" onclick="APP.playFavorite(${favorite.number})">
                            <i class="fas fa-play"></i>
                        </button>
                        <button class="btn btn-secondary btn-small" data-remove-fav="${favorite.number}" onclick="APP.removeFavorite(${favorite.number})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }

        this.elements.favoritesModal.style.display = 'flex';
    },

    closeFavoritesModal() {
        this.elements.favoritesModal.style.display = 'none';
    },

    playFavorite(surahNumber) {
        const surah = this.state.allSourates.find(s => s.number === surahNumber);
        if (surah) {
            this.playSurah(surah);
            this.closeFavoritesModal();
        }
    },

    removeFavorite(surahNumber) {
        const surah = this.state.allSourates.find(s => s.number === surahNumber);
        if (surah) {
            this.toggleFavorite(surah);
            this.openFavoritesModal(); // Refresh favorites modal
        }
    },

    saveFavorites() {
        localStorage.setItem('quran-favorites', JSON.stringify(this.state.favorites));
    },

    loadFavorites() {
        const saved = localStorage.getItem('quran-favorites');
        if (saved) {
            try {
                this.state.favorites = JSON.parse(saved);
                this.updateFavoriteCount();
            } catch (error) {
                console.error('Error loading favorites:', error);
            }
        }
    },

    // ========== UTILITY FUNCTIONS ==========
    resetFilters() {
        this.elements.searchInput.value = '';
        this.state.searchQuery = '';
        this.state.searchQueryRaw = '';
        this.state.selectedReciter = 1;
        this.state.lengthFilter = 'all';
        this.state.minVerses = null;
        this.state.maxVerses = null;
        this.state.favoritesOnly = false;
        this.state.sortMode = 'number';
        if (this.elements.minVerses) this.elements.minVerses.value = '';
        if (this.elements.maxVerses) this.elements.maxVerses.value = '';
        if (this.elements.favoritesOnlyToggle) this.elements.favoritesOnlyToggle.checked = false;
        if (this.elements.sortSelect) this.elements.sortSelect.value = 'number';
        if (this.elements.reciterSelect) {
            this.elements.reciterSelect.value = this.state.selectedRecitationEdition || '';
        }
        this.updateLengthFilterChips();
        this.updateClearSearchVisibility();
        this.state.currentPage = 1;
        this.filterAndDisplay();
    },

    showLoading(show) {
        this.elements.loadingSpinner.style.display = show ? 'flex' : 'none';
    },

    showError(show, message = '') {
        this.elements.errorMessage.style.display = show ? 'flex' : 'none';
        if (message) {
            this.elements.errorText.textContent = message;
        }
    },
};

// ============================================================================
// Initialize the application when DOM is ready
// ============================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => APP.init());
} else {
    APP.init();
}
