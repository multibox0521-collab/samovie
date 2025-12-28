/**
 * 고급 검색 기능
 * - 연도, 평점, 쇼츠 적합도, 안전도 등 다양한 조건으로 검색
 * - 넷플릭스/왓챠 스타일의 직관적인 UI
 */

// 고급 검색 모달 열기
function openAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    if (modal) {
        modal.classList.remove('hidden');
        // 검색 결과 카운트 업데이트
        updateSearchCount();
    }
}

// 고급 검색 모달 닫기
function closeAdvancedSearch() {
    const modal = document.getElementById('advancedSearchModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

// 연도 범위 설정
function setYearRange(start, end) {
    const startInput = document.getElementById('advSearchYearStart');
    const endInput = document.getElementById('advSearchYearEnd');
    
    startInput.value = start || '';
    endInput.value = end || '';
    
    updateSearchCount();
}

// 평점 범위 설정
function setRatingRange(min, max) {
    const minInput = document.getElementById('advSearchRatingMin');
    const maxInput = document.getElementById('advSearchRatingMax');
    
    minInput.value = min || '';
    maxInput.value = max || '';
    
    updateSearchCount();
}

// 쇼츠 점수 설정
function setShortsScore(score) {
    const input = document.getElementById('advSearchShortsScore');
    const display = document.getElementById('shortsScoreValue');
    
    input.value = score;
    display.textContent = score;
    
    updateSearchCount();
}

// 안전도 점수 설정
function setSafetyScore(score) {
    const input = document.getElementById('advSearchSafetyScore');
    const display = document.getElementById('safetyScoreValue');
    
    input.value = score;
    display.textContent = score;
    
    updateSearchCount();
}

// 고급 검색 초기화
function resetAdvancedSearch() {
    document.getElementById('advSearchQuery').value = '';
    document.getElementById('advSearchYearStart').value = '';
    document.getElementById('advSearchYearEnd').value = '';
    document.getElementById('advSearchRatingMin').value = '';
    document.getElementById('advSearchRatingMax').value = '';
    document.getElementById('advSearchShortsScore').value = 0;
    document.getElementById('advSearchSafetyScore').value = 0;
    document.getElementById('advSearchMovies').checked = true;
    document.getElementById('advSearchDramas').checked = true;
    
    document.getElementById('shortsScoreValue').textContent = '0';
    document.getElementById('safetyScoreValue').textContent = '0';
    
    updateSearchCount();
}

// 검색 결과 개수 업데이트 (실시간)
function updateSearchCount() {
    const results = performAdvancedSearch(false);
    const countDisplay = document.getElementById('searchResultCount');
    if (countDisplay) {
        countDisplay.textContent = results.length;
    }
}

// 고급 검색 실행 (내부 로직)
function performAdvancedSearch(returnResults = true) {
    // 검색 조건 수집
    const query = document.getElementById('advSearchQuery')?.value.toLowerCase().trim() || '';
    const yearStart = parseInt(document.getElementById('advSearchYearStart')?.value) || null;
    const yearEnd = parseInt(document.getElementById('advSearchYearEnd')?.value) || null;
    const ratingMin = parseFloat(document.getElementById('advSearchRatingMin')?.value) || 0;
    const ratingMax = parseFloat(document.getElementById('advSearchRatingMax')?.value) || 10;
    const shortsScoreMin = parseInt(document.getElementById('advSearchShortsScore')?.value) || 0;
    const safetyScoreMin = parseFloat(document.getElementById('advSearchSafetyScore')?.value) || 0;
    const includeMovies = document.getElementById('advSearchMovies')?.checked !== false;
    const includeDramas = document.getElementById('advSearchDramas')?.checked !== false;
    
    // 데이터 수집
    let allContent = [];
    if (includeMovies && window.allMovies) {
        allContent.push(...allMovies.map(m => ({...m, type: 'movies'})));
    }
    if (includeDramas && window.allDramas) {
        allContent.push(...allDramas.map(d => ({...d, type: 'dramas'})));
    }
    
    // 필터링
    const filtered = allContent.filter(item => {
        // 1. 텍스트 검색 (제목, 배우, 감독, 제작사)
        if (query) {
            const searchableText = [
                item.title,
                item.title_en,
                item.actors,
                item.director,
                item.production_companies
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (!searchableText.includes(query)) {
                return false;
            }
        }
        
        // 2. 연도 범위
        if (item.release_date) {
            const releaseYear = new Date(item.release_date).getFullYear();
            if (yearStart && releaseYear < yearStart) return false;
            if (yearEnd && releaseYear > yearEnd) return false;
        }
        
        // 3. 평점 범위
        const rating = item.rating || item.reaction_score || 0;
        if (rating < ratingMin || rating > ratingMax) return false;
        
        // 4. 쇼츠 점수
        if (shortsScoreMin > 0) {
            const shortsScore = calculateShortsScore ? calculateShortsScore(item) : 0;
            if (shortsScore < shortsScoreMin) return false;
        }
        
        // 5. 안전도 점수
        if (safetyScoreMin > 0) {
            const safetyScore = item.safety_rating_average || 0;
            if (safetyScore < safetyScoreMin) return false;
        }
        
        return true;
    });
    
    // 정렬: 쇼츠 점수 > 평점 순
    filtered.sort((a, b) => {
        const shortsA = calculateShortsScore ? calculateShortsScore(a) : 0;
        const shortsB = calculateShortsScore ? calculateShortsScore(b) : 0;
        
        if (shortsA !== shortsB) {
            return shortsB - shortsA;
        }
        
        const ratingA = a.rating || a.reaction_score || 0;
        const ratingB = b.rating || b.reaction_score || 0;
        return ratingB - ratingA;
    });
    
    return filtered;
}

// 고급 검색 실행 및 결과 표시
function executeAdvancedSearch() {
    const results = performAdvancedSearch(true);
    
    if (results.length === 0) {
        showToast('검색 결과 없음', '조건에 맞는 작품이 없습니다.', 'warning');
        return;
    }
    
    // 쇼츠 제작 탭으로 이동
    switchTab('shorts');
    
    // 결과 표시
    const title = `🔍 고급 검색 결과 (${results.length}개)`;
    displayShortsRecommendations(title, results);
    
    // 모달 닫기
    closeAdvancedSearch();
    
    showToast('검색 완료!', `${results.length}개의 작품을 찾았습니다.`, 'success');
}

// 입력 필드 변경 감지하여 실시간 카운트 업데이트
document.addEventListener('DOMContentLoaded', function() {
    const searchInputs = [
        'advSearchQuery',
        'advSearchYearStart',
        'advSearchYearEnd',
        'advSearchRatingMin',
        'advSearchRatingMax',
        'advSearchShortsScore',
        'advSearchSafetyScore',
        'advSearchMovies',
        'advSearchDramas'
    ];
    
    searchInputs.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateSearchCount);
            element.addEventListener('change', updateSearchCount);
        }
    });
});

console.log('✅ advanced-search.js 로드 완료');
