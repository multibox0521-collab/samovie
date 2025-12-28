/**
 * YouTube API 통합 기능
 * 1. 자동 쇼츠 개수 수집
 * 2. 채널 분석 (경쟁도)
 * 3. 트렌드 분석 (7일)
 * 4. 실시간 조회수
 * 5. 자동 업데이트 (24시간)
 */

// YouTube API 키 가져오기
function getYoutubeApiKey() {
    return localStorage.getItem('youtube_api_key') || '';
}

// ===========================================
// 1. 자동 쇼츠 개수 수집
// ===========================================

/**
 * 모든 영화/드라마의 쇼츠 개수를 자동으로 수집 (24시간 캐시 적용)
 */
async function autoCollectAllShortsData() {
    const apiKey = getYoutubeApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'YouTube API 키를 먼저 입력해주세요.', 'error');
        openApiSetup();
        return;
    }
    
    const allContent = [...allMovies, ...allDramas];
    
    if (allContent.length === 0) {
        showToast('데이터 없음', '먼저 작품을 추가해주세요.', 'error');
        return;
    }
    
    // 24시간 이내에 조사한 작품 필터링
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const needsUpdate = allContent.filter(item => {
        const lastChecked = item.shorts_last_checked;
        return !lastChecked || lastChecked < oneDayAgo;
    });
    
    const skippedCount = allContent.length - needsUpdate.length;
    
    if (needsUpdate.length === 0) {
        showToast('최신 데이터', '모든 작품이 최근 24시간 내에 조사되었습니다.', 'success');
        return;
    }
    
    const message = skippedCount > 0 ? 
        `총 ${allContent.length}개 중 ${needsUpdate.length}개를 조사합니다.\n(${skippedCount}개는 최근 데이터 사용)\n\n계속하시겠습니까?` :
        `총 ${needsUpdate.length}개 작품의 쇼츠 데이터를 수집합니다.\n시간이 오래 걸릴 수 있습니다. 계속하시겠습니까?`;
    
    if (!confirm(message)) {
        return;
    }
    
    showToast('수집 시작', `${needsUpdate.length}개 작품 조사 중... (${skippedCount}개 캐시 사용)`, 'success');
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < needsUpdate.length; i++) {
        const item = needsUpdate[i];
        const progress = Math.round(((i + 1) / needsUpdate.length) * 100);
        
        console.log(`[${i + 1}/${needsUpdate.length}] ${item.title} 수집 중... (${progress}%)`);
        
        try {
            const shortsData = await getYouTubeShortsData(item.title, apiKey);
            
            // DB 업데이트
            const table = item.id.includes('drama') ? 'dramas' : 'movies';
            await updateShortsData(table, item.id, shortsData);
            
            successCount++;
            console.log(`✅ ${item.title}: ${shortsData.totalShorts}개 쇼츠, ${shortsData.uniqueChannels}개 채널`);
            
        } catch (error) {
            errorCount++;
            console.error(`❌ ${item.title} 실패:`, error);
        }
        
        // API 호출 제한 방지 (1초 대기)
        await delay(1000);
    }
    
    // 완료 후 데이터 다시 로드
    await loadMovies();
    await loadDramas();
    
    showToast('수집 완료', `성공: ${successCount}개, 실패: ${errorCount}개, 캐시: ${skippedCount}개`, 'success');
}

/**
 * YouTube에서 특정 작품의 쇼츠 데이터 가져오기
 */
async function getYouTubeShortsData(title, apiKey) {
    const type = title.includes('드라마') ? 'dramas' : 'movies';
    const searchQuery = type === 'dramas' ? 
        `드라마 ${title} shorts` : 
        `영화 ${title} shorts`;
    
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=short&maxResults=50&key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`YouTube API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    
    // 고유 채널 수 계산
    const uniqueChannels = new Set();
    (data.items || []).forEach(item => {
        uniqueChannels.add(item.snippet.channelId);
    });
    
    // 첫 번째 업로드 날짜 찾기
    let firstUploadDate = null;
    if (data.items && data.items.length > 0) {
        const dates = data.items.map(item => new Date(item.snippet.publishedAt)).sort((a, b) => a - b);
        firstUploadDate = dates[0].getTime();
    }
    
    return {
        totalShorts: data.items ? data.items.length : 0,
        uniqueChannels: uniqueChannels.size,
        firstUploadDate: firstUploadDate,
        lastChecked: Date.now()
    };
}

/**
 * DB에 쇼츠 데이터 업데이트
 */
async function updateShortsData(table, id, shortsData) {
    const response = await fetch(`tables/${table}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            shorts_channel_count: shortsData.uniqueChannels,
            shorts_first_upload: shortsData.firstUploadDate,
            shorts_last_checked: shortsData.lastChecked
        })
    });
    
    if (!response.ok) {
        throw new Error(`DB 업데이트 실패: ${response.status}`);
    }
    
    return await response.json();
}

// ===========================================
// 2. 채널 분석 (경쟁도)
// ===========================================

/**
 * 특정 작품의 쇼츠 채널을 상세 분석
 */
async function analyzeShortsChannels(title) {
    const apiKey = getYoutubeApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'YouTube API 키를 먼저 입력해주세요.', 'error');
        return null;
    }
    
    try {
        const shortsData = await getYouTubeShortsData(title, apiKey);
        
        // 경쟁도 점수 계산
        const competitionScore = calculateCompetitionScore(shortsData.uniqueChannels);
        
        return {
            ...shortsData,
            competitionScore: competitionScore,
            competitionLevel: getCompetitionLevel(competitionScore)
        };
        
    } catch (error) {
        console.error('채널 분석 실패:', error);
        showToast('분석 실패', '채널 분석에 실패했습니다.', 'error');
        return null;
    }
}

/**
 * 경쟁도 점수 계산 (0-100, 낮을수록 좋음)
 */
function calculateCompetitionScore(channelCount) {
    if (channelCount === 0) return 0;  // 블루오션
    if (channelCount < 5) return 20;   // 매우 낮음
    if (channelCount < 10) return 40;  // 낮음
    if (channelCount < 30) return 60;  // 보통
    if (channelCount < 50) return 80;  // 높음
    return 100;  // 매우 높음 (레드오션)
}

/**
 * 경쟁도 레벨 텍스트
 */
function getCompetitionLevel(score) {
    if (score === 0) return '블루오션 🌊';
    if (score < 30) return '매우 낮음 ✅';
    if (score < 50) return '낮음 👍';
    if (score < 70) return '보통 ⚠️';
    if (score < 90) return '높음 🔴';
    return '레드오션 ❌';
}

// ===========================================
// 3. 트렌드 분석 (7일)
// ===========================================

/**
 * 최근 7일간 트렌드 분석
 */
async function analyzeTrends(title) {
    const apiKey = getYoutubeApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'YouTube API 키를 먼저 입력해주세요.', 'error');
        return null;
    }
    
    try {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        const type = title.includes('드라마') ? 'dramas' : 'movies';
        const searchQuery = type === 'dramas' ? 
            `드라마 ${title} shorts` : 
            `영화 ${title} shorts`;
        
        // 최근 업로드된 쇼츠 검색
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(searchQuery)}&type=video&videoDuration=short&maxResults=50&publishedAfter=${sevenDaysAgo.toISOString()}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const recentShorts = data.items || [];
        const recentCount = recentShorts.length;
        
        // 트렌드 상태 결정
        let trendStatus = 'stable';  // 안정
        if (recentCount > 20) {
            trendStatus = 'hot';  // 🔥 핫함
        } else if (recentCount > 10) {
            trendStatus = 'rising';  // 📈 상승
        } else if (recentCount < 3) {
            trendStatus = 'cold';  // ❄️ 침체
        }
        
        return {
            recentCount: recentCount,
            trendStatus: trendStatus,
            trendIcon: getTrendIcon(trendStatus),
            daysAnalyzed: 7
        };
        
    } catch (error) {
        console.error('트렌드 분석 실패:', error);
        showToast('분석 실패', '트렌드 분석에 실패했습니다.', 'error');
        return null;
    }
}

/**
 * 트렌드 아이콘
 */
function getTrendIcon(status) {
    const icons = {
        'hot': '🔥',
        'rising': '📈',
        'stable': '➡️',
        'cold': '❄️'
    };
    return icons[status] || '➡️';
}

// ===========================================
// 4. 실시간 조회수 (현재는 불가 - 제한)
// ===========================================

/**
 * 특정 비디오의 조회수 가져오기
 * 참고: YouTube API에서 쇼츠의 조회수는 제한적으로만 제공됨
 */
async function getShortsViewCount(videoId) {
    const apiKey = getYoutubeApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'YouTube API 키를 먼저 입력해주세요.', 'error');
        return null;
    }
    
    try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoId}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            return {
                viewCount: parseInt(data.items[0].statistics.viewCount || 0),
                likeCount: parseInt(data.items[0].statistics.likeCount || 0),
                commentCount: parseInt(data.items[0].statistics.commentCount || 0)
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('조회수 가져오기 실패:', error);
        return null;
    }
}

// ===========================================
// 5. 자동 업데이트 (24시간마다)
// ===========================================

let autoUpdateInterval = null;

/**
 * 자동 업데이트 시작
 */
function startAutoUpdate() {
    const apiKey = getYoutubeApiKey();
    
    if (!apiKey) {
        showToast('API 키 필요', 'YouTube API 키를 먼저 입력해주세요.', 'error');
        return;
    }
    
    // 기존 인터벌 제거
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
    }
    
    // 24시간마다 자동 업데이트
    autoUpdateInterval = setInterval(async () => {
        console.log('🔄 자동 업데이트 시작... (' + new Date().toLocaleString() + ')');
        await autoCollectAllShortsData();
        console.log('✅ 자동 업데이트 완료!');
    }, 24 * 60 * 60 * 1000); // 24시간
    
    // localStorage에 상태 저장
    localStorage.setItem('autoUpdateEnabled', 'true');
    
    showToast('자동 업데이트 시작', '24시간마다 자동으로 쇼츠 데이터를 업데이트합니다.', 'success');
}

/**
 * 자동 업데이트 중지
 */
function stopAutoUpdate() {
    if (autoUpdateInterval) {
        clearInterval(autoUpdateInterval);
        autoUpdateInterval = null;
    }
    
    localStorage.setItem('autoUpdateEnabled', 'false');
    
    showToast('자동 업데이트 중지', '자동 업데이트가 중지되었습니다.', 'success');
}

/**
 * 자동 업데이트 상태 확인
 */
function isAutoUpdateEnabled() {
    return localStorage.getItem('autoUpdateEnabled') === 'true';
}

// ===========================================
// 유틸리티
// ===========================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===========================================
// UI 함수들
// ===========================================

/**
 * YouTube 메뉴 토글
 */
function toggleYouTubeMenu() {
    const menu = document.getElementById('youtubeMenu');
    menu.classList.toggle('hidden');
}

/**
 * 자동 업데이트 토글
 */
function toggleAutoUpdate() {
    if (isAutoUpdateEnabled()) {
        stopAutoUpdate();
        document.getElementById('autoUpdateText').textContent = '자동 업데이트 시작';
    } else {
        startAutoUpdate();
        document.getElementById('autoUpdateText').textContent = '자동 업데이트 중지';
    }
    toggleYouTubeMenu(); // 메뉴 닫기
}

// 페이지 로드 시 자동 업데이트 재개
document.addEventListener('DOMContentLoaded', function() {
    if (isAutoUpdateEnabled() && getYoutubeApiKey()) {
        console.log('✅ 자동 업데이트 재개');
        startAutoUpdate();
        
        // UI 업데이트
        const autoUpdateText = document.getElementById('autoUpdateText');
        if (autoUpdateText) {
            autoUpdateText.textContent = '자동 업데이트 중지';
        }
    }
});

// 메뉴 외부 클릭 시 닫기
document.addEventListener('click', function(e) {
    const menu = document.getElementById('youtubeMenu');
    const btn = document.getElementById('youtubeMenuBtn');
    
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

console.log('✅ youtube-api.js 로드 완료');
