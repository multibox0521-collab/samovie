// Bulk Import Functionality

let isImporting = false;

// Show Toast Notification
function showToast(title, message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Change color based on type
    if (type === 'success') {
        toast.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3';
    } else if (type === 'error') {
        toast.className = 'fixed top-4 right-4 z-50 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3';
    }
    
    toast.classList.remove('hidden');
    
    // Auto hide after 3 seconds
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// Toggle Advanced Filters
function toggleAdvancedFilters() {
    const filters = document.getElementById('advancedFilters');
    const icon = document.getElementById('advancedFilterIcon');
    
    if (filters.classList.contains('hidden')) {
        filters.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        filters.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
}

// Reset Advanced Filters
function resetAdvancedFilters() {
    document.getElementById('minRating').value = 7.0;
    document.getElementById('minRatingValue').textContent = '7.0';
    document.getElementById('yearFrom').value = '';
    document.getElementById('yearTo').value = '';
    document.getElementById('actorDirector').value = '';
    document.querySelectorAll('.genre-filter').forEach(cb => cb.checked = false);
}

// Apply Advanced Filters (클라이언트 사이드 필터링)
function applyAdvancedFilters(items, filters) {
    let filtered = items;
    
    // 평점 필터
    if (filters.minRating) {
        filtered = filtered.filter(item => 
            (item.vote_average || 0) >= filters.minRating
        );
        console.log(`✅ 평점 ${filters.minRating}+ 필터: ${filtered.length}개`);
    }
    
    // 연도 필터
    if (filters.yearFrom || filters.yearTo) {
        filtered = filtered.filter(item => {
            const releaseYear = item.release_date ? new Date(item.release_date).getFullYear() : 
                               (item.first_air_date ? new Date(item.first_air_date).getFullYear() : null);
            
            if (!releaseYear) return false;
            
            const afterFrom = !filters.yearFrom || releaseYear >= parseInt(filters.yearFrom);
            const beforeTo = !filters.yearTo || releaseYear <= parseInt(filters.yearTo);
            
            return afterFrom && beforeTo;
        });
        console.log(`✅ 연도 필터 (${filters.yearFrom}-${filters.yearTo}): ${filtered.length}개`);
    }
    
    // 장르 필터
    if (filters.genres && filters.genres.length > 0) {
        filtered = filtered.filter(item => {
            const itemGenres = item.genre_ids || [];
            return filters.genres.some(genreId => 
                itemGenres.includes(parseInt(genreId))
            );
        });
        console.log(`✅ 장르 필터: ${filtered.length}개`);
    }
    
    return filtered;
}

// Open Bulk Import Modal
function openBulkImport() {
    const apiKey = getTmdbApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'TMDB API 키를 먼저 설정해주세요.', 'error');
        setTimeout(() => openApiSetup(), 500);
        return;
    }
    
    // Reset progress
    document.getElementById('bulkImportProgress').classList.add('hidden');
    document.getElementById('bulkImportProgressBar').style.width = '0%';
    document.getElementById('bulkImportPercentage').textContent = '0%';
    document.getElementById('bulkImportStatus').textContent = '진행 중...';
    
    // Reset advanced filters
    resetAdvancedFilters();
    document.getElementById('advancedFilters').classList.add('hidden');
    document.getElementById('advancedFilterIcon').classList.remove('rotate-180');
    
    document.getElementById('bulkImportModal').classList.remove('hidden');
}

// Close Bulk Import Modal
function closeBulkImport() {
    if (isImporting) {
        if (!confirm('진행 중입니다. 정말 취소하시겠습니까?')) {
            return;
        }
    }
    document.getElementById('bulkImportModal').classList.add('hidden');
    isImporting = false;
}

// Start Bulk Import
async function startBulkImport() {
    if (isImporting) return;
    
    const category = document.getElementById('bulkImportCategory').value;
    const count = parseInt(document.getElementById('bulkImportCount').value);
    const apiKey = getTmdbApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'TMDB API 키가 필요합니다.', 'error');
        return;
    }
    
    // 고급 필터 값 가져오기
    const advancedFilters = {
        minRating: parseFloat(document.getElementById('minRating').value),
        yearFrom: document.getElementById('yearFrom').value,
        yearTo: document.getElementById('yearTo').value,
        actorDirector: document.getElementById('actorDirector').value.trim(),
        genres: Array.from(document.querySelectorAll('.genre-filter:checked')).map(cb => cb.value)
    };
    
    console.log('🔍 고급 필터:', advancedFilters);
    
    isImporting = true;
    document.getElementById('bulkImportProgress').classList.remove('hidden');
    document.getElementById('bulkImportStartBtn').disabled = true;
    document.getElementById('bulkImportStartBtn').classList.add('opacity-50', 'cursor-not-allowed');
    
    try {
        let items = [];
        
        // Fetch items based on category
        switch(category) {
            case 'korean':
                items = await fetchKoreanMovies(apiKey, count, 'popular', advancedFilters);
                break;
            case 'korean_classic':
                items = await fetchKoreanMovies(apiKey, count, 'top_rated', advancedFilters);
                break;
            case 'korean_recent':
                items = await fetchKoreanMovies(apiKey, count, 'recent', advancedFilters);
                break;
            case 'korean_2000_2020':
                items = await fetchKoreanMovies(apiKey, count, '2000_2020', advancedFilters);
                break;
            case 'korean_before_2000':
                items = await fetchKoreanMovies(apiKey, count, 'before_2000', advancedFilters);
                break;
            case 'tv_korean':
                items = await fetchKoreanTV(apiKey, count, 'popular', advancedFilters);
                break;
            case 'tv_korean_classic':
                items = await fetchKoreanTV(apiKey, count, 'top_rated', advancedFilters);
                break;
            case 'tv_korean_recent':
                items = await fetchKoreanTV(apiKey, count, 'recent', advancedFilters);
                break;
            case 'tv_korean_2000_2020':
                items = await fetchKoreanTV(apiKey, count, '2000_2020', advancedFilters);
                break;
            case 'tv_korean_before_2000':
                items = await fetchKoreanTV(apiKey, count, 'before_2000', advancedFilters);
                break;
            case 'popular':
                items = await fetchPopularMovies(apiKey, count, advancedFilters);
                break;
            case 'top_rated':
                items = await fetchTopRatedMovies(apiKey, count, advancedFilters);
                break;
            case 'tv_popular':
                items = await fetchPopularTV(apiKey, count, 'popular', advancedFilters);
                break;
        }
        
        // 고급 필터 적용 (클라이언트 사이드)
        items = applyAdvancedFilters(items, advancedFilters);
        
        if (items.length === 0) {
            showToast('데이터 없음', '필터 조건에 맞는 작품이 없습니다.', 'error');
            isImporting = false;
            document.getElementById('bulkImportStartBtn').disabled = false;
            document.getElementById('bulkImportStartBtn').classList.remove('opacity-50', 'cursor-not-allowed');
            return;
        }
        
        // Import items one by one
        const isTV = category.includes('tv');
        await importItems(items, isTV);
        
        // Mark as complete before closing modal
        isImporting = false;
        document.getElementById('bulkImportStartBtn').disabled = false;
        document.getElementById('bulkImportStartBtn').classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Close modal first
        closeBulkImport();
        
        // Reload data
        console.log('🔄 데이터 다시 로드 중...', isTV ? 'dramas' : 'movies');
        if (isTV) {
            await window.loadDramas();
            console.log(`✅ ${window.allDramas.length}개 드라마 로드 완료`);
            window.switchTab('recommend'); // 추천 탭으로 이동
            window.switchContentTab('dramas'); // 드라마 콘텐츠로 전환
        } else {
            await window.loadMovies();
            console.log(`✅ ${window.allMovies.length}개 영화 로드 완료`);
            window.switchTab('recommend'); // 추천 탭으로 이동
            window.switchContentTab('movies'); // 영화 콘텐츠로 전환
        }
        console.log('✅ 데이터 로드 및 탭 전환 완료');
        
        // Show success toast
        showToast('완료!', `${items.length}개의 작품을 가져왔습니다!`, 'success');
        
    } catch (error) {
        console.error('Bulk import error:', error);
        showToast('오류 발생', '가져오기 중 오류가 발생했습니다.', 'error');
        isImporting = false;
        document.getElementById('bulkImportStartBtn').disabled = false;
        document.getElementById('bulkImportStartBtn').classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Fetch Popular Movies
async function fetchPopularMovies(apiKey, count) {
    const items = [];
    const pages = Math.ceil(count / 20);
    
    for (let page = 1; page <= pages && items.length < count; page++) {
        const url = `${TMDB_BASE_URL}/movie/popular?api_key=${apiKey}&language=ko-KR&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results) {
            items.push(...data.results.slice(0, count - items.length));
        }
    }
    
    return items.slice(0, count);
}

// Fetch Top Rated Movies
async function fetchTopRatedMovies(apiKey, count) {
    const items = [];
    const pages = Math.ceil(count / 20);
    
    for (let page = 1; page <= pages && items.length < count; page++) {
        const url = `${TMDB_BASE_URL}/movie/top_rated?api_key=${apiKey}&language=ko-KR&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results) {
            items.push(...data.results.slice(0, count - items.length));
        }
    }
    
    return items.slice(0, count);
}

// Fetch Korean Movies
async function fetchKoreanMovies(apiKey, count, sortBy = 'popular') {
    const items = [];
    const pages = Math.ceil(count / 20);
    
    let sortParam, additionalParams;
    
    if (sortBy === 'recent') {
        // 최신작: 2020년 이후, 인기순
        sortParam = 'popularity.desc';
        additionalParams = '&primary_release_date.gte=2020-01-01&vote_count.gte=50';
    } else if (sortBy === '2000_2020') {
        // 2000~2020년
        sortParam = 'popularity.desc';
        additionalParams = '&primary_release_date.gte=2000-01-01&primary_release_date.lte=2020-12-31&vote_count.gte=30';
    } else if (sortBy === 'before_2000') {
        // 2000년 이전
        sortParam = 'vote_average.desc';
        additionalParams = '&primary_release_date.lte=1999-12-31&vote_count.gte=20';
    } else if (sortBy === 'top_rated') {
        // 고평점: 평점순
        sortParam = 'vote_average.desc';
        additionalParams = '&vote_count.gte=100';
    } else {
        // 인기순
        sortParam = 'popularity.desc';
        additionalParams = '&vote_count.gte=100';
    }
    
    for (let page = 1; page <= pages && items.length < count; page++) {
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&language=ko-KR&with_original_language=ko&sort_by=${sortParam}${additionalParams}&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results) {
            items.push(...data.results.slice(0, count - items.length));
        }
    }
    
    return items.slice(0, count);
}

// Fetch Popular TV Shows
async function fetchPopularTV(apiKey, count, sortBy = 'popular') {
    const items = [];
    const pages = Math.ceil(count / 20);
    
    for (let page = 1; page <= pages && items.length < count; page++) {
        const url = `${TMDB_BASE_URL}/tv/popular?api_key=${apiKey}&language=ko-KR&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results) {
            items.push(...data.results.slice(0, count - items.length));
        }
    }
    
    return items.slice(0, count);
}

// Fetch Korean TV Shows
async function fetchKoreanTV(apiKey, count, sortBy = 'popular') {
    const items = [];
    const pages = Math.ceil(count / 20);
    
    let sortParam, additionalParams;
    
    if (sortBy === 'recent') {
        // 최신작: 2020년 이후, 인기순
        sortParam = 'popularity.desc';
        additionalParams = '&first_air_date.gte=2020-01-01&vote_count.gte=30';
    } else if (sortBy === '2000_2020') {
        // 2000~2020년
        sortParam = 'popularity.desc';
        additionalParams = '&first_air_date.gte=2000-01-01&first_air_date.lte=2020-12-31&vote_count.gte=20';
    } else if (sortBy === 'before_2000') {
        // 2000년 이전
        sortParam = 'vote_average.desc';
        additionalParams = '&first_air_date.lte=1999-12-31&vote_count.gte=10';
    } else if (sortBy === 'top_rated') {
        // 고평점: 평점순
        sortParam = 'vote_average.desc';
        additionalParams = '&vote_count.gte=50';
    } else {
        // 인기순
        sortParam = 'popularity.desc';
        additionalParams = '&vote_count.gte=30';
    }
    
    for (let page = 1; page <= pages && items.length < count; page++) {
        const url = `${TMDB_BASE_URL}/discover/tv?api_key=${apiKey}&language=ko-KR&with_original_language=ko&sort_by=${sortParam}${additionalParams}&page=${page}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results) {
            items.push(...data.results.slice(0, count - items.length));
        }
    }
    
    return items.slice(0, count);
}

// Import Items
async function importItems(items, isTV) {
    const total = items.length;
    let completed = 0;
    let success = 0;
    let failed = 0;
    
    for (const item of items) {
        try {
            updateProgress(completed, total, `처리 중: ${item.title || item.name}`);
            
            // Fetch detailed information
            const endpoint = isTV ? 'tv' : 'movie';
            const detailUrl = `${TMDB_BASE_URL}/${endpoint}/${item.id}?api_key=${getTmdbApiKey()}&language=ko-KR&append_to_response=credits`;
            const response = await fetch(detailUrl);
            const details = await response.json();
            
            // Check if already exists by TMDB ID
            const table = isTV ? 'dramas' : 'movies';
            const tmdbId = details.id ? details.id.toString() : null;
            
            if (tmdbId) {
                const checkUrl = `tables/${table}?limit=1000`;
                const checkResponse = await fetch(checkUrl);
                const checkData = await checkResponse.json();
                
                // Check if this TMDB ID already exists
                const exists = checkData.data && checkData.data.find(item => item.tmdb_id === tmdbId);
                
                if (exists) {
                    console.log(`Skipped: ${details.title || details.name} (already exists, TMDB ID: ${tmdbId})`);
                    completed++;
                    continue;
                }
            }
            
            // Prepare data
            const data = prepareItemData(details, isTV);
            
            // Save to database
            const saveResponse = await fetch(`tables/${table}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
            
            if (saveResponse.ok) {
                const savedData = await saveResponse.json();
                console.log(`✅ Saved: ${data.title}`, savedData);
                success++;
            } else {
                const errorText = await saveResponse.text();
                console.error(`❌ Failed to save: ${data.title}`, errorText);
                failed++;
            }
            
        } catch (error) {
            console.error(`Error importing ${item.title || item.name}:`, error);
            failed++;
        }
        
        completed++;
        updateProgress(completed, total, `완료: ${success}개 | 실패: ${failed}개`);
        
        // Small delay to avoid rate limiting
        await delay(200);
    }
    
    updateProgress(total, total, `완료! 성공: ${success}개 | 실패: ${failed}개`);
}

// Prepare Item Data
function prepareItemData(details, isTV) {
    const data = {
        title: details.title || details.name || '',
        title_en: details.original_title || details.original_name || null,
        tmdb_id: details.id ? details.id.toString() : null,
        release_date: details.release_date || details.first_air_date ? 
            new Date(details.release_date || details.first_air_date).getTime() : null,
        poster_url: details.poster_path ? TMDB_IMAGE_ORIGINAL + details.poster_path : null,
        genre: details.genres ? details.genres.map(g => g.name).join(', ') : null,
        plot: details.overview || null,
        production_companies: details.production_companies && details.production_companies.length > 0 ? 
            details.production_companies.map(c => c.name).join(', ') : null,
        director: null,
        actors: null,
        shorts_channel_count: 0,
        shorts_first_upload: null,
        copyright_warning: false,
        is_verified_safe: false,
        notes: null
    };
    
    // Director
    if (details.credits && details.credits.crew) {
        const director = details.credits.crew.find(person => 
            person.job === 'Director' || person.department === 'Directing'
        );
        if (director) {
            data.director = director.name;
        }
    }
    
    // Actors
    if (details.credits && details.credits.cast && details.credits.cast.length > 0) {
        const topActors = details.credits.cast.slice(0, 5).map(actor => actor.name);
        data.actors = topActors.join(', ');
    }
    
    if (isTV) {
        // Drama specific
        data.reaction_score = details.vote_average ? parseFloat(details.vote_average.toFixed(1)) : 0;
        data.episode_count = details.number_of_episodes || 0;
    } else {
        // Movie specific
        data.rating = details.vote_average ? parseFloat(details.vote_average.toFixed(1)) : 0;
        data.runtime = details.runtime || 0;
        data.audience_count = 0; // TMDB doesn't provide Korean audience count
    }
    
    return data;
}

// Update Progress
function updateProgress(current, total, status) {
    const percentage = Math.round((current / total) * 100);
    document.getElementById('bulkImportProgressBar').style.width = `${percentage}%`;
    document.getElementById('bulkImportPercentage').textContent = `${percentage}%`;
    document.getElementById('bulkImportStatus').textContent = status;
    document.getElementById('bulkImportDetails').textContent = `${current} / ${total} 완료`;
}

// Delay helper
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Export to window
window.showToast = showToast;
window.openBulkImport = openBulkImport;
window.closeBulkImport = closeBulkImport;
window.startBulkImport = startBulkImport;
