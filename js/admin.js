/**
 * 관리자 페이지 기능
 * - API 키 관리
 * - 제외 채널 관리
 * - KMDB 한국 고전영화 수집
 * - 데이터 통계
 */

// ========================================
// API 키 관리
// ========================================

/**
 * TMDB API 키 저장 (관리자 페이지)
 */
async function saveAdminTmdbApiKey() {
    const input = document.getElementById('tmdbApiKeyInput');
    const key = input.value.trim();
    
    if (!key) {
        showToast('입력 오류', 'API 키를 입력해주세요.', 'error');
        return;
    }
    
    // api.js의 saveTmdbApiKey 사용 (사용자 계정에 저장)
    await window.saveTmdbApiKey(key);
    input.value = '';
    input.type = 'password';
    
    showToast('저장 완료', 'TMDB API 키가 저장되었습니다.', 'success');
    
    // API 배너 숨기기
    if (typeof updateApiSetupBanner === 'function') {
        updateApiSetupBanner();
    }
}

/**
 * YouTube API 키 저장 (관리자 페이지)
 */
async function saveAdminYoutubeApiKey() {
    const input = document.getElementById('youtubeApiKeyInput');
    const key = input.value.trim();
    
    if (!key) {
        showToast('입력 오류', 'API 키를 입력해주세요.', 'error');
        return;
    }
    
    // api.js의 saveYoutubeApiKey 사용 (사용자 계정에 저장)
    await window.saveYoutubeApiKey(key);
    input.value = '';
    input.type = 'password';
    
    showToast('저장 완료', 'YouTube API 키가 저장되었습니다.', 'success');
}

/**
 * KMDB API 키 저장 (관리자 페이지)
 */
function saveAdminKmdbApiKey() {
    const input = document.getElementById('kmdbApiKeyInput');
    const key = input.value.trim();
    
    if (!key) {
        showToast('입력 오류', 'API 키를 입력해주세요.', 'error');
        return;
    }
    
    window.setKmdbApiKey(key);
    input.value = '';
    input.type = 'password';
    
    showToast('저장 완료!', 'KMDB API 키가 저장되었습니다. 이제 한국 고전영화를 수집할 수 있습니다!', 'success');
}

// ========================================
// KMDB 한국 고전영화 자동 수집
// ========================================

/**
 * KMDB에서 한국 고전영화 자동 수집 (1960-1999)
 */
async function importKmdbClassicMovies() {
    const apiKey = getKmdbApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'KMDB API 키를 먼저 설정해주세요.', 'error');
        return;
    }
    
    const confirmed = confirm(
        '🎬 한국 고전영화 자동 수집\n\n' +
        '1960~1999년 한국 명작 영화 약 100개를 수집합니다.\n' +
        '시간이 약 30초~1분 소요됩니다.\n\n' +
        '계속하시겠습니까?'
    );
    
    if (!confirmed) return;
    
    try {
        showToast('수집 시작', 'KMDB에서 한국 고전영화를 가져오는 중... (약 1분 소요)', 'success');
        
        // KMDB에서 영화 가져오기
        const movies = await fetchKmdbClassicMovies();
        
        if (movies.length === 0) {
            showToast('수집 실패', '영화를 가져올 수 없습니다. API 키를 확인해주세요.', 'error');
            return;
        }
        
        showToast('저장 중...', `${movies.length}개 영화를 DB에 저장하는 중...`, 'success');
        
        // DB에 저장
        const result = await saveKmdbMoviesToDB(movies, 'movies');
        
        showToast(
            '수집 완료!', 
            `✅ 성공: ${result.success}개\n❌ 실패: ${result.failed}개\n⏭️ 중복 제외: ${movies.length - result.success - result.failed}개`, 
            'success'
        );
        
        // 통계 업데이트
        loadAdminStats();
        
        // 내 목록 새로고침
        if (typeof loadMovies === 'function') {
            await loadMovies();
        }
        
    } catch (error) {
        console.error('KMDB 수집 오류:', error);
        showToast('수집 실패', error.message || '오류가 발생했습니다.', 'error');
    }
}

// ========================================
// 제외 채널 관리
// ========================================

/**
 * 제외 채널 목록 로드
 */
async function loadExcludedChannels() {
    try {
        const response = await fetch('tables/excluded_channels?limit=100&sort=-added_at');
        const data = await response.json();
        
        const container = document.getElementById('excludedChannelsList');
        
        if (data.data.length === 0) {
            container.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <i class="fas fa-info-circle text-3xl mb-2"></i>
                    <p>등록된 제외 채널이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        // 위험도별로 그룹화
        const forbidden = data.data.filter(ch => ch.risk_level === 'forbidden');
        const warning = data.data.filter(ch => ch.risk_level === 'warning');
        
        let html = '';
        
        // 절대 금지 채널
        if (forbidden.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-3 text-red-700">
                        <i class="fas fa-ban mr-2"></i>🔴 절대 금지 채널 (${forbidden.length}개)
                    </h4>
                    <div class="space-y-2">
                        ${forbidden.map(ch => renderChannelCard(ch)).join('')}
                    </div>
                </div>
            `;
        }
        
        // 주의 필요 채널
        if (warning.length > 0) {
            html += `
                <div class="mb-6">
                    <h4 class="font-semibold text-lg mb-3 text-orange-700">
                        <i class="fas fa-exclamation-triangle mr-2"></i>🟠 주의 필요 채널 (${warning.length}개)
                    </h4>
                    <div class="space-y-2">
                        ${warning.map(ch => renderChannelCard(ch)).join('')}
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = html;
        
        // 통계 업데이트
        document.getElementById('adminChannelCount').textContent = data.data.length;
        
    } catch (error) {
        console.error('채널 목록 로드 실패:', error);
        document.getElementById('excludedChannelsList').innerHTML = `
            <div class="text-center text-red-500 py-8">
                <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
                <p>채널 목록을 불러올 수 없습니다.</p>
            </div>
        `;
    }
}

/**
 * 채널 카드 렌더링
 */
function renderChannelCard(channel) {
    const isForbidden = channel.risk_level === 'forbidden';
    const bgColor = isForbidden ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300';
    const textColor = isForbidden ? 'text-red-700' : 'text-orange-700';
    const icon = isForbidden ? '🔴' : '🟠';
    
    // 날짜 포맷
    const addedDate = channel.added_at ? new Date(channel.added_at).toLocaleDateString('ko-KR') : '-';
    
    return `
        <div class="${bgColor} border-2 rounded-lg p-4">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="font-semibold ${textColor} mb-1">
                        ${icon} ${escapeHtml(channel.channel_name)}
                    </div>
                    <div class="text-sm text-gray-600 mb-2">
                        <i class="fas fa-link mr-1"></i>
                        <a href="${escapeHtml(channel.channel_url)}" target="_blank" 
                           class="hover:underline">${escapeHtml(channel.channel_url)}</a>
                    </div>
                    ${channel.reason ? `
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-info-circle mr-1"></i>
                            ${escapeHtml(channel.reason)}
                        </div>
                    ` : ''}
                    <div class="text-xs text-gray-500 mt-2">
                        추가: ${addedDate} ${channel.added_by ? `by ${escapeHtml(channel.added_by)}` : ''}
                    </div>
                </div>
                <button onclick="deleteExcludedChannel('${channel.id}')" 
                        class="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

/**
 * YouTube 채널 ID 추출
 * @param {string} url - YouTube 채널 URL
 * @returns {string|null} 채널 ID
 */
function extractChannelId(url) {
    // URL 패턴: youtube.com/@채널명 또는 youtube.com/channel/UC...
    
    // @채널명 형식
    const handleMatch = url.match(/youtube\.com\/@([^\/\?]+)/);
    if (handleMatch) {
        // @채널명으로는 채널 ID를 직접 가져올 수 없으므로
        // URL 그대로 반환 (나중에 API로 변환 필요)
        return `@${handleMatch[1]}`;
    }
    
    // channel/UC... 형식
    const channelMatch = url.match(/youtube\.com\/channel\/([^\/\?]+)/);
    if (channelMatch) {
        return channelMatch[1];
    }
    
    // c/채널명 형식
    const cMatch = url.match(/youtube\.com\/c\/([^\/\?]+)/);
    if (cMatch) {
        return `c/${cMatch[1]}`;
    }
    
    return null;
}

/**
 * 새 제외 채널 추가
 */
async function addExcludedChannel() {
    const urlInput = document.getElementById('newChannelUrl');
    const nameInput = document.getElementById('newChannelName');
    const riskLevelSelect = document.getElementById('newChannelRiskLevel');
    const reasonInput = document.getElementById('newChannelReason');
    
    const url = urlInput.value.trim();
    const name = nameInput.value.trim();
    const riskLevel = riskLevelSelect.value;
    const reason = reasonInput.value.trim();
    
    // 유효성 검사
    if (!url || !name) {
        showToast('입력 오류', 'URL과 채널 이름을 입력해주세요.', 'error');
        return;
    }
    
    if (!url.includes('youtube.com')) {
        showToast('입력 오류', 'YouTube 채널 URL을 입력해주세요.', 'error');
        return;
    }
    
    // 채널 ID 추출
    const channelId = extractChannelId(url);
    
    if (!channelId) {
        showToast('입력 오류', '유효한 YouTube 채널 URL이 아닙니다.', 'error');
        return;
    }
    
    try {
        // DB에 저장
        const response = await fetch('tables/excluded_channels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel_id: channelId,
                channel_name: name,
                channel_url: url,
                risk_level: riskLevel,
                reason: reason || (riskLevel === 'forbidden' ? '공식 채널로 저작권 엄격 관리' : '일부 작품 위험 가능성'),
                added_by: 'admin',
                added_at: Date.now()
            })
        });
        
        if (!response.ok) {
            throw new Error('저장 실패');
        }
        
        showToast('추가 완료', `${name} 채널이 제외 목록에 추가되었습니다.`, 'success');
        
        // 입력 필드 초기화
        urlInput.value = '';
        nameInput.value = '';
        reasonInput.value = '';
        riskLevelSelect.value = 'forbidden';
        
        // 목록 새로고침
        await loadExcludedChannels();
        
    } catch (error) {
        console.error('채널 추가 오류:', error);
        showToast('추가 실패', error.message || '오류가 발생했습니다.', 'error');
    }
}

/**
 * 제외 채널 삭제
 */
async function deleteExcludedChannel(id) {
    const confirmed = confirm('이 채널을 제외 목록에서 삭제하시겠습니까?');
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`tables/excluded_channels/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('삭제 실패');
        }
        
        showToast('삭제 완료', '채널이 제외 목록에서 삭제되었습니다.', 'success');
        
        // 목록 새로고침
        await loadExcludedChannels();
        
    } catch (error) {
        console.error('채널 삭제 오류:', error);
        showToast('삭제 실패', error.message || '오류가 발생했습니다.', 'error');
    }
}

// ========================================
// 데이터 통계
// ========================================

/**
 * 관리자 통계 로드
 */
async function loadAdminStats() {
    try {
        // 영화 개수
        const moviesResponse = await fetch('tables/movies?limit=1');
        const moviesData = await moviesResponse.json();
        document.getElementById('adminMovieCount').textContent = moviesData.total || 0;
        
        // 드라마 개수
        const dramasResponse = await fetch('tables/dramas?limit=1');
        const dramasData = await dramasResponse.json();
        document.getElementById('adminDramaCount').textContent = dramasData.total || 0;
        
        // 운영자 추천 개수 (영화 + 드라마)
        const [allMoviesResponse, allDramasResponse] = await Promise.all([
            fetch('tables/movies?limit=100'),
            fetch('tables/dramas?limit=100')
        ]);
        const allMoviesData = await allMoviesResponse.json();
        const allDramasData = await allDramasResponse.json();
        const recommendedMovies = allMoviesData.data.filter(m => m.admin_recommended).length;
        const recommendedDramas = allDramasData.data.filter(d => d.admin_recommended).length;
        const totalRecommended = recommendedMovies + recommendedDramas;
        document.getElementById('adminRecommendCount').textContent = totalRecommended;
        
        // 제외 채널 개수
        const channelsResponse = await fetch('tables/excluded_channels?limit=1');
        const channelsData = await channelsResponse.json();
        document.getElementById('adminChannelCount').textContent = channelsData.total || 0;
        
    } catch (error) {
        console.error('통계 로드 오류:', error);
    }
}

/**
 * 관리자 페이지 초기화
 */
function initAdminPage() {
    // API 키 불러오기
    const tmdbKey = getTmdbApiKey();
    const youtubeKey = getYoutubeApiKey();
    const kmdbKey = getKmdbApiKey();
    
    if (tmdbKey) {
        document.getElementById('tmdbApiKeyInput').placeholder = '✅ API 키 저장됨';
    }
    if (youtubeKey) {
        document.getElementById('youtubeApiKeyInput').placeholder = '✅ API 키 저장됨';
    }
    if (kmdbKey) {
        document.getElementById('kmdbApiKeyInput').placeholder = '✅ API 키 저장됨';
    }
    
    // 제외 채널 목록 로드
    loadExcludedChannels();
    
    // 통계 로드
    loadAdminStats();
    
    // 회원 승인 목록 로드
    loadPendingUsers();
}

// ========================================
// 운영자 추천 작품 관리
// ========================================

/**
 * 작품 검색 (관리자용)
 */
async function searchAdminWorks() {
    const searchInput = document.getElementById('adminSearchInput');
    const query = searchInput.value.trim();
    
    if (!query) {
        showToast('입력 필요', '검색어를 입력해주세요.', 'error');
        return;
    }
    
    try {
        // 영화와 드라마 모두 검색
        const [moviesResponse, dramasResponse] = await Promise.all([
            fetch(`tables/movies?search=${encodeURIComponent(query)}&limit=20`),
            fetch(`tables/dramas?search=${encodeURIComponent(query)}&limit=20`)
        ]);
        
        const moviesData = await moviesResponse.json();
        const dramasData = await dramasResponse.json();
        
        const movies = moviesData.data.map(m => ({...m, type: 'movies'}));
        const dramas = dramasData.data.map(d => ({...d, type: 'dramas'}));
        const allWorks = [...movies, ...dramas];
        
        renderAdminWorksList(allWorks);
        
    } catch (error) {
        console.error('작품 검색 오류:', error);
        showToast('검색 실패', '작품을 검색할 수 없습니다.', 'error');
    }
}

/**
 * 작품 목록 렌더링 (관리자용)
 */
function renderAdminWorksList(works) {
    const container = document.getElementById('adminWorksList');
    
    if (works.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-inbox text-3xl mb-2"></i>
                <p>검색 결과가 없습니다</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = works.map(work => {
        const isRecommended = work.admin_recommended || false;
        const isVerified = work.is_verified_safe || false;
        const score = work.type === 'movies' ? (work.rating || 0) : (work.reaction_score || 0);
        const posterUrl = work.poster_url || '';
        const safetyRating = work.safety_rating_average || 0;
        const safetyCount = work.safety_rating_count || 0;
        
        return `
            <div class="flex items-center gap-3 p-3 border rounded-lg mb-2 ${isRecommended ? 'bg-yellow-50 border-yellow-300' : isVerified ? 'bg-blue-50 border-blue-300' : 'bg-white'}">
                ${posterUrl ? `
                    <img src="${posterUrl}" class="w-16 h-24 object-cover rounded" alt="${work.title}">
                ` : `
                    <div class="w-16 h-24 bg-gray-200 rounded flex items-center justify-center">
                        <i class="fas fa-${work.type === 'movies' ? 'film' : 'tv'} text-gray-400"></i>
                    </div>
                `}
                <div class="flex-1">
                    <h4 class="font-semibold">${work.title}</h4>
                    <div class="text-sm text-gray-600">
                        ${work.type === 'movies' ? '영화' : '드라마'} · 
                        ${work.release_date ? new Date(work.release_date).getFullYear() : '미정'} · 
                        ⭐ ${score.toFixed(1)}
                    </div>
                    <div class="flex gap-2 mt-1">
                        ${isRecommended ? '<span class="text-xs bg-yellow-600 text-white px-2 py-0.5 rounded"><i class="fas fa-crown mr-1"></i>운영자 추천</span>' : ''}
                        ${isVerified ? '<span class="text-xs bg-blue-600 text-white px-2 py-0.5 rounded"><i class="fas fa-check-circle mr-1"></i>운영자 검증</span>' : ''}
                        ${safetyCount >= 3 ? `<span class="text-xs bg-green-600 text-white px-2 py-0.5 rounded"><i class="fas fa-users mr-1"></i>커뮤니티 ${safetyRating.toFixed(1)}/10 (${safetyCount}명)</span>` : ''}
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="toggleAdminRecommend('${work.type}', '${work.id}', ${!isRecommended})" 
                            class="px-3 py-2 ${isRecommended ? 'bg-gray-400' : 'bg-yellow-500'} text-white rounded-lg hover:opacity-80 transition text-sm"
                            title="${isRecommended ? '운영자 추천 해제' : '운영자 추천 설정 (S등급)'}">
                        ${isRecommended ? '<i class="fas fa-times"></i>' : '<i class="fas fa-crown"></i>'}
                    </button>
                    <button onclick="toggleAdminVerified('${work.type}', '${work.id}', ${!isVerified})" 
                            class="px-3 py-2 ${isVerified ? 'bg-gray-400' : 'bg-blue-500'} text-white rounded-lg hover:opacity-80 transition text-sm"
                            title="${isVerified ? '운영자 검증 해제' : '운영자 검증 설정 (A등급)'}">
                        ${isVerified ? '<i class="fas fa-times"></i>' : '<i class="fas fa-check-circle"></i>'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * 운영자 추천 토글 (S등급 자동 부여)
 */
async function toggleAdminRecommend(type, id, recommend) {
    try {
        const table = type === 'movies' ? 'movies' : 'dramas';
        
        const response = await fetch(`tables/${table}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_recommended: recommend
            })
        });
        
        if (!response.ok) {
            throw new Error('저장 실패');
        }
        
        showToast(
            recommend ? '👑 운영자 추천 설정 (S등급)' : '운영자 추천 해제',
            recommend ? '이 작품은 S등급으로 표시되며, 메인 화면에 노출됩니다.' : '운영자 추천에서 해제되었습니다.',
            'success'
        );
        
        // 목록 새로고침
        searchAdminWorks();
        loadAdminStats();
        
    } catch (error) {
        console.error('운영자 추천 설정 오류:', error);
        showToast('오류', '설정을 저장할 수 없습니다.', 'error');
    }
}

/**
 * 운영자 검증 토글 (A등급 자동 부여)
 */
async function toggleAdminVerified(type, id, verify) {
    try {
        const table = type === 'movies' ? 'movies' : 'dramas';
        
        const response = await fetch(`tables/${table}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                is_verified_safe: verify
            })
        });
        
        if (!response.ok) {
            throw new Error('저장 실패');
        }
        
        showToast(
            verify ? '✓ 운영자 검증 설정 (A등급)' : '운영자 검증 해제',
            verify ? '이 작품은 A등급으로 표시되며, 안전하다고 표시됩니다.' : '운영자 검증에서 해제되었습니다.',
            'success'
        );
        
        // 목록 새로고침
        searchAdminWorks();
        
        // 통계 업데이트
        loadAdminStats();
        
    } catch (error) {
        console.error('추천 설정 오류:', error);
        showToast('설정 실패', error.message || '오류가 발생했습니다.', 'error');
    }
}

// Export to window
window.saveAdminTmdbApiKey = saveAdminTmdbApiKey;
window.saveAdminYoutubeApiKey = saveAdminYoutubeApiKey;
window.saveAdminKmdbApiKey = saveAdminKmdbApiKey;
window.importKmdbClassicMovies = importKmdbClassicMovies;
window.loadExcludedChannels = loadExcludedChannels;
window.addExcludedChannel = addExcludedChannel;
window.deleteExcludedChannel = deleteExcludedChannel;
window.loadAdminStats = loadAdminStats;
window.initAdminPage = initAdminPage;
window.searchAdminWorks = searchAdminWorks;
window.toggleAdminRecommend = toggleAdminRecommend;
window.toggleAdminVerified = toggleAdminVerified;

// ========================================
// 회원 승인 관리
// ========================================

/**
 * 승인 대기 중인 회원 목록 로드
 */
async function loadPendingUsers() {
    try {
        console.log('📋 회원 목록 로드 시작...');
        
        const url = 'tables/users?limit=100';
        console.log('   - 요청 URL:', url);
        
        const response = await fetch(url);
        console.log('   - 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 서버 응답 오류:', errorText);
            throw new Error(`회원 목록 로드 실패: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('   - 전체 회원 수:', data.total || 0);
        
        const users = data.data || [];
        console.log('   - 받아온 회원 수:', users.length);
        
        // SAMOVIE 관리자 제외
        const allUsers = users.filter(u => u.username !== 'SAMOVIE' && u.id !== 'admin-samovie');
        console.log('   - SAMOVIE 제외 후:', allUsers.length);
        
        // 승인 대기 중인 회원
        const pendingUsers = allUsers.filter(u => !u.is_approved);
        
        // 승인된 회원
        const approvedUsers = allUsers.filter(u => u.is_approved);
        
        console.log(`✅ 회원 분류 완료:`);
        console.log(`   - 승인 대기: ${pendingUsers.length}명`);
        console.log(`   - 승인됨: ${approvedUsers.length}명`);
        
        if (pendingUsers.length > 0) {
            console.log('📋 승인 대기 회원:', pendingUsers.map(u => `${u.name} (${u.email})`).join(', '));
        }
        
        renderPendingUsers(pendingUsers);
        renderApprovedUsers(approvedUsers);
        
        console.log('✅ 회원 목록 렌더링 완료');
        
    } catch (error) {
        console.error('❌ 회원 목록 로드 오류:', error);
        console.error('   - 오류 메시지:', error.message);
        console.error('   - 오류 스택:', error.stack);
        
        // 에러 UI 표시
        const pendingContainer = document.getElementById('pendingUsersList');
        const approvedContainer = document.getElementById('approvedUsersList');
        
        if (pendingContainer) {
            pendingContainer.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                    <p>회원 목록을 불러올 수 없습니다.</p>
                    <p class="text-sm mt-2">${error.message}</p>
                    <button onclick="loadPendingUsers()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
                        다시 시도
                    </button>
                </div>
            `;
        }
        
        if (approvedContainer) {
            approvedContainer.innerHTML = `
                <div class="text-center text-gray-500 py-8">
                    <p>데이터를 불러올 수 없습니다.</p>
                </div>
            `;
        }
    }
}

/**
 * 승인 대기 회원 목록 렌더링
 */
function renderPendingUsers(users) {
    const container = document.getElementById('pendingUsersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">승인 대기 중인 회원이 없습니다.</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                        ${user.profile_pic ? 
                            `<img src="${user.profile_pic}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` :
                            '<div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #fbbf24, #f59e0b); display: flex; align-items: center; justify-content: center; font-size: 24px;">👤</div>'
                        }
                        <div>
                            <div style="font-weight: bold; font-size: 18px; color: white;">${user.name}</div>
                            <div style="color: #9ca3af; font-size: 14px;">${user.email}</div>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: #6b7280;">
                        가입일: ${new Date(user.created_at).toLocaleString('ko-KR')}
                    </div>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <button onclick="approveUser('${user.id}', '${user.name}', false)" 
                            style="padding: 10px 20px; background: linear-gradient(135deg, #10b981, #059669); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                        ✅ 일반 승인
                    </button>
                    <button onclick="approveUser('${user.id}', '${user.name}', true)" 
                            style="padding: 10px 20px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border: none; border-radius: 8px; color: #1f2937; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                        👑 관리자 승인
                    </button>
                    <button onclick="rejectUser('${user.id}', '${user.name}')" 
                            style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                        ❌ 거부
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 회원 승인
 */
async function approveUser(userId, userName, asAdmin = false) {
    const message = asAdmin 
        ? `"${userName}" 님을 관리자로 승인하시겠습니까?\n\n⚠️ 관리자는 모든 회원을 승인/거부하고 시스템을 관리할 수 있습니다.`
        : `"${userName}" 님을 일반 회원으로 승인하시겠습니까?`;
    
    if (!confirm(message)) {
        console.log('❌ 사용자가 승인을 취소함');
        return;
    }
    
    try {
        console.log('🔄 승인 처리 시작...');
        console.log('   - 사용자 ID:', userId);
        console.log('   - 사용자 이름:', userName);
        console.log('   - 관리자 승인:', asAdmin);
        
        const updateData = { 
            is_approved: true,
            is_admin: asAdmin
        };
        console.log('   - 업데이트 데이터:', updateData);
        
        const url = `tables/users/${userId}`;
        console.log('   - 요청 URL:', url);
        
        const response = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        console.log('   - 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 서버 응답 오류:', errorText);
            throw new Error(`승인 실패: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ 승인 성공:', result);
        
        if (asAdmin) {
            showToast('승인 완료', `👑 "${userName}" 님이 관리자로 승인되었습니다.`, 'success');
        } else {
            showToast('승인 완료', `✅ "${userName}" 님이 승인되었습니다.`, 'success');
        }
        
        // 목록 새로고침
        console.log('🔄 회원 목록 새로고침...');
        await loadPendingUsers();
        await loadAdminStats();
        console.log('✅ 새로고침 완료');
        
    } catch (error) {
        console.error('❌ 승인 오류:', error);
        console.error('   - 오류 메시지:', error.message);
        console.error('   - 오류 스택:', error.stack);
        showToast('오류 발생', '승인 처리 중 오류가 발생했습니다: ' + error.message, 'error');
    }
}

/**
 * 회원 거부 (삭제)
 */
async function rejectUser(userId, userName) {
    if (!confirm(`"${userName}" 님의 가입을 거부하시겠습니까?\n\n해당 회원 데이터가 삭제됩니다.`)) {
        console.log('❌ 사용자가 거부를 취소함');
        return;
    }
    
    try {
        console.log('🔄 회원 거부 처리 시작...');
        console.log('   - 사용자 ID:', userId);
        console.log('   - 사용자 이름:', userName);
        
        const url = `tables/users/${userId}`;
        console.log('   - 요청 URL:', url);
        
        const response = await fetch(url, {
            method: 'DELETE'
        });
        
        console.log('   - 응답 상태:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 서버 응답 오류:', errorText);
            throw new Error(`거부 실패: ${response.status} - ${errorText}`);
        }
        
        console.log('✅ 회원 거부 성공');
        
        showToast('거부 완료', `❌ "${userName}" 님의 가입이 거부되었습니다.`, 'error');
        
        // 목록 새로고침
        console.log('🔄 회원 목록 새로고침...');
        await loadPendingUsers();
        await loadAdminStats();
        console.log('✅ 새로고침 완료');
        
    } catch (error) {
        console.error('❌ 거부 오류:', error);
        showToast('거부 처리 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 승인된 회원 목록 렌더링
 */
function renderApprovedUsers(users) {
    const container = document.getElementById('approvedUsersList');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 40px;">승인된 회원이 없습니다.</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 20px; margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 20px;">
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                        ${user.profile_pic ? 
                            `<img src="${user.profile_pic}" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">` :
                            '<div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; font-size: 24px;">👤</div>'
                        }
                        <div>
                            <div style="font-weight: bold; font-size: 18px; color: white; display: flex; align-items: center; gap: 10px;">
                                ${user.name}
                                ${user.is_admin ? '<span style="background: linear-gradient(135deg, #fbbf24, #f59e0b); color: #1f2937; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold;">👑 관리자</span>' : ''}
                            </div>
                            <div style="color: #9ca3af; font-size: 14px;">${user.email}</div>
                        </div>
                    </div>
                    <div style="font-size: 13px; color: #6b7280;">
                        가입일: ${new Date(user.created_at).toLocaleString('ko-KR')}
                        ${user.last_login ? ' | 마지막 로그인: ' + new Date(user.last_login).toLocaleString('ko-KR') : ''}
                    </div>
                </div>
                <div style="display: flex; gap: 10px;">
                    ${!user.is_admin ? `
                        <button onclick="makeAdmin('${user.id}', '${user.name}')" 
                                style="padding: 10px 20px; background: linear-gradient(135deg, #fbbf24, #f59e0b); border: none; border-radius: 8px; color: #1f2937; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                            👑 관리자로
                        </button>
                    ` : `
                        <button onclick="removeAdmin('${user.id}', '${user.name}')" 
                                style="padding: 10px 20px; background: linear-gradient(135deg, #6b7280, #4b5563); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                            ↓ 일반 회원으로
                        </button>
                    `}
                    <button onclick="removeUser('${user.id}', '${user.name}')" 
                            style="padding: 10px 20px; background: linear-gradient(135deg, #ef4444, #dc2626); border: none; border-radius: 8px; color: white; font-weight: bold; cursor: pointer; transition: all 0.3s;">
                        🗑️ 삭제
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 일반 회원을 관리자로 승격
 */
async function makeAdmin(userId, userName) {
    if (!confirm(`"${userName}" 님을 관리자로 승격하시겠습니까?\n\n⚠️ 관리자는 모든 회원을 관리하고 시스템을 제어할 수 있습니다.`)) {
        return;
    }
    
    try {
        console.log('👑 관리자 승격:', userId);
        
        const response = await fetch(`tables/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_admin: true })
        });
        
        if (!response.ok) {
            throw new Error('승격 실패');
        }
        
        showToast(`👑 "${userName}" 님이 관리자로 승격되었습니다.`, 'success');
        
        // 목록 새로고침
        loadPendingUsers();
        
    } catch (error) {
        console.error('❌ 승격 오류:', error);
        showToast('승격 처리 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 관리자를 일반 회원으로 강등
 */
async function removeAdmin(userId, userName) {
    if (!confirm(`"${userName}" 님의 관리자 권한을 제거하시겠습니까?`)) {
        return;
    }
    
    try {
        console.log('↓ 관리자 권한 제거:', userId);
        
        const response = await fetch(`tables/users/${userId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_admin: false })
        });
        
        if (!response.ok) {
            throw new Error('권한 제거 실패');
        }
        
        showToast(`"${userName}" 님이 일반 회원으로 변경되었습니다.`, 'success');
        
        // 목록 새로고침
        loadPendingUsers();
        
    } catch (error) {
        console.error('❌ 권한 제거 오류:', error);
        showToast('권한 제거 중 오류가 발생했습니다.', 'error');
    }
}

/**
 * 회원 삭제
 */
async function removeUser(userId, userName) {
    if (!confirm(`"${userName}" 님을 삭제하시겠습니까?\n\n⚠️ 이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    try {
        console.log('🗑️ 회원 삭제:', userId);
        
        const response = await fetch(`tables/users/${userId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('삭제 실패');
        }
        
        showToast(`"${userName}" 님이 삭제되었습니다.`, 'error');
        
        // 목록 새로고침
        loadPendingUsers();
        loadAdminStats();
        
    } catch (error) {
        console.error('❌ 삭제 오류:', error);
        showToast('삭제 처리 중 오류가 발생했습니다.', 'error');
    }
}

window.loadPendingUsers = loadPendingUsers;
window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.makeAdmin = makeAdmin;
window.removeAdmin = removeAdmin;
window.removeUser = removeUser;

console.log('✅ 관리자 페이지 모듈 로드 완료');
