// TMDB API Configuration
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_IMAGE_ORIGINAL = 'https://image.tmdb.org/t/p/original';

// Get API Key from user account (우선) or localStorage (fallback)
function getTmdbApiKey() {
    // 1순위: 로그인된 사용자 계정의 API 키
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.tmdb_api_key) {
        return currentUser.tmdb_api_key;
    }
    // 2순위: LocalStorage 직접 저장값 (이전 호환성)
    return localStorage.getItem('tmdb_api_key') || '';
}

// Save API Key to user account and localStorage
async function saveTmdbApiKey(apiKey) {
    // LocalStorage에도 저장 (이전 호환성)
    localStorage.setItem('tmdb_api_key', apiKey);
    
    // 로그인된 사용자가 있으면 계정에도 저장
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.id) {
        try {
            await fetch(`tables/users/${currentUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tmdb_api_key: apiKey })
            });
            
            // 세션 업데이트
            currentUser.tmdb_api_key = apiKey;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('✅ TMDB API 키 저장 완료 (사용자 계정)');
        } catch (error) {
            console.error('❌ API 키 저장 실패:', error);
        }
    }
}

// Check if API key is set
function hasApiKey() {
    return getTmdbApiKey().length > 0;
}

// Open API Setup Modal
function openApiSetup() {
    document.getElementById('tmdbApiKey').value = getTmdbApiKey();
    document.getElementById('youtubeApiKey').value = getYoutubeApiKey();
    document.getElementById('apiModal').classList.remove('hidden');
}

// Close API Setup Modal
function closeApiSetup() {
    document.getElementById('apiModal').classList.add('hidden');
}

// Save API Key
function saveApiKey() {
    const tmdbKey = document.getElementById('tmdbApiKey').value.trim();
    const youtubeKey = document.getElementById('youtubeApiKey').value.trim();
    
    if (tmdbKey) {
        saveTmdbApiKey(tmdbKey);
        document.getElementById('apiSetupBanner').classList.add('hidden');
    }
    
    if (youtubeKey) {
        saveYoutubeApiKey(youtubeKey);
    }
    
    if (tmdbKey || youtubeKey) {
        showToast('저장 완료', 'API 키가 저장되었습니다!', 'success');
        closeApiSetup();
    } else {
        showToast('입력 필요', '최소 하나의 API 키를 입력해주세요.', 'error');
    }
}

// YouTube API Key management
function getYoutubeApiKey() {
    // 1순위: 로그인된 사용자 계정의 API 키
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.youtube_api_key) {
        return currentUser.youtube_api_key;
    }
    // 2순위: LocalStorage 직접 저장값 (이전 호환성)
    return localStorage.getItem('youtube_api_key') || '';
}

async function saveYoutubeApiKey(apiKey) {
    // LocalStorage에도 저장 (이전 호환성)
    localStorage.setItem('youtube_api_key', apiKey);
    
    // 로그인된 사용자가 있으면 계정에도 저장
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (currentUser && currentUser.id) {
        try {
            await fetch(`tables/users/${currentUser.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ youtube_api_key: apiKey })
            });
            
            // 세션 업데이트
            currentUser.youtube_api_key = apiKey;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('✅ YouTube API 키 저장 완료 (사용자 계정)');
        } catch (error) {
            console.error('❌ API 키 저장 실패:', error);
        }
    }
}

function hasYoutubeApiKey() {
    return getYoutubeApiKey().length > 0;
}

// Initialize API Banner
function initApiSetup() {
    if (hasApiKey()) {
        document.getElementById('apiSetupBanner').classList.add('hidden');
    }
}

// Search TMDB for movies
async function searchTMDB() {
    const query = document.getElementById('apiSearchInput').value.trim();
    const apiKey = getTmdbApiKey();
    
    if (!apiKey) {
        alert('먼저 TMDB API 키를 설정해주세요.');
        openApiSetup();
        return;
    }
    
    if (!query) {
        alert('검색어를 입력해주세요.');
        return;
    }
    
    const resultsContainer = document.getElementById('apiSearchResults');
    resultsContainer.innerHTML = '<p class="text-gray-500 text-sm">검색 중...</p>';
    
    try {
        const endpoint = currentTab === 'movies' ? 'movie' : 'tv';
        const url = `${TMDB_BASE_URL}/search/${endpoint}?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=ko-KR`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            resultsContainer.innerHTML = data.results.slice(0, 5).map(item => {
                const title = item.title || item.name;
                const releaseDate = item.release_date || item.first_air_date || '미정';
                const posterPath = item.poster_path ? TMDB_IMAGE_BASE + item.poster_path : '';
                const rating = item.vote_average ? item.vote_average.toFixed(1) : 'N/A';
                
                return `
                    <div class="search-result-item flex gap-3 p-3 rounded-lg border border-gray-200 mb-2" 
                         onclick='selectTMDBItem(${JSON.stringify(item)})'>
                        ${posterPath ? `<img src="${posterPath}" class="w-16 h-24 object-cover rounded" alt="${title}">` : 
                          '<div class="w-16 h-24 bg-gray-200 rounded flex items-center justify-center"><i class="fas fa-image text-gray-400"></i></div>'}
                        <div class="flex-1">
                            <h5 class="font-semibold text-sm">${title}</h5>
                            <p class="text-xs text-gray-600">${releaseDate} • ⭐ ${rating}</p>
                            <p class="text-xs text-gray-500 mt-1 line-clamp-2">${item.overview || '줄거리 없음'}</p>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            resultsContainer.innerHTML = '<p class="text-gray-500 text-sm">검색 결과가 없습니다.</p>';
        }
    } catch (error) {
        console.error('TMDB search error:', error);
        resultsContainer.innerHTML = '<p class="text-red-500 text-sm">검색 중 오류가 발생했습니다.</p>';
    }
}

// Select TMDB item and fetch full details
async function selectTMDBItem(item) {
    const apiKey = getTmdbApiKey();
    const itemId = item.id;
    const endpoint = currentTab === 'movies' ? 'movie' : 'tv';
    
    try {
        // Fetch detailed information
        const detailUrl = `${TMDB_BASE_URL}/${endpoint}/${itemId}?api_key=${apiKey}&language=ko-KR&append_to_response=credits`;
        const response = await fetch(detailUrl);
        const details = await response.json();
        
        // Fill form with TMDB data
        fillFormWithTMDBData(details);
        
        // Clear search results
        document.getElementById('apiSearchResults').innerHTML = '';
        document.getElementById('apiSearchInput').value = '';
    } catch (error) {
        console.error('Error fetching TMDB details:', error);
        alert('상세 정보를 가져오는 중 오류가 발생했습니다.');
    }
}

// Fill form with TMDB data
function fillFormWithTMDBData(data) {
    // Basic info
    document.getElementById('title').value = data.title || data.name || '';
    document.getElementById('tmdbId').value = data.id || '';
    
    // Release date
    const releaseDate = data.release_date || data.first_air_date || '';
    if (releaseDate) {
        document.getElementById('releaseDate').value = releaseDate;
    }
    
    // Poster
    if (data.poster_path) {
        const posterUrl = TMDB_IMAGE_ORIGINAL + data.poster_path;
        document.getElementById('posterUrl').value = posterUrl;
        const posterPreview = document.getElementById('posterPreview');
        posterPreview.src = posterUrl;
        posterPreview.classList.remove('hidden');
        document.getElementById('posterPlaceholder').classList.add('hidden');
    }
    
    // Rating
    if (data.vote_average) {
        if (currentTab === 'movies') {
            document.getElementById('rating').value = data.vote_average.toFixed(1);
        } else {
            document.getElementById('reactionScore').value = data.vote_average.toFixed(1);
        }
    }
    
    // Runtime / Episode count
    if (currentTab === 'movies' && data.runtime) {
        document.getElementById('runtime').value = data.runtime;
    } else if (currentTab === 'dramas' && data.number_of_episodes) {
        document.getElementById('episodeCount').value = data.number_of_episodes;
    }
    
    // Genres
    if (data.genres && data.genres.length > 0) {
        document.getElementById('genre').value = data.genres.map(g => g.name).join(', ');
    }
    
    // Director
    if (data.credits && data.credits.crew) {
        const director = data.credits.crew.find(person => 
            person.job === 'Director' || person.department === 'Directing'
        );
        if (director) {
            document.getElementById('director').value = director.name;
        }
    }
    
    // Actors
    if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
        const topActors = data.credits.cast.slice(0, 5).map(actor => actor.name);
        document.getElementById('actors').value = topActors.join(', ');
    }
    
    // Plot
    if (data.overview) {
        document.getElementById('plot').value = data.overview;
    }
    
    alert('정보를 자동으로 채웠습니다! 추가 정보를 입력해주세요.');
}

// Update poster preview when URL changes
function setupPosterPreview() {
    const posterUrlInput = document.getElementById('posterUrl');
    posterUrlInput.addEventListener('input', function() {
        const url = this.value.trim();
        const posterPreview = document.getElementById('posterPreview');
        const posterPlaceholder = document.getElementById('posterPlaceholder');
        
        if (url) {
            posterPreview.src = url;
            posterPreview.classList.remove('hidden');
            posterPlaceholder.classList.add('hidden');
        } else {
            posterPreview.classList.add('hidden');
            posterPlaceholder.classList.remove('hidden');
        }
    });
}

// Initialize API setup on page load
document.addEventListener('DOMContentLoaded', function() {
    initApiSetup();
    setupPosterPreview();
});

// Export functions to window
window.getTmdbApiKey = getTmdbApiKey;
window.saveTmdbApiKey = saveTmdbApiKey;
window.setTmdbApiKey = saveTmdbApiKey; // alias
window.hasApiKey = hasApiKey;
window.openApiSetup = openApiSetup;
window.closeApiSetup = closeApiSetup;
window.saveApiKey = saveApiKey;
window.getYoutubeApiKey = getYoutubeApiKey;
window.saveYoutubeApiKey = saveYoutubeApiKey;
window.setYoutubeApiKey = saveYoutubeApiKey; // alias
window.hasYoutubeApiKey = hasYoutubeApiKey;
window.searchTMDB = searchTMDB;
window.selectTMDBItem = selectTMDBItem;
window.updateApiSetupBanner = initApiSetup; // alias
