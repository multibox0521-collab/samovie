// Global State
let currentTab = 'home';
let allMovies = [];
let allDramas = [];
let currentEditId = null;

// Initialize App
// ⚠️ 중요: DOMContentLoaded는 index.html에서 처리됨!
// 이 함수는 initApp()으로 이름을 변경하여 index.html에서 명시적으로 호출
async function initApp() {
    console.log('🎬 앱 초기화 시작');
    
    setupEventListeners();
    
    // 영화와 드라마 데이터 먼저 로드
    await Promise.all([loadMovies(), loadDramas()]);
    
    // 데이터 로드 완료 후 홈 탭 열기
    switchTab('home');
    
    console.log('✅ 앱 초기화 완료');
}

// Setup Event Listeners
function setupEventListeners() {
    document.getElementById('contentForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchContent();
        }
    });
    document.getElementById('filterVerified').addEventListener('change', applyFilters);
    document.getElementById('filterSafe').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    
    // API search enter key
    document.getElementById('apiSearchInput').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchTMDB();
        }
    });
}

// Tab Switching
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab styles
    document.getElementById('tabHome').classList.remove('tab-active');
    document.getElementById('tabRecommend').classList.remove('tab-active');
    document.getElementById('tabShorts').classList.remove('tab-active');
    document.getElementById('tabMyList').classList.remove('tab-active');
    document.getElementById('tabAdmin').classList.remove('tab-active');
    
    // Hide all views
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('recommendView').classList.add('hidden');
    document.getElementById('shortsView').classList.add('hidden');
    const myListView = document.getElementById('myListView');
    if (myListView) myListView.classList.add('hidden');
    const adminView = document.getElementById('adminView');
    if (adminView) adminView.classList.add('hidden');
    
    // Hide/show content header
    const contentHeader = document.getElementById('contentHeader');
    
    if (tab === 'home') {
        document.getElementById('tabHome').classList.add('tab-active');
        document.getElementById('homeView').classList.remove('hidden');
        contentHeader.classList.add('hidden');
        initHomeTab(); // 홈 탭 초기화
    } else if (tab === 'recommend') {
        document.getElementById('tabRecommend').classList.add('tab-active');
        document.getElementById('recommendView').classList.remove('hidden');
        contentHeader.classList.add('hidden');
        loadRecommendView();
    } else if (tab === 'shorts') {
        document.getElementById('tabShorts').classList.add('tab-active');
        document.getElementById('shortsView').classList.remove('hidden');
        contentHeader.classList.add('hidden');
        loadShortsView();
    } else if (tab === 'movies') {
        // 영화 탭 (직접 탭 전환)
        document.getElementById('tabMyList').classList.add('tab-active');
        if (myListView) myListView.classList.remove('hidden');
        contentHeader.classList.remove('hidden');
        document.getElementById('contentTitle').textContent = '영화';
        console.log(`🎬 영화 탭으로 전환: ${allMovies.length}개 영화`);
        switchContentTab('movies');
        renderMovies(allMovies);
    } else if (tab === 'dramas') {
        // 드라마 탭 (직접 탭 전환)
        document.getElementById('tabMyList').classList.add('tab-active');
        if (myListView) myListView.classList.remove('hidden');
        contentHeader.classList.remove('hidden');
        document.getElementById('contentTitle').textContent = '드라마';
        console.log(`📺 드라마 탭으로 전환: ${allDramas.length}개 드라마`);
        switchContentTab('dramas');
        renderDramas(allDramas);
    } else if (tab === 'mylist') {
        // 내 목록: 영화와 드라마 모두 표시
        document.getElementById('tabMyList').classList.add('tab-active');
        if (myListView) myListView.classList.remove('hidden');
        contentHeader.classList.remove('hidden');
        document.getElementById('contentTitle').textContent = '내 목록';
        // 영화와 드라마 로드
        loadMovies();
        loadDramas();
        // 기본적으로 영화 탭 표시
        switchContentTab('movies');
    } else if (tab === 'admin') {
        // 관리자 권한 체크
        if (typeof checkAdminAccess === 'function' && !checkAdminAccess()) {
            // 권한 없으면 홈으로
            switchTab('home');
            return;
        }
        
        // 관리자 페이지
        document.getElementById('tabAdmin').classList.add('tab-active');
        if (adminView) adminView.classList.remove('hidden');
        contentHeader.classList.add('hidden');
        // 관리자 페이지 초기화
        if (typeof initAdminPage === 'function') {
            initAdminPage();
        }
    }
}

// Load Movies
async function loadMovies() {
    try {
        console.log('📥 Loading movies...');
        const response = await fetch('tables/movies?limit=1000&sort=-created_at');
        const data = await response.json();
        console.log('📦 Movies data received:', data);
        allMovies = data.data || [];
        console.log('🎬 Total movies:', allMovies.length);
        renderMovies(allMovies);
    } catch (error) {
        console.error('❌ Error loading movies:', error);
        document.getElementById('moviesList').innerHTML = '<p class="col-span-full text-red-500 text-center py-8">데이터를 불러오는데 실패했습니다.</p>';
    }
}

// Load Dramas
async function loadDramas() {
    try {
        const response = await fetch('tables/dramas?limit=1000&sort=-created_at');
        const data = await response.json();
        allDramas = data.data || [];
        renderDramas(allDramas);
    } catch (error) {
        console.error('Error loading dramas:', error);
        document.getElementById('dramasList').innerHTML = '<p class="col-span-full text-red-500 text-center py-8">데이터를 불러오는데 실패했습니다.</p>';
    }
}

// Render Movies
function renderMovies(movies) {
    const container = document.getElementById('moviesList');
    
    if (!container) {
        console.error('❌ moviesList 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    console.log('🎨 Rendering movies:', movies.length);
    
    if (movies.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i class="fas fa-film text-6xl text-gray-600 mb-4"></i>
                <p class="text-gray-400 text-lg">등록된 영화가 없습니다.</p>
                <p class="text-gray-500 text-sm mt-2">"인기작 가져오기" 버튼으로 영화를 추가해보세요!</p>
            </div>
        `;
        return;
    }

    const sortedMovies = sortItems(movies);
    console.log('📊 첫 번째 영화:', sortedMovies[0]?.title);
    
    const html = sortedMovies.map(movie => createPosterCard(movie, 'movies')).join('');
    console.log(`✅ HTML 렌더링 완료: ${html.length} characters, ${sortedMovies.length} movies`);
    
    container.innerHTML = html;
}

// Render Dramas
function renderDramas(dramas) {
    const container = document.getElementById('dramasList');
    
    if (!container) {
        console.error('❌ dramasList 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    console.log('🎨 Rendering dramas:', dramas.length);
    
    if (dramas.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i class="fas fa-tv text-6xl text-gray-600 mb-4"></i>
                <p class="text-gray-400 text-lg">등록된 드라마가 없습니다.</p>
                <p class="text-gray-500 text-sm mt-2">"인기작 가져오기" 버튼으로 드라마를 추가해보세요!</p>
            </div>
        `;
        return;
    }

    const sortedDramas = sortItems(dramas);
    console.log('📊 첫 번째 드라마:', sortedDramas[0]?.title);
    
    const html = sortedDramas.map(drama => createPosterCard(drama, 'dramas')).join('');
    console.log(`✅ HTML 렌더링 완료: ${html.length} characters, ${sortedDramas.length} dramas`);
    
    container.innerHTML = html;
}

// Sort items based on current sort option
function sortItems(items) {
    const sortBy = document.getElementById('sortBy').value;
    
    return [...items].sort((a, b) => {
        switch(sortBy) {
            case 'date':
                return new Date(b.release_date || 0) - new Date(a.release_date || 0);
            case 'rating':
                return (b.rating || b.reaction_score || 0) - (a.rating || a.reaction_score || 0);
            case 'audience':
                return (b.audience_count || 0) - (a.audience_count || 0);
            case 'production':
                // 제작사순 정렬 (가나다순)
                const prodA = (a.production_companies || '').toLowerCase();
                const prodB = (b.production_companies || '').toLowerCase();
                return prodA.localeCompare(prodB, 'ko-KR');
            case 'added':
                return (b.created_at || 0) - (a.created_at || 0);
            default:
                return 0;
        }
    });
}

// Create Poster Card (List Style)
// 포스터 카드 생성 (깔끔한 그리드 버전)
function createPosterCard(item, type) {
    // type이 없으면 item.type 사용
    if (!type) {
        type = item.type;
    }
    
    // 그래도 type이 없으면 기본값
    if (!type) {
        console.warn('⚠️ createPosterCard: type이 없습니다. item:', item);
        type = 'movies'; // 기본값
    }
    
    const score = type === 'movies' ? (item.rating || 0) : (item.reaction_score || 0);
    
    // 디버깅: 별점 0인 작품 로깅
    if (score === 0) {
        console.warn(`⚠️ 별점 0인 작품: ${item.title}, type: ${type}, rating: ${item.rating}, reaction_score: ${item.reaction_score}`, item);
    }
    const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
    const posterUrl = item.poster_url || '';
    
    // 저작권 안전 여부
    const shortsDate = item.shorts_first_upload ? new Date(item.shorts_first_upload) : null;
    const daysSinceShorts = shortsDate ? Math.floor((Date.now() - shortsDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const monthsSinceShorts = Math.floor(daysSinceShorts / 30);
    const isSafe = monthsSinceShorts >= 6 && !item.copyright_warning;
    
    return `
        <div class="group cursor-pointer poster-card" onclick="showDetail('${type}', '${item.id}')">
            <div class="relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-yellow-400/50">
                ${posterUrl ? `
                    <img src="${posterUrl}" alt="${escapeHtml(item.title)}" 
                         class="w-full aspect-[2/3] object-cover group-hover:scale-110 transition-transform duration-500">
                ` : `
                    <div class="w-full aspect-[2/3] bg-gradient-to-br from-yellow-600 via-orange-500 to-red-600 flex items-center justify-center">
                        <i class="fas fa-${type === 'movies' ? 'film' : 'tv'} text-white text-6xl opacity-30"></i>
                    </div>
                `}
                
                <!-- 평점 배지 (우측 상단) - 골드 스타일 -->
                <div class="absolute top-3 right-3 bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 px-3 py-1.5 rounded-lg text-sm font-black flex items-center gap-1.5 shadow-xl">
                    <i class="fas fa-star"></i>
                    ${score.toFixed(1)}
                </div>
                
                <!-- 운영자 추천 배지 (최우선) -->
                ${item.admin_recommended ? `
                    <div class="absolute top-3 left-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white px-3 py-1.5 rounded-lg text-xs font-black shadow-xl animate-pulse">
                        <i class="fas fa-crown mr-1"></i>운영자 추천
                    </div>
                ` : ''}
                
                <!-- 안전 배지 (좌측 상단) -->
                ${!item.admin_recommended && isSafe ? `
                    <div class="absolute top-3 left-3 bg-gradient-to-br from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                        <i class="fas fa-shield-alt mr-1"></i>안전
                    </div>
                ` : ''}
                ${!item.admin_recommended && !isSafe && item.is_verified_safe ? `
                    <div class="absolute top-3 left-3 bg-gradient-to-br from-blue-500 to-cyan-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg">
                        <i class="fas fa-check-circle mr-1"></i>검증됨
                    </div>
                ` : ''}
                
                <!-- 호버 시 액션 버튼들 - 더 멋진 효과 -->
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                    <div class="flex gap-3" onclick="event.stopPropagation()">
                        <button onclick="searchYouTubeShorts('${escapeHtml(item.title).replace(/'/g, "\\'")}', '${type}')" 
                            class="px-4 py-3 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-xl hover:shadow-xl hover:scale-110 transition-all duration-200 text-sm font-bold"
                            title="유튜브 쇼츠 검색">
                            <i class="fab fa-youtube mr-1"></i>Shorts
                        </button>
                        <button onclick="editContent('${type}', '${item.id}')" 
                            class="px-4 py-3 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl hover:shadow-xl hover:scale-110 transition-all duration-200 text-sm font-bold"
                            title="수정">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deleteContent('${type}', '${item.id}')" 
                            class="px-4 py-3 bg-gradient-to-br from-gray-600 to-gray-700 text-white rounded-xl hover:shadow-xl hover:scale-110 transition-all duration-200 text-sm font-bold"
                            title="삭제">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            
            <!-- 제목 (포스터 하단) - 다크 모드 -->
            <div class="mt-3 px-1">
                <h4 class="font-bold text-base text-white truncate drop-shadow-lg" title="${escapeHtml(item.title)}">
                    ${escapeHtml(item.title)}
                </h4>
                <div class="flex items-center justify-between text-sm text-gray-400 mt-1.5">
                    <span class="font-semibold">${year}</span>
                    ${item.shorts_channel_count > 0 ? `<span class="px-2 py-0.5 bg-red-600/80 text-white rounded-full text-xs font-bold"><i class="fas fa-video mr-1"></i>${item.shorts_channel_count}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

/**
 * 작품 상세보기에서 운영자 추천 토글
 */
async function toggleAdminRecommendFromDetail(type, id) {
    try {
        // 현재 작품 찾기
        let item;
        if (type === 'movies') {
            item = allMovies.find(m => m.id === id);
        } else {
            item = allDramas.find(d => d.id === id);
        }
        
        if (!item) {
            showToast('오류', '작품을 찾을 수 없습니다.', 'error');
            return;
        }
        
        const newStatus = !item.admin_recommended;
        const table = type === 'movies' ? 'movies' : 'dramas';
        
        const response = await fetch(`tables/${table}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_recommended: newStatus
            })
        });
        
        if (!response.ok) {
            throw new Error('저장 실패');
        }
        
        // 로컬 데이터 업데이트
        item.admin_recommended = newStatus;
        
        showToast(
            newStatus ? '👑 운영자 추천 설정!' : '운영자 추천 해제',
            newStatus ? '이 작품은 S등급으로 표시되며, 메인 화면에 노출됩니다.' : '운영자 추천에서 해제되었습니다.',
            'success'
        );
        
        // 상세보기 새로고침
        showDetail(type, id);
        
    } catch (error) {
        console.error('운영자 추천 설정 오류:', error);
        showToast('오류', '설정 중 오류가 발생했습니다.', 'error');
    }
}

// Show Detail Modal
function showDetail(type, id) {
    console.log('🔍 showDetail 호출:', { type, id });
    console.log('📦 allMovies 개수:', allMovies.length);
    console.log('📦 allDramas 개수:', allDramas.length);
    
    let item;
    if (type === 'movies') {
        item = allMovies.find(m => m.id === id);
    } else {
        item = allDramas.find(d => d.id === id);
    }
    
    if (!item) {
        console.error('❌ 작품을 찾을 수 없음:', { type, id });
        console.log('🔍 allMovies IDs:', allMovies.map(m => m.id));
        console.log('🔍 allDramas IDs:', allDramas.map(d => d.id));
        return;
    }
    
    console.log('✅ 작품 찾음:', item.title);
    
    // item에 type 추가 (renderSafetyRating에서 필요)
    item.type = type;
    
    // 쇼츠 적합도 점수 계산
    const shortsScore = calculateShortsScore(item);
    const scoreGrade = getShortsGrade(shortsScore, item); // item 전달
    const competition = getCompetitionLevel(item.shorts_channel_count || 0);
    const safety = getCopyrightSafety(item);
    
    const releaseDate = item.release_date ? new Date(item.release_date).toLocaleDateString('ko-KR') : '미정';
    const rating = type === 'movies' ? item.rating : item.reaction_score;
    const shortsDate = item.shorts_first_upload ? new Date(item.shorts_first_upload).toLocaleDateString('ko-KR') : '-';
    const daysSinceShorts = item.shorts_first_upload ? Math.floor((Date.now() - new Date(item.shorts_first_upload).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const monthsSinceShorts = Math.floor(daysSinceShorts / 30);
    const isSafe = monthsSinceShorts >= 6 && !item.copyright_warning;
    
    const posterUrl = item.poster_url || '';
    
    // 북마크 상태 확인
    const isWatched = getWatchedItems().includes(item.id);
    const isCreated = getCreatedShorts().includes(item.id);
    
    const detailContent = `
        <div class="flex justify-between items-start mb-4">
            <h3 class="text-2xl font-bold text-gray-900">${escapeHtml(item.title)}</h3>
            <button onclick="closeDetail()" class="text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full p-2 transition">
                <i class="fas fa-times text-2xl"></i>
            </button>
        </div>
        
        <!-- 쇼츠 적합도 점수 배너 -->
        <div class="mb-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
            <div class="flex items-center justify-between">
                <div>
                    <h4 class="text-sm font-medium text-gray-700 mb-2">쇼츠 적합도 점수</h4>
                    <div class="flex items-center gap-3">
                        <span class="text-4xl font-bold ${scoreGrade.color} text-white px-4 py-2 rounded">${shortsScore}</span>
                        <div>
                            <div class="font-bold text-lg">${scoreGrade.emoji} ${scoreGrade.text}</div>
                            <div class="text-sm text-gray-600">등급: ${scoreGrade.grade}</div>
                        </div>
                    </div>
                </div>
                <div class="text-right text-sm space-y-1">
                    <div class="${safety.color} font-medium">${safety.icon} 저작권: ${safety.level}</div>
                    <div class="${competition.color} font-medium">${competition.stars} 경쟁도: ${competition.level}</div>
                </div>
            </div>
            <div class="mt-3 w-full bg-gray-200 rounded-full h-3">
                <div class="${scoreGrade.color} h-3 rounded-full transition-all" style="width: ${shortsScore}%"></div>
            </div>
        </div>
        
        <!-- AI 자동 분석 버튼 -->
        <div class="mb-4">
            <button onclick="runAutoAnalysis('${type}', '${item.id}', '${escapeHtml(item.title)}')" 
                id="autoAnalysisBtn_${item.id}"
                class="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition font-medium shadow-lg">
                <i class="fas fa-robot mr-2"></i>${item.auto_analysis ? 'AI 재분석' : 'AI 자동 분석 시작'}
                <span class="text-xs ml-2 opacity-80">(안전도 + 경쟁력)</span>
            </button>
        </div>
        
        <!-- AI 분석 결과 영역 -->
        <div id="autoAnalysisResult_${item.id}">
            ${item.auto_analysis && typeof renderAutoAnalysisResult === 'function' ? renderAutoAnalysisResult(item.auto_analysis) : ''}
            ${item.auto_analysis && item.safety_ratings && item.safety_ratings.length > 0 && typeof calculateHybridScore === 'function' ? 
                renderHybridScore(calculateHybridScore(item.auto_analysis, calculateAverageSafetyRating(item.safety_ratings))) : ''}
        </div>
        
        <!-- 안전도 평점 섹션 -->
        ${renderSafetyRating(item)}
        
        <!-- 북마크 버튼 -->
        <div class="mb-4 flex gap-2">
            <button onclick="markAsWatched('${item.id}'); event.stopPropagation();" 
                class="flex-1 px-4 py-2 ${isWatched ? 'bg-blue-600' : 'bg-gray-200'} ${isWatched ? 'text-white' : 'text-gray-700'} rounded-lg hover:shadow transition">
                <i class="fas fa-eye mr-2"></i>${isWatched ? '시청함 ✓' : '시청한 작품에 추가'}
            </button>
            <button onclick="markAsCreated('${item.id}'); event.stopPropagation();" 
                class="flex-1 px-4 py-2 ${isCreated ? 'bg-red-600' : 'bg-gray-200'} ${isCreated ? 'text-white' : 'text-gray-700'} rounded-lg hover:shadow transition">
                <i class="fas fa-video mr-2"></i>${isCreated ? '쇼츠 제작함 ✓' : '만든 쇼츠에 추가'}
            </button>
        </div>
        
        <!-- 운영자 추천 버튼 (관리자만) -->
        ${isAdmin() ? `
        <div class="mb-4">
            <button onclick="toggleAdminRecommendFromDetail('${type}', '${item.id}'); event.stopPropagation();" 
                class="w-full px-4 py-3 ${item.admin_recommended ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-gradient-to-r from-gray-400 to-gray-500'} text-white rounded-lg hover:shadow-lg transition font-bold">
                <i class="fas fa-crown mr-2"></i>${item.admin_recommended ? '👑 운영자 추천 중 (클릭하여 해제)' : '운영자 추천 설정'}
            </button>
        </div>
        ` : ''}
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Poster -->
            <div>
                ${posterUrl ? 
                    `<img src="${posterUrl}" alt="${escapeHtml(item.title)}" class="w-full rounded-lg shadow-lg">` : 
                    `<div class="w-full aspect-[2/3] rounded-lg poster-img flex items-center justify-center text-white">
                        <i class="fas fa-${type === 'movies' ? 'film' : 'tv'} text-6xl opacity-50"></i>
                    </div>`
                }
                
                <div class="mt-4 flex flex-wrap gap-2">
                    ${item.admin_recommended ? '<span class="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded font-bold text-sm"><i class="fas fa-crown mr-1"></i>운영자 추천</span>' : ''}
                    ${item.is_verified_safe ? '<span class="safe-badge"><i class="fas fa-check-circle mr-1"></i>검증됨</span>' : ''}
                    ${isSafe ? '<span class="safe-badge"><i class="fas fa-shield-alt mr-1"></i>저작권 안전</span>' : ''}
                    ${item.copyright_warning ? '<span class="warning-badge"><i class="fas fa-exclamation-triangle mr-1"></i>경고 있음</span>' : ''}
                </div>
            </div>
            
            <!-- Details -->
            <div class="md:col-span-2 space-y-4">
                <div>
                    <h4 class="font-semibold text-gray-900 mb-2">기본 정보</h4>
                    <div class="space-y-2 text-sm">
                        <div class="flex">
                            <span class="text-gray-600 w-24">개봉일:</span>
                            <span class="font-medium">${releaseDate}</span>
                        </div>
                        ${rating ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">평점:</span>
                                <span class="font-medium">⭐ ${rating}/10</span>
                            </div>
                        ` : ''}
                        ${item.genre ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">장르:</span>
                                <span class="font-medium">${escapeHtml(item.genre)}</span>
                            </div>
                        ` : ''}
                        ${item.director ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">감독:</span>
                                <span class="font-medium">${escapeHtml(item.director)}</span>
                            </div>
                        ` : ''}
                        ${item.production_companies ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">제작사:</span>
                                <span class="font-medium">${escapeHtml(item.production_companies)}</span>
                            </div>
                        ` : ''}
                        ${type === 'movies' && item.runtime ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">상영시간:</span>
                                <span class="font-medium">${item.runtime}분</span>
                            </div>
                        ` : ''}
                        ${type === 'dramas' && item.episode_count ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">에피소드:</span>
                                <span class="font-medium">${item.episode_count}부작</span>
                            </div>
                        ` : ''}
                        ${type === 'movies' && item.audience_count ? `
                            <div class="flex">
                                <span class="text-gray-600 w-24">관객수:</span>
                                <span class="font-medium">${formatNumber(item.audience_count)}명</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                ${item.actors ? `
                    <div>
                        <h4 class="font-semibold text-gray-900 mb-2">출연</h4>
                        <p class="text-sm">${escapeHtml(item.actors)}</p>
                    </div>
                ` : ''}
                
                ${item.plot ? `
                    <div>
                        <h4 class="font-semibold text-gray-900 mb-2">줄거리</h4>
                        <p class="text-sm text-gray-700">${escapeHtml(item.plot)}</p>
                    </div>
                ` : ''}
                
                <div>
                    <h4 class="font-semibold text-gray-900 mb-2">
                        <i class="fas fa-tags mr-2 text-purple-600"></i>이 작품의 분위기
                    </h4>
                    <div class="flex flex-wrap gap-2">
                        ${createEmotionTagBadges(generateEmotionTags(item))}
                    </div>
                </div>
                
                <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                    <h4 class="font-semibold text-gray-900 mb-2">
                        <i class="fas fa-user-check mr-2 text-blue-600"></i>이런 분께 추천합니다
                    </h4>
                    <ul class="text-sm text-gray-700 space-y-1">
                        ${generateRecommendationText(item, generateEmotionTags(item)).map(rec => `
                            <li class="flex items-start">
                                <i class="fas fa-check text-blue-600 mr-2 mt-1"></i>
                                <span>${rec}</span>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                
                <div>
                    <h4 class="font-semibold text-gray-900 mb-2">
                        <i class="fab fa-youtube text-red-600 mr-2"></i>유튜브 쇼츠 정보
                    </h4>
                    <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                        ${(!item.shorts_channel_count || item.shorts_channel_count === 0) ? 
                            `<div class="bg-blue-50 border border-blue-300 rounded-lg p-3 mb-2">
                                <div class="flex items-start gap-2">
                                    <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
                                    <div class="flex-1 text-xs text-blue-800">
                                        <div class="font-semibold mb-1">데이터 미수집</div>
                                        <div>위의 <strong>"AI 자동 분석 시작"</strong> 버튼을 눌러 YouTube 쇼츠 정보를 자동으로 수집할 수 있습니다.</div>
                                    </div>
                                </div>
                            </div>` : ''}
                        <div class="flex">
                            <span class="text-gray-600 w-32">총 쇼츠 수:</span>
                            <span class="font-medium ${(!item.shorts_channel_count || item.shorts_channel_count === 0) ? 'text-red-600' : ''}">${item.shorts_channel_count || 0}개</span>
                        </div>
                        <div class="flex">
                            <span class="text-gray-600 w-32">최초 업로드:</span>
                            <span class="font-medium">${shortsDate}</span>
                        </div>
                        <div class="flex">
                            <span class="text-gray-600 w-32">경과 기간:</span>
                            <span class="font-medium ${monthsSinceShorts >= 6 ? 'text-green-600' : 'text-orange-600'}">
                                ${monthsSinceShorts}개월 ${monthsSinceShorts >= 6 ? '(안전)' : '(주의)'}
                            </span>
                        </div>
                        <div class="flex">
                            <span class="text-gray-600 w-32">저작권 경고:</span>
                            <span class="font-medium ${item.copyright_warning ? 'text-red-600' : 'text-green-600'}">
                                ${item.copyright_warning ? '있음' : '없음'}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${item.notes ? `
                    <div>
                        <h4 class="font-semibold text-gray-900 mb-2">비고</h4>
                        <p class="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
                            <i class="fas fa-sticky-note mr-2"></i>${escapeHtml(item.notes)}
                        </p>
                    </div>
                ` : ''}
                
                <div class="flex gap-2 pt-4">
                    <button onclick="openSafetyRatingModal('${type}', '${item.id}'); event.stopPropagation();" 
                        class="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                        <i class="fas fa-shield-alt mr-2"></i>안전도 평가하기
                    </button>
                    <button onclick="editContent('${type}', '${item.id}'); closeDetail();" 
                        class="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-edit mr-2"></i>수정
                    </button>
                    <button onclick="deleteContent('${type}', '${item.id}'); closeDetail();" 
                        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                        <i class="fas fa-trash mr-2"></i>삭제
                    </button>
                </div>
            </div>
        </div>
        
        ${showRecommendationsInModal(type, id)}
    `;
    
    document.getElementById('detailContent').innerHTML = detailContent;
    document.getElementById('detailModal').classList.remove('hidden');
}

// Close Detail Modal
function closeDetail() {
    document.getElementById('detailModal').classList.add('hidden');
}

// ESC 키로 모달 닫기
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        // Detail Modal 닫기
        const detailModal = document.getElementById('detailModal');
        if (detailModal && !detailModal.classList.contains('hidden')) {
            closeDetail();
        }
        
        // Safety Rating Modal 닫기
        const safetyModal = document.getElementById('safetyRatingModal');
        if (safetyModal && !safetyModal.classList.contains('hidden')) {
            closeSafetyRatingModal();
        }
        
        // Other modals 닫기
        const modal = document.getElementById('modal');
        if (modal && !modal.classList.contains('hidden')) {
            closeModal();
        }
        
        const bulkImportModal = document.getElementById('bulkImportModal');
        if (bulkImportModal && !bulkImportModal.classList.contains('hidden')) {
            closeBulkImport();
        }
        
        const recommendationModal = document.getElementById('recommendationModal');
        if (recommendationModal && !recommendationModal.classList.contains('hidden')) {
            closeRecommendationModal();
        }
        
        // Advanced Search Modal 닫기
        const advancedSearchModal = document.getElementById('advancedSearchModal');
        if (advancedSearchModal && !advancedSearchModal.classList.contains('hidden')) {
            closeAdvancedSearch();
        }
        
        const apiSetupModal = document.getElementById('apiSetupModal');
        if (apiSetupModal && !apiSetupModal.classList.contains('hidden')) {
            closeApiSetup();
        }
    }
});

// Open Add Modal
function openAddModal() {
    currentEditId = null;
    document.getElementById('editId').value = '';
    document.getElementById('contentForm').reset();
    
    // Reset poster preview
    document.getElementById('posterPreview').classList.add('hidden');
    document.getElementById('posterPlaceholder').classList.remove('hidden');
    
    if (currentTab === 'movies') {
        document.getElementById('modalTitle').textContent = '영화 추가';
        document.getElementById('dateLabel').textContent = '개봉일자';
        document.getElementById('movieRatingField').classList.remove('hidden');
        document.getElementById('movieExtraFields').classList.remove('hidden');
        document.getElementById('dramaReactionField').classList.add('hidden');
        document.getElementById('dramaExtraFields').classList.add('hidden');
        document.getElementById('apiSearchSection').classList.remove('hidden');
    } else {
        document.getElementById('modalTitle').textContent = '드라마 추가';
        document.getElementById('dateLabel').textContent = '공개일자';
        document.getElementById('movieRatingField').classList.add('hidden');
        document.getElementById('movieExtraFields').classList.add('hidden');
        document.getElementById('dramaReactionField').classList.remove('hidden');
        document.getElementById('dramaExtraFields').classList.remove('hidden');
        document.getElementById('apiSearchSection').classList.remove('hidden');
    }
    
    document.getElementById('modal').classList.remove('hidden');
}

// Close Modal
function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('apiSearchResults').innerHTML = '';
    currentEditId = null;
}

// Edit Content
async function editContent(type, id) {
    currentEditId = id;
    let item;
    
    if (type === 'movies') {
        item = allMovies.find(m => m.id === id);
        document.getElementById('modalTitle').textContent = '영화 수정';
        document.getElementById('dateLabel').textContent = '개봉일자';
        document.getElementById('movieRatingField').classList.remove('hidden');
        document.getElementById('movieExtraFields').classList.remove('hidden');
        document.getElementById('dramaReactionField').classList.add('hidden');
        document.getElementById('dramaExtraFields').classList.add('hidden');
    } else {
        item = allDramas.find(d => d.id === id);
        document.getElementById('modalTitle').textContent = '드라마 수정';
        document.getElementById('dateLabel').textContent = '공개일자';
        document.getElementById('movieRatingField').classList.add('hidden');
        document.getElementById('movieExtraFields').classList.add('hidden');
        document.getElementById('dramaReactionField').classList.remove('hidden');
        document.getElementById('dramaExtraFields').classList.remove('hidden');
    }
    
    if (!item) return;
    
    // Hide API search section when editing
    document.getElementById('apiSearchSection').classList.add('hidden');
    
    // Fill form
    document.getElementById('editId').value = id;
    document.getElementById('tmdbId').value = item.tmdb_id || '';
    document.getElementById('title').value = item.title || '';
    document.getElementById('releaseDate').value = item.release_date ? new Date(item.release_date).toISOString().split('T')[0] : '';
    document.getElementById('posterUrl').value = item.poster_url || '';
    document.getElementById('director').value = item.director || '';
    document.getElementById('genre').value = item.genre || '';
    document.getElementById('productionCompanies').value = item.production_companies || '';
    document.getElementById('actors').value = item.actors || '';
    document.getElementById('plot').value = item.plot || '';
    document.getElementById('shortsChannelCount').value = item.shorts_channel_count || '';
    document.getElementById('shortsFirstUpload').value = item.shorts_first_upload ? new Date(item.shorts_first_upload).toISOString().split('T')[0] : '';
    document.getElementById('copyrightWarning').checked = item.copyright_warning || false;
    document.getElementById('isVerifiedSafe').checked = item.is_verified_safe || false;
    document.getElementById('adminRecommended').checked = item.admin_recommended || false;
    document.getElementById('notes').value = item.notes || '';
    
    // Update poster preview
    if (item.poster_url) {
        document.getElementById('posterPreview').src = item.poster_url;
        document.getElementById('posterPreview').classList.remove('hidden');
        document.getElementById('posterPlaceholder').classList.add('hidden');
    } else {
        document.getElementById('posterPreview').classList.add('hidden');
        document.getElementById('posterPlaceholder').classList.remove('hidden');
    }
    
    if (type === 'movies') {
        document.getElementById('audienceCount').value = item.audience_count || '';
        document.getElementById('rating').value = item.rating || '';
        document.getElementById('runtime').value = item.runtime || '';
    } else {
        document.getElementById('reactionScore').value = item.reaction_score || '';
        document.getElementById('episodeCount').value = item.episode_count || '';
    }
    
    document.getElementById('modal').classList.remove('hidden');
}

// Delete Content
async function deleteContent(type, id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        const table = type === 'movies' ? 'movies' : 'dramas';
        const response = await fetch(`tables/${table}/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            if (type === 'movies') {
                await loadMovies();
            } else {
                await loadDramas();
            }
            alert('삭제되었습니다.');
        } else {
            throw new Error('삭제 실패');
        }
    } catch (error) {
        console.error('Error deleting:', error);
        alert('삭제하는데 실패했습니다.');
    }
}

// Delete All Content
async function deleteAllContent() {
    const type = currentTab;
    const typeName = type === 'movies' ? '영화' : '드라마';
    const itemCount = type === 'movies' ? allMovies.length : allDramas.length;
    
    if (itemCount === 0) {
        showToast('알림', `삭제할 ${typeName}가 없습니다.`, 'info');
        return;
    }
    
    const confirmMessage = `정말로 모든 ${typeName}를 삭제하시겠습니까?\n\n총 ${itemCount}개의 ${typeName}가 삭제됩니다.\n이 작업은 되돌릴 수 없습니다!`;
    
    if (!confirm(confirmMessage)) return;
    
    // 한 번 더 확인
    if (!confirm(`최종 확인: ${itemCount}개의 ${typeName}를 영구 삭제합니다. 계속하시겠습니까?`)) return;
    
    try {
        const table = type === 'movies' ? 'movies' : 'dramas';
        const items = type === 'movies' ? allMovies : allDramas;
        
        showToast('삭제 중...', `${itemCount}개의 ${typeName}를 삭제하고 있습니다...`, 'info');
        
        let deleted = 0;
        let failed = 0;
        
        for (const item of items) {
            try {
                const response = await fetch(`tables/${table}/${item.id}`, {
                    method: 'DELETE'
                });
                
                if (response.ok) {
                    deleted++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`Failed to delete ${item.title}:`, error);
                failed++;
            }
        }
        
        // 데이터 다시 로드
        if (type === 'movies') {
            await loadMovies();
        } else {
            await loadDramas();
        }
        
        if (failed === 0) {
            showToast('삭제 완료!', `${deleted}개의 ${typeName}를 모두 삭제했습니다.`, 'success');
        } else {
            showToast('일부 삭제 실패', `${deleted}개 삭제, ${failed}개 실패`, 'error');
        }
        
    } catch (error) {
        console.error('Error deleting all:', error);
        showToast('오류', '삭제 중 오류가 발생했습니다.', 'error');
    }
}

// Handle Form Submit
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const data = {
        title: document.getElementById('title').value,
        tmdb_id: document.getElementById('tmdbId').value || null,
        release_date: document.getElementById('releaseDate').value ? new Date(document.getElementById('releaseDate').value).getTime() : null,
        poster_url: document.getElementById('posterUrl').value || null,
        director: document.getElementById('director').value || null,
        genre: document.getElementById('genre').value || null,
        production_companies: document.getElementById('productionCompanies').value || null,
        actors: document.getElementById('actors').value || null,
        plot: document.getElementById('plot').value || null,
        shorts_channel_count: parseInt(document.getElementById('shortsChannelCount').value) || 0,
        shorts_first_upload: document.getElementById('shortsFirstUpload').value ? new Date(document.getElementById('shortsFirstUpload').value).getTime() : null,
        copyright_warning: document.getElementById('copyrightWarning').checked,
        is_verified_safe: document.getElementById('isVerifiedSafe').checked,
        admin_recommended: document.getElementById('adminRecommended').checked,
        notes: document.getElementById('notes').value || null
    };
    
    if (currentTab === 'movies') {
        data.audience_count = parseInt(document.getElementById('audienceCount').value) || 0;
        data.rating = parseFloat(document.getElementById('rating').value) || 0;
        data.runtime = parseInt(document.getElementById('runtime').value) || 0;
    } else {
        data.reaction_score = parseFloat(document.getElementById('reactionScore').value) || 0;
        data.episode_count = parseInt(document.getElementById('episodeCount').value) || 0;
    }
    
    try {
        const table = currentTab === 'movies' ? 'movies' : 'dramas';
        let response;
        
        if (currentEditId) {
            // Update
            response = await fetch(`tables/${table}/${currentEditId}`, {
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
        } else {
            // Create
            response = await fetch(`tables/${table}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(data)
            });
        }
        
        if (response.ok) {
            closeModal();
            if (currentTab === 'movies') {
                await loadMovies();
            } else {
                await loadDramas();
            }
            alert(currentEditId ? '수정되었습니다.' : '추가되었습니다.');
        } else {
            throw new Error('저장 실패');
        }
    } catch (error) {
        console.error('Error saving:', error);
        alert('저장하는데 실패했습니다.');
    }
}

// Search Content
function searchContent() {
    applyFilters();
}

// Clear Search
function clearSearch() {
    document.getElementById('searchInput').value = '';
    document.getElementById('filterVerified').checked = false;
    document.getElementById('filterSafe').checked = false;
    document.getElementById('sortBy').value = 'date';
    applyFilters();
}

// Sort Items
function sortItems(items, type = 'movies') {
    const sortBy = document.getElementById('sortBy').value;
    
    const sorted = [...items].sort((a, b) => {
        switch(sortBy) {
            case 'rating':
                // 평점순 (높은순)
                const ratingA = type === 'movies' ? (a.rating || 0) : (a.reaction_score || 0);
                const ratingB = type === 'movies' ? (b.rating || 0) : (b.reaction_score || 0);
                return ratingB - ratingA;
                
            case 'safety':
                // 안전도순 (높은순)
                const safetyA = a.safety_rating_average || 0;
                const safetyB = b.safety_rating_average || 0;
                return safetyB - safetyA;
                
            case 'audience':
                // 관객수순 (많은순)
                const audienceA = a.audience_count || 0;
                const audienceB = b.audience_count || 0;
                return audienceB - audienceA;
                
            case 'production':
                // 제작사순 (가나다순)
                const prodA = a.production_companies || '';
                const prodB = b.production_companies || '';
                return prodA.localeCompare(prodB, 'ko-KR');
                
            case 'added':
                // 등록순 (최신순)
                return (b.created_at || 0) - (a.created_at || 0);
                
            case 'date':
            default:
                // 개봉일순 (최신순)
                const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
                const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
                return dateB - dateA;
        }
    });
    
    return sorted;
}

// Apply Filters
function applyFilters() {
    const filterVerified = document.getElementById('filterVerified').checked;
    const filterSafe = document.getElementById('filterSafe').checked;
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    if (currentTab === 'movies') {
        let filtered = allMovies;
        
        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(movie => 
                movie.title.toLowerCase().includes(searchTerm) ||
                (movie.actors && movie.actors.toLowerCase().includes(searchTerm)) ||
                (movie.director && movie.director.toLowerCase().includes(searchTerm)) ||
                (movie.production_companies && movie.production_companies.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply verified filter
        if (filterVerified) {
            filtered = filtered.filter(movie => movie.is_verified_safe);
        }
        
        // Apply safe filter (6+ months, no warnings)
        if (filterSafe) {
            filtered = filtered.filter(movie => {
                if (!movie.shorts_first_upload) return false;
                const daysSince = Math.floor((Date.now() - new Date(movie.shorts_first_upload).getTime()) / (1000 * 60 * 60 * 24));
                const monthsSince = Math.floor(daysSince / 30);
                return monthsSince >= 6 && !movie.copyright_warning;
            });
        }
        
        // Apply sorting
        filtered = sortItems(filtered, 'movies');
        
        renderMovies(filtered);
    } else {
        let filtered = allDramas;
        
        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(drama => 
                drama.title.toLowerCase().includes(searchTerm) ||
                (drama.actors && drama.actors.toLowerCase().includes(searchTerm)) ||
                (drama.director && drama.director.toLowerCase().includes(searchTerm)) ||
                (drama.production_companies && drama.production_companies.toLowerCase().includes(searchTerm))
            );
        }
        
        // Apply verified filter
        if (filterVerified) {
            filtered = filtered.filter(drama => drama.is_verified_safe);
        }
        
        // Apply safe filter (6+ months, no warnings)
        if (filterSafe) {
            filtered = filtered.filter(drama => {
                if (!drama.shorts_first_upload) return false;
                const daysSince = Math.floor((Date.now() - new Date(drama.shorts_first_upload).getTime()) / (1000 * 60 * 60 * 24));
                const monthsSince = Math.floor(daysSince / 30);
                return monthsSince >= 6 && !drama.copyright_warning;
            });
        }
        
        // Apply sorting
        filtered = sortItems(filtered, 'dramas');
        
        renderDramas(filtered);
    }
}

// Search YouTube Shorts
async function searchYouTubeShorts(title, type = 'movies') {
    // 유튜브 검색: 영화는 "영화 [제목] shorts", 드라마는 "드라마 [제목] shorts"
    const prefix = type === 'dramas' ? '드라마' : '영화';
    const searchQuery = encodeURIComponent(`${prefix} ${title} shorts`);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    
    // 유튜브 검색 페이지 바로 열기
    window.open(youtubeUrl, '_blank');
    
    showToast('유튜브 열림', `"${prefix} ${title} shorts" 검색 결과를 확인하세요!`, 'success');
}

// Show YouTube Search Results
function showYouTubeSearchResults(title, items, totalResults = 0, uniqueChannelCount = 0) {
    // 고유 채널 수 계산 (전달되지 않았을 경우)
    if (uniqueChannelCount === 0) {
        const uniqueChannels = new Set();
        items.forEach(item => {
            if (item.snippet && item.snippet.channelId) {
                uniqueChannels.add(item.snippet.channelId);
            }
        });
        uniqueChannelCount = uniqueChannels.size;
    }
    
    const displayTotal = totalResults > 0 ? totalResults : items.length;
    
    const resultHtml = `
        <div class="bg-white rounded-lg p-6">
            <h3 class="text-xl font-bold mb-4">
                <i class="fab fa-youtube text-red-600 mr-2"></i>
                "${title}" 유튜브 쇼츠 검색 결과
            </h3>
            
            <div class="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p class="text-xl font-bold text-blue-900 mb-2">
                    <i class="fas fa-video mr-2"></i>
                    총 약 <span class="text-2xl text-purple-600">${displayTotal.toLocaleString()}</span>개의 쇼츠 발견!
                </p>
                <p class="text-sm text-blue-700">
                    <i class="fas fa-users mr-2"></i>
                    약 <span class="font-semibold">${uniqueChannelCount}개</span>의 채널에서 업로드 중
                </p>
                ${displayTotal > items.length ? `
                    <p class="text-xs text-gray-600 mt-2">
                        <i class="fas fa-info-circle mr-1"></i>
                        상위 ${items.length}개만 표시 (총 ${displayTotal.toLocaleString()}개 중)
                    </p>
                ` : ''}
            </div>
            
            <div class="space-y-2 mb-4 max-h-60 overflow-y-auto">
                ${items.slice(0, 10).map(item => `
                    <div class="flex gap-3 p-2 bg-gray-50 rounded">
                        <img src="${item.snippet.thumbnails.default.url}" class="w-20 h-20 object-cover rounded" alt="thumbnail">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium line-clamp-2">${escapeHtml(item.snippet.title)}</p>
                            <p class="text-xs text-gray-600">${escapeHtml(item.snippet.channelTitle)}</p>
                        </div>
                    </div>
                `).join('')}
                ${items.length > 10 ? `<p class="text-xs text-gray-500 text-center">... 외 ${items.length - 10}개</p>` : ''}
            </div>
            
            <div class="flex gap-2">
                <button onclick="closeYouTubeResults()" class="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                    닫기
                </button>
                <button onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' 쇼츠')}&sp=EgJAAQ%253D%253D', '_blank')" 
                    class="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                    <i class="fab fa-youtube mr-2"></i>유튜브에서 보기
                </button>
            </div>
        </div>
    `;
    
    document.getElementById('recommendationContent').innerHTML = resultHtml;
    document.getElementById('recommendationModal').classList.remove('hidden');
}

function closeYouTubeResults() {
    document.getElementById('recommendationModal').classList.add('hidden');
}

// Utility Functions
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatNumber(num) {
    return new Intl.NumberFormat('ko-KR').format(num);
}

// 북마크 기능 (시청한 작품)
function getWatchedItems() {
    const watched = localStorage.getItem('watched_items');
    return watched ? JSON.parse(watched) : [];
}

function markAsWatched(itemId) {
    const watched = getWatchedItems();
    const index = watched.indexOf(itemId);
    
    if (index > -1) {
        // 이미 있으면 제거
        watched.splice(index, 1);
        showToast('취소 완료', '시청한 작품에서 제거되었습니다.', 'success');
    } else {
        // 없으면 추가
        watched.push(itemId);
        showToast('추가 완료', '시청한 작품에 추가되었습니다!', 'success');
    }
    
    localStorage.setItem('watched_items', JSON.stringify(watched));
    
    // 상세 정보 새로고침 (버튼 상태 업데이트)
    const detailModal = document.getElementById('detailModal');
    if (!detailModal.classList.contains('hidden')) {
        // 모달이 열려있으면 현재 보고 있는 작품의 type과 id를 찾아서 새로고침
        // (일단 간단하게 1초 후 자동 닫힘)
        setTimeout(() => {
            const currentTitle = document.querySelector('#detailModal h3').textContent;
            const currentItem = [...allMovies, ...allDramas].find(item => item.title === currentTitle);
            if (currentItem) {
                showDetail(currentItem.type || 'movies', currentItem.id);
            }
        }, 500);
    }
}

// 북마크 기능 (제작한 쇼츠)
function getCreatedShorts() {
    const created = localStorage.getItem('created_shorts');
    return created ? JSON.parse(created) : [];
}

function markAsCreated(itemId) {
    const created = getCreatedShorts();
    const index = created.indexOf(itemId);
    
    if (index > -1) {
        // 이미 있으면 제거
        created.splice(index, 1);
        showToast('취소 완료', '만든 쇼츠에서 제거되었습니다.', 'success');
    } else {
        // 없으면 추가
        created.push(itemId);
        showToast('추가 완료', '만든 쇼츠에 추가되었습니다!', 'success');
    }
    
    localStorage.setItem('created_shorts', JSON.stringify(created));
    
    // 상세 정보 새로고침 (버튼 상태 업데이트)
    const detailModal = document.getElementById('detailModal');
    if (!detailModal.classList.contains('hidden')) {
        setTimeout(() => {
            const currentTitle = document.querySelector('#detailModal h3').textContent;
            const currentItem = [...allMovies, ...allDramas].find(item => item.title === currentTitle);
            if (currentItem) {
                showDetail(currentItem.type || 'movies', currentItem.id);
            }
        }, 500);
    }
}

// AI 자동 분석 실행
async function runAutoAnalysis(type, id, title) {
    const btn = document.getElementById(`autoAnalysisBtn_${id}`);
    const resultDiv = document.getElementById(`autoAnalysisResult_${id}`);
    
    // YouTube API 키 확인
    const apiKey = localStorage.getItem('youtube_api_key');
    if (!apiKey) {
        showToast('API 키 필요', 'YouTube API 키를 먼저 설정해주세요.', 'error');
        openApiSetup();
        return;
    }
    
    try {
        // 버튼 비활성화
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>분석 중... (약 5초 소요)';
        
        // 분석 실행
        const analysis = await analyzeYouTubeShorts(title, type);
        
        // 결과 표시
        resultDiv.innerHTML = renderAutoAnalysisResult(analysis);
        
        // 하이브리드 점수 계산 (커뮤니티 평가 + AI 분석)
        const item = type === 'movies' 
            ? allMovies.find(m => m.id === id)
            : allDramas.find(d => d.id === id);
        
        if (item && item.safety_ratings && item.safety_ratings.length > 0) {
            const communityResult = calculateAverageSafetyRating(item.safety_ratings);
            const hybridResult = calculateHybridScore(analysis, communityResult);
            
            // 하이브리드 점수 표시
            if (hybridResult && hybridResult.type === 'hybrid') {
                const hybridHtml = renderHybridScore(hybridResult);
                resultDiv.innerHTML = hybridHtml + resultDiv.innerHTML;
            }
        }
        
        // DB에 분석 결과 저장
        await saveAutoAnalysis(type, id, analysis);
        
        // 버튼 텍스트 변경
        btn.innerHTML = '<i class="fas fa-sync-alt mr-2"></i>재분석';
        btn.disabled = false;
        
        showToast('분석 완료!', `${analysis.recommendation.level}급 - ${analysis.recommendation.text}`, 'success');
        
        // 상세 정보 새로고침 (쇼츠 정보 업데이트를 위해)
        setTimeout(() => {
            showDetail(type, id);
        }, 500);
        
    } catch (error) {
        console.error('분석 실패:', error);
        resultDiv.innerHTML = `
            <div class="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                <div class="text-red-700 font-semibold mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>분석 실패
                </div>
                <div class="text-sm text-red-600">
                    ${error.message || '분석 중 오류가 발생했습니다.'}
                </div>
                <div class="text-xs text-red-500 mt-2">
                    💡 YouTube API 할당량을 확인해주세요. (하루 10,000 유닛)
                </div>
            </div>
        `;
        
        btn.innerHTML = '<i class="fas fa-robot mr-2"></i>다시 시도';
        btn.disabled = false;
        
        showToast('분석 실패', error.message || '오류가 발생했습니다.', 'error');
    }
}

// 분석 결과 DB 저장
async function saveAutoAnalysis(type, id, analysis) {
    try {
        const table = type === 'movies' ? 'movies' : 'dramas';
        
        const updateData = {
            auto_analysis: analysis,
            auto_analysis_date: Date.now(),
            shorts_channel_count: analysis.totalShorts || 0,  // 총 쇼츠 수 저장
            shorts_first_upload: analysis.oldestDate || null,  // 가장 오래된 영상 날짜
            shorts_last_checked: Date.now(),  // 마지막 확인 시각
            is_forbidden: analysis.isForbidden || false,  // 절대 금지 채널 있음
            forbidden_reason: analysis.isForbidden 
                ? `🚫 절대 금지: ${analysis.forbiddenChannels.map(c => c.channelName).join(', ')}` 
                : (analysis.hasWarningChannel 
                    ? `⚠️ 주의 필요: ${analysis.warningChannels.map(c => c.channelName).join(', ')}` 
                    : null)  // 위험 사유
        };
        
        const response = await fetch(`tables/${table}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            console.error('분석 결과 저장 실패');
        }
        
        // 로컬 데이터 업데이트
        if (type === 'movies') {
            const index = allMovies.findIndex(m => m.id === id);
            if (index !== -1) {
                allMovies[index] = { ...allMovies[index], ...updateData };
            }
        } else {
            const index = allDramas.findIndex(d => d.id === id);
            if (index !== -1) {
                allDramas[index] = { ...allDramas[index], ...updateData };
            }
        }
        
    } catch (error) {
        console.error('분석 결과 저장 오류:', error);
    }
}

// ========================================
// Content Tab Switching (영화/드라마 탭)
// ========================================
function switchContentTab(type) {
    console.log('🔄 Switching content tab:', type);
    
    // 탭 버튼 스타일 변경
    const moviesTabBtn = document.getElementById('moviesTabBtn');
    const dramasTabBtn = document.getElementById('dramasTabBtn');
    const moviesContent = document.getElementById('moviesContent');
    const dramasContent = document.getElementById('dramasContent');
    
    if (type === 'movies') {
        // 영화 탭 활성화
        moviesTabBtn.classList.remove('border-transparent', 'text-gray-500');
        moviesTabBtn.classList.add('border-blue-600', 'text-blue-600');
        dramasTabBtn.classList.remove('border-blue-600', 'border-purple-600', 'text-blue-600', 'text-purple-600');
        dramasTabBtn.classList.add('border-transparent', 'text-gray-500');
        
        moviesContent.classList.remove('hidden');
        dramasContent.classList.add('hidden');
        
        currentTab = 'movies';
    } else {
        // 드라마 탭 활성화
        dramasTabBtn.classList.remove('border-transparent', 'text-gray-500');
        dramasTabBtn.classList.add('border-purple-600', 'text-purple-600');
        moviesTabBtn.classList.remove('border-blue-600', 'border-purple-600', 'text-blue-600', 'text-purple-600');
        moviesTabBtn.classList.add('border-transparent', 'text-gray-500');
        
        dramasContent.classList.remove('hidden');
        moviesContent.classList.add('hidden');
        
        currentTab = 'dramas';
    }
}

/**
 * 작품 추가 모달 열기
 */
function openAddContent(type) {
    currentTab = type;
    
    // 모달 제목 업데이트
    const modalTitle = document.getElementById('modalTitle');
    if (modalTitle) {
        modalTitle.innerHTML = type === 'movies' 
            ? '<i class="fas fa-film mr-2 text-blue-600"></i>영화 추가' 
            : '<i class="fas fa-tv mr-2 text-purple-600"></i>드라마 추가';
    }
    
    // TMDB 검색 제목 업데이트
    const tmdbSearchTitle = document.getElementById('tmdbSearchTitle');
    if (tmdbSearchTitle) {
        tmdbSearchTitle.textContent = type === 'movies' ? 'TMDB에서 영화 검색' : 'TMDB에서 드라마 검색';
    }
    
    // 검색 타입 배지 업데이트
    const currentSearchType = document.getElementById('currentSearchType');
    if (currentSearchType) {
        currentSearchType.textContent = type === 'movies' ? '영화' : '드라마';
        currentSearchType.className = type === 'movies' 
            ? 'text-xs ml-2 px-2 py-1 bg-blue-600 text-white rounded'
            : 'text-xs ml-2 px-2 py-1 bg-purple-600 text-white rounded';
    }
    
    // 입력 placeholder 업데이트
    const apiSearchInput = document.getElementById('apiSearchInput');
    if (apiSearchInput) {
        apiSearchInput.placeholder = type === 'movies' ? '영화 제목 입력...' : '드라마 제목 입력...';
        apiSearchInput.value = '';
    }
    
    // 검색 결과 초기화
    const apiSearchResults = document.getElementById('apiSearchResults');
    if (apiSearchResults) {
        apiSearchResults.innerHTML = '';
    }
    
    // 폼 초기화
    const contentForm = document.getElementById('contentForm');
    if (contentForm) {
        contentForm.reset();
    }
    
    // 모달 열기
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

// ========================================
// Export functions to window
// ========================================
window.switchContentTab = switchContentTab;
window.openAddContent = openAddContent;
window.runAutoAnalysis = runAutoAnalysis;
window.saveAutoAnalysis = saveAutoAnalysis;
window.showDetail = showDetail;
window.closeDetail = closeDetail;
window.toggleAdminRecommendFromDetail = toggleAdminRecommendFromDetail;
window.markAsWatched = markAsWatched;
window.markAsCreated = markAsCreated;
window.switchTab = switchTab;
window.searchContent = searchContent;
window.clearSearch = clearSearch;
window.escapeHtml = escapeHtml;
window.loadMovies = loadMovies;
window.loadDramas = loadDramas;
window.renderMovies = renderMovies;
window.renderDramas = renderDramas;
window.searchYouTubeShorts = searchYouTubeShorts;
window.editContent = editContent;
window.deleteContent = deleteContent;
window.createPosterCard = createPosterCard;
