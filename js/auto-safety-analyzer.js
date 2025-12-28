/**
 * 자동 안전도 + 경쟁력 분석 시스템
 * YouTube API를 사용하여 자동으로 안전도와 경쟁력 점수 계산
 */

/**
 * YouTube 검색 결과 분석
 * @param {String} title - 작품 제목
 * @param {String} type - 'movies' or 'dramas'
 * @returns {Object} - 분석 결과
 */
async function analyzeYouTubeShorts(title, type = 'movies') {
    try {
        const apiKey = localStorage.getItem('youtube_api_key');
        if (!apiKey) {
            throw new Error('YouTube API 키가 필요합니다.');
        }
        
        // 검색어 생성 (해시태그 기반)
        const prefix = type === 'dramas' ? '드라마' : '영화';
        const searchQuery = `#${prefix} #${title} shorts`;
        
        console.log(`🔍 분석 시작: "${searchQuery}" (해시태그 기반 검색)`);
        
        // 제외 채널 목록 가져오기 (공식 채널 등)
        const excludedChannels = await getExcludedChannels();
        
        // YouTube API 검색
        const searchResults = await searchYouTubeAPI(searchQuery, apiKey);
        
        if (!searchResults || !searchResults.items) {
            throw new Error('검색 결과를 가져올 수 없습니다.');
        }
        
        // 검색 결과 0개 감지 (드라마 쇼츠 없는 경우)
        if (searchResults.items.length === 0) {
            return {
                totalShorts: 0,
                analyzedShorts: 0,
                noVideosFound: true,
                searchQuery,
                message: '쇼츠 영상이 검색되지 않았습니다. 이 작품은 쇼츠 제작이 어려울 수 있습니다.'
            };
        }
        
        // 결과 분석 (공식 채널 제외)
        const analysis = analyzeSearchResults(searchResults, excludedChannels);
        
        // 검색어 저장 (YouTube 바로가기용)
        analysis.searchQuery = searchQuery;
        
        // 채널 구독자 수 조회 (소형 채널 안전도 계산용)
        console.log('👥 채널 정보 조회 중...');
        const channelIds = Array.from(Object.keys(analysis.channelData.channelVideos));
        const channelSubscribers = await getChannelSubscribers(channelIds, apiKey);
        
        // 소형 채널(1만명 이하) 안전도 계산
        const smallChannelSafety = calculateSmallChannelSafety(
            analysis.channelData.channelVideos,
            channelSubscribers
        );
        
        // 결과에 소형 채널 정보 추가
        analysis.smallChannelSafety = smallChannelSafety;
        
        console.log('📊 분석 완료:', analysis);
        console.log('🏪 소형 채널 안전도:', smallChannelSafety);
        
        return analysis;
        
    } catch (error) {
        console.error('❌ 분석 실패:', error);
        throw error;
    }
}

/**
 * YouTube API 검색
 */
async function searchYouTubeAPI(query, apiKey) {
    const url = `https://www.googleapis.com/youtube/v3/search?` +
        `part=snippet&` +
        `q=${encodeURIComponent(query)}&` +
        `type=video&` +
        `videoDuration=short&` + // 쇼츠만 (60초 이하)
        `maxResults=50&` + // 최대 50개
        `key=${apiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`YouTube API 오류: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
}

/**
 * YouTube API로 채널 정보 조회 (구독자 수)
 * @param {Array} channelIds - 채널 ID 배열
 * @param {String} apiKey - YouTube API Key
 * @returns {Object} - { channelId: subscriberCount, ... }
 */
async function getChannelSubscribers(channelIds, apiKey) {
    if (!channelIds || channelIds.length === 0) {
        return {};
    }
    
    // 최대 50개씩 배치 조회 (YouTube API 제한)
    const batchSize = 50;
    const results = {};
    
    for (let i = 0; i < channelIds.length; i += batchSize) {
        const batch = channelIds.slice(i, i + batchSize);
        const url = `https://www.googleapis.com/youtube/v3/channels?` +
            `part=statistics&` +
            `id=${batch.join(',')}&` +
            `key=${apiKey}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`채널 정보 조회 실패: ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            
            if (data.items) {
                data.items.forEach(item => {
                    results[item.id] = parseInt(item.statistics.subscriberCount || 0);
                });
            }
        } catch (error) {
            console.error('채널 정보 조회 오류:', error);
        }
    }
    
    return results;
}

/**
 * 제외 채널 목록 가져오기 (위험 레벨별 분류)
 */
async function getExcludedChannels() {
    try {
        const response = await fetch('tables/excluded_channels?limit=1000');
        if (!response.ok) {
            console.warn('제외 채널 목록 조회 실패');
            return { forbidden: new Map(), warning: new Map() };
        }
        const result = await response.json();
        
        const forbidden = new Map(); // 절대 금지 채널
        const warning = new Map();   // 주의 필요 채널
        
        result.data.forEach(row => {
            const channelInfo = {
                id: row.channel_id,
                name: row.channel_name,
                url: row.channel_url,
                reason: row.reason
            };
            
            if (row.risk_level === 'forbidden') {
                forbidden.set(row.channel_id, channelInfo);
            } else {
                warning.set(row.channel_id, channelInfo);
            }
        });
        
        console.log(`🚫 절대 금지 채널 ${forbidden.size}개, ⚠️ 주의 채널 ${warning.size}개 로드됨`);
        return { forbidden, warning };
    } catch (error) {
        console.error('제외 채널 조회 오류:', error);
        return { forbidden: new Map(), warning: new Map() };
    }
}

/**
 * 검색 결과 분석
 */
function analyzeSearchResults(searchResults, excludedChannels = { forbidden: new Map(), warning: new Map() }) {
    const items = searchResults.items || [];
    const totalResults = searchResults.pageInfo?.totalResults || items.length;
    
    // 채널 분류 감지
    let forbiddenChannels = []; // 절대 금지 채널
    let warningChannels = [];   // 주의 필요 채널
    
    items.forEach(item => {
        const channelId = item.snippet.channelId;
        
        // 절대 금지 채널 확인
        if (excludedChannels.forbidden.has(channelId)) {
            const channelInfo = excludedChannels.forbidden.get(channelId);
            console.log(`🚫 절대 금지 채널 감지: ${item.snippet.channelTitle} (${channelId})`);
            if (!forbiddenChannels.find(c => c.channelId === channelId)) {
                forbiddenChannels.push({
                    channelId,
                    channelName: item.snippet.channelTitle,
                    reason: channelInfo.reason
                });
            }
        }
        
        // 주의 필요 채널 확인
        if (excludedChannels.warning.has(channelId)) {
            const channelInfo = excludedChannels.warning.get(channelId);
            console.log(`⚠️ 주의 채널 감지: ${item.snippet.channelTitle} (${channelId})`);
            if (!warningChannels.find(c => c.channelId === channelId)) {
                warningChannels.push({
                    channelId,
                    channelName: item.snippet.channelTitle,
                    reason: channelInfo.reason
                });
            }
        }
    });
    
    // 모든 항목 분석 (제외하지 않음)
    const filteredItems = items;
    
    console.log(`📊 전체 ${items.length}개 분석 ${forbiddenChannels.length > 0 ? `(🚫 절대금지 ${forbiddenChannels.length}개)` : ''} ${warningChannels.length > 0 ? `(⚠️ 주의 ${warningChannels.length}개)` : ''}`);
    
    // 1. 날짜별 분석 + 채널별 그룹화
    const now = Date.now();
    let oldShorts = 0; // 6개월 이상
    let mediumShorts = 0; // 3~6개월
    let recentShorts = 0; // 3개월 미만
    let oldestDate = null; // 가장 오래된 영상 날짜
    
    // 채널별 정보 (구독자 수 조회용)
    const channelVideos = {}; // { channelId: [video1, video2, ...] }
    const uniqueChannels = new Set();
    
    filteredItems.forEach(item => {
        const publishedAt = new Date(item.snippet.publishedAt).getTime();
        const monthsAgo = (now - publishedAt) / (30 * 24 * 60 * 60 * 1000);
        const channelId = item.snippet.channelId;
        
        // 가장 오래된 날짜 추적
        if (!oldestDate || publishedAt < oldestDate) {
            oldestDate = publishedAt;
        }
        
        // 날짜별 분류
        if (monthsAgo >= 6) {
            oldShorts++;
        } else if (monthsAgo >= 3) {
            mediumShorts++;
        } else {
            recentShorts++;
        }
        
        // 채널별 영상 그룹화
        if (channelId) {
            uniqueChannels.add(channelId);
            if (!channelVideos[channelId]) {
                channelVideos[channelId] = [];
            }
            channelVideos[channelId].push({
                publishedAt,
                monthsAgo
            });
        }
    });
    
    // 2. 소형 채널(1만명 이하) 정보 저장 (나중에 채널 정보 조회 후 계산)
    const channelData = {
        channelVideos,
        totalChannels: uniqueChannels.size
    };
    
    // 3. 안전도 점수 계산 (필터링된 영상 기준)
    const safetyScore = calculateSafetyScore(oldShorts, mediumShorts, filteredItems.length);
    
    // 4. 경쟁력 점수 계산
    const competitionScore = calculateCompetitionScore(totalResults);
    
    // 5. 종합 점수 계산 (안전도 60% + 경쟁력 40%)
    const totalScore = Math.round((safetyScore * 0.6 + competitionScore * 0.4) * 10) / 10;
    
    // 6. 추천 레벨 계산
    const recommendation = getRecommendationLevel(totalScore, safetyScore, competitionScore);
    
    return {
        // 기본 정보
        totalShorts: totalResults,
        analyzedShorts: items.length,
        originalCount: items.length,
        uniqueChannels: uniqueChannels.size,
        
        // 날짜별 분포
        oldShorts,        // 6개월+
        mediumShorts,     // 3~6개월
        recentShorts,     // 3개월 미만
        oldestDate,       // 가장 오래된 영상 날짜
        
        // 채널 정보 (구독자 수 조회용)
        channelData,      // 채널별 영상 정보
        
        // 채널 위험도 정보
        isForbidden: forbiddenChannels.length > 0,       // 절대 금지 채널 있음
        forbiddenChannels,                                // 절대 금지 채널 목록
        hasWarningChannel: warningChannels.length > 0,   // 주의 필요 채널 있음
        warningChannels,                                  // 주의 필요 채널 목록
        
        // 점수
        safetyScore,      // 안전도 (0-10)
        competitionScore, // 경쟁력 (0-10)
        totalScore,       // 종합 (0-10)
        
        // 추천
        recommendation,   // { level, emoji, text, color }
        
        // 분석 시간
        analyzedAt: Date.now()
    };
}

/**
 * 소형 채널(구독자 1만명 이하) 안전도 계산
 * @param {Object} channelVideos - 채널별 영상 정보
 * @param {Object} channelSubscribers - 채널별 구독자 수
 * @returns {Object} - 소형 채널 안전도 정보
 */
function calculateSmallChannelSafety(channelVideos, channelSubscribers) {
    let smallChannelCount = 0; // 1만명 이하 채널 수
    let smallChannelOldVideos = 0; // 1만명 이하 채널의 6개월+ 영상
    let smallChannelTotalVideos = 0; // 1만명 이하 채널의 총 영상
    
    // 각 채널을 확인
    Object.entries(channelVideos).forEach(([channelId, videos]) => {
        const subscribers = channelSubscribers[channelId] || 0;
        
        // 구독자 1만명 이하인 경우
        if (subscribers <= 10000) {
            smallChannelCount++;
            smallChannelTotalVideos += videos.length;
            
            // 6개월 이상된 영상 카운트
            videos.forEach(video => {
                if (video.monthsAgo >= 6) {
                    smallChannelOldVideos++;
                }
            });
        }
    });
    
    // 소형 채널의 6개월+ 영상 비율
    const safeVideoRatio = smallChannelTotalVideos > 0 
        ? (smallChannelOldVideos / smallChannelTotalVideos) 
        : 0;
    
    // 안전 여부 판단
    const isSafe = smallChannelOldVideos > 0; // 1개라도 있으면 일단 안전 신호
    
    return {
        smallChannelCount,           // 1만명 이하 채널 수
        smallChannelOldVideos,       // 6개월+ 영상 개수
        smallChannelTotalVideos,     // 총 영상 개수
        safeVideoRatio,              // 6개월+ 비율
        isSafe,                      // 안전 여부
        message: isSafe 
            ? `소형 채널(1만명↓) ${smallChannelCount}개 중 6개월+ 영상 ${smallChannelOldVideos}개 확인` 
            : `소형 채널(1만명↓)에서 6개월+ 영상을 찾지 못했습니다`
    };
}

/**
 * 안전도 점수 계산
 * 6개월 이상 된 영상이 많을수록 안전
 */
function calculateSafetyScore(oldShorts, mediumShorts, totalShorts) {
    if (totalShorts === 0) {
        return 0; // 데이터 없음
    }
    
    // 6개월+ 영상 비율
    const oldRatio = oldShorts / totalShorts;
    // 3개월+ 영상 비율
    const mediumRatio = (oldShorts + mediumShorts) / totalShorts;
    
    let score = 0;
    
    // 6개월+ 비율에 따른 점수 (0-7점)
    if (oldRatio >= 0.8) score = 7;      // 80%+ 오래된 영상
    else if (oldRatio >= 0.6) score = 6; // 60%+
    else if (oldRatio >= 0.4) score = 5; // 40%+
    else if (oldRatio >= 0.2) score = 4; // 20%+
    else score = 3;
    
    // 3개월+ 비율 보너스 (0-3점)
    if (mediumRatio >= 0.9) score += 3;
    else if (mediumRatio >= 0.7) score += 2;
    else if (mediumRatio >= 0.5) score += 1;
    
    return Math.min(score, 10);
}

/**
 * 경쟁력 점수 계산
 * 쇼츠 개수가 적을수록 높은 점수
 */
function calculateCompetitionScore(totalShorts) {
    if (totalShorts === 0) return 10;        // 블루오션!
    if (totalShorts < 10) return 9;          // 거의 없음
    if (totalShorts < 30) return 8;          // 매우 적음
    if (totalShorts < 50) return 7;          // 적음
    if (totalShorts < 100) return 6;         // 보통
    if (totalShorts < 200) return 5;         // 약간 많음
    if (totalShorts < 500) return 4;         // 많음
    if (totalShorts < 1000) return 2;        // 매우 많음
    return 0;                                 // 레드오션
}

/**
 * 추천 레벨 계산
 */
function getRecommendationLevel(totalScore, safetyScore, competitionScore) {
    // S급: 종합 9+ 또는 (안전도 8+ & 경쟁력 8+)
    if (totalScore >= 9 || (safetyScore >= 8 && competitionScore >= 8)) {
        return {
            level: 'S',
            emoji: '🌟',
            text: `종합점수 ${totalScore.toFixed(1)}점`,
            description: '안전하고 경쟁도 낮음',
            color: 'bg-gradient-to-r from-yellow-400 to-orange-500'
        };
    }
    
    // A급: 종합 8+
    if (totalScore >= 8) {
        return {
            level: 'A',
            emoji: '✨',
            text: `종합점수 ${totalScore.toFixed(1)}점`,
            description: '제작하기 좋은 작품',
            color: 'bg-gradient-to-r from-green-400 to-blue-500'
        };
    }
    
    // B급: 종합 7+
    if (totalScore >= 7) {
        return {
            level: 'B',
            emoji: '👍',
            text: `종합점수 ${totalScore.toFixed(1)}점`,
            description: '괜찮은 선택입니다',
            color: 'bg-gradient-to-r from-blue-400 to-cyan-500'
        };
    }
    
    // C급: 종합 6+
    if (totalScore >= 6) {
        return {
            level: 'C',
            emoji: '🤔',
            text: `종합점수 ${totalScore.toFixed(1)}점`,
            description: '신중하게 선택하세요',
            color: 'bg-gradient-to-r from-gray-400 to-gray-500'
        };
    }
    
    // D급: 종합 5+
    if (totalScore >= 5) {
        return {
            level: 'D',
            emoji: '⚠️',
            text: `종합점수 ${totalScore.toFixed(1)}점`,
            description: '리스크가 있을 수 있어요',
            color: 'bg-gradient-to-r from-yellow-500 to-orange-600'
        };
    }
    
    // F급: 종합 5 미만
    return {
        level: 'F',
        emoji: '❌',
        text: `종합점수 ${totalScore.toFixed(1)}점`,
        description: '다른 작품을 찾아보세요',
        color: 'bg-gradient-to-r from-red-500 to-pink-600'
    };
}

/**
 * 분석 결과 UI 렌더링
 */
function renderAutoAnalysisResult(analysis) {
    // 검색 결과 0개인 경우 (드라마 쇼츠 없음)
    if (analysis.noVideosFound) {
        return `
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 border-2 border-gray-300 mb-4">
                <div class="text-center">
                    <div class="text-6xl mb-4">🚫</div>
                    <h3 class="text-xl font-bold text-gray-800 mb-2">평가 불가</h3>
                    <p class="text-gray-600 mb-4">${analysis.message}</p>
                    <div class="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-left">
                        <div class="flex items-start gap-2">
                            <i class="fas fa-exclamation-triangle text-yellow-600 mt-1"></i>
                            <div class="text-sm text-gray-700">
                                <p class="font-semibold mb-2">이런 경우일 수 있습니다:</p>
                                <ul class="list-disc list-inside space-y-1 ml-2">
                                    <li>드라마 영상을 쇼츠로 만든 경우가 없음</li>
                                    <li>저작권 문제로 모두 삭제됨</li>
                                    <li>제목이 특이해서 검색이 안 됨</li>
                                </ul>
                                <p class="mt-3 font-medium text-orange-700">
                                    ⚠️ 이 작품은 쇼츠 제작이 매우 위험할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="mt-4">
                        <button 
                            onclick="openYouTubeSearch('${analysis.searchQuery || ''}')"
                            class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                            <i class="fab fa-youtube text-xl"></i>
                            <span>YouTube에서 직접 확인하기</span>
                            <i class="fas fa-external-link-alt text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }
    
    const safetyPercent = analysis.safetyScore * 10;
    const competitionPercent = analysis.competitionScore * 10;
    const totalPercent = analysis.totalScore * 10;
    
    const oldRatio = analysis.analyzedShorts > 0 
        ? Math.round((analysis.oldShorts / analysis.analyzedShorts) * 100)
        : 0;
    
    return `
        <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 border-2 border-purple-200 mb-4">
            <!-- 헤더 -->
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-lg font-bold text-gray-900">
                    <i class="fas fa-robot text-purple-600 mr-2"></i>AI 자동 분석 결과
                </h3>
                <span class="text-xs text-gray-500">
                    <i class="fas fa-clock mr-1"></i>${getTimeAgo(Date.now() - analysis.analyzedAt)}
                </span>
            </div>
            
            ${analysis.isForbidden ? `
            <!-- 절대 금지 경고 -->
            <div class="bg-red-100 border-2 border-red-500 rounded-lg p-4 mb-4">
                <div class="flex items-start gap-3">
                    <i class="fas fa-ban text-red-600 text-3xl mt-1"></i>
                    <div class="flex-1">
                        <h4 class="font-bold text-red-800 text-xl mb-2">🚫 절대 제작 금지</h4>
                        <p class="text-red-700 font-bold mb-3">
                            이 작품은 저작권 관리가 엄격한 채널에 쇼츠가 올라와 있어 <strong>절대 제작하면 안 됩니다!</strong>
                        </p>
                        <div class="bg-white rounded p-3 mt-2 border-2 border-red-300">
                            <p class="text-sm text-gray-700 mb-2"><strong>🚫 감지된 금지 채널:</strong></p>
                            <ul class="list-disc list-inside text-sm text-red-700 font-semibold space-y-1">
                                ${analysis.forbiddenChannels.map(c => `<li>${c.channelName}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="bg-red-50 rounded p-3 mt-3">
                            <p class="text-sm text-red-800 font-semibold">
                                ⚠️ <strong>경고:</strong> 이 채널들은 저작권을 매우 엄격하게 관리합니다. 쇼츠 제작 시 <strong>즉시 저작권 신고 및 계정 정지</strong> 위험이 있습니다!
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${analysis.hasWarningChannel ? `
            <!-- 주의 필요 경고 -->
            <div class="bg-orange-100 border-2 border-orange-500 rounded-lg p-4 mb-4">
                <div class="flex items-start gap-3">
                    <i class="fas fa-exclamation-triangle text-orange-600 text-2xl mt-1"></i>
                    <div class="flex-1">
                        <h4 class="font-bold text-orange-800 text-lg mb-2">⚠️ 주의 필요</h4>
                        <p class="text-orange-700 font-semibold mb-2">
                            이 작품은 공식 채널에도 쇼츠가 올라와 있습니다. 일부 작품은 위험할 수 있으니 <strong>신중하게 판단</strong>하세요.
                        </p>
                        <div class="bg-white rounded p-3 mt-2">
                            <p class="text-sm text-gray-700 mb-1"><strong>⚠️ 감지된 공식 채널:</strong></p>
                            <ul class="list-disc list-inside text-sm text-orange-600">
                                ${analysis.warningChannels.map(c => `<li>${c.channelName}</li>`).join('')}
                            </ul>
                        </div>
                        <p class="text-xs text-orange-600 mt-2">
                            💡 <strong>팁:</strong> 공식 채널에 있어도 일부 작품은 제작 가능할 수 있습니다. YouTube에서 직접 확인하고 일반 채널의 쇼츠를 참고하세요.
                        </p>
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- 추천 배지 -->
            <div class="${analysis.recommendation.color} text-white rounded-lg p-4 mb-4 text-center">
                <div class="text-3xl mb-2">${analysis.recommendation.emoji}</div>
                <div class="text-xl font-bold">${analysis.recommendation.level}급 - ${analysis.recommendation.text}</div>
                <div class="text-sm mt-1 opacity-90">${analysis.recommendation.description}</div>
            </div>
            
            <!-- 종합 점수 -->
            <div class="bg-white rounded-lg p-4 mb-4 border-2 border-purple-300">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">⭐ 종합 점수</span>
                    <span class="text-2xl font-bold text-purple-600">${analysis.totalScore}점</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-4">
                    <div class="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all" 
                        style="width: ${totalPercent}%"></div>
                </div>
                <div class="text-xs text-gray-500 mt-1 text-right">
                    안전도 60% + 경쟁력 40%
                </div>
            </div>
            
            <!-- 안전도 점수 -->
            <div class="bg-white rounded-lg p-4 mb-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">
                        <i class="fas fa-shield-alt text-green-600 mr-1"></i>안전도
                    </span>
                    <span class="text-xl font-bold text-green-600">${analysis.safetyScore}점</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div class="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full transition-all" 
                        style="width: ${safetyPercent}%"></div>
                </div>
                <div class="text-xs text-gray-600 space-y-1">
                    ${analysis.oldestDate ? `
                    <div class="flex justify-between mb-2 pb-2 border-b border-gray-200">
                        <span class="font-semibold text-gray-700">📅 가장 오래된 영상:</span>
                        <span class="font-medium text-green-600">${new Date(analysis.oldestDate).toLocaleDateString('ko-KR')} (${Math.floor((Date.now() - analysis.oldestDate) / (30 * 24 * 60 * 60 * 1000))}개월 전)</span>
                    </div>
                    ` : ''}
                    <div class="flex justify-between">
                        <span>• 6개월+ 영상:</span>
                        <span class="font-medium ${analysis.oldShorts > 0 ? 'text-green-600' : ''}">${analysis.oldShorts}개 (${oldRatio}%)</span>
                    </div>
                    <div class="flex justify-between">
                        <span>• 3~6개월 영상:</span>
                        <span class="font-medium">${analysis.mediumShorts}개</span>
                    </div>
                    <div class="flex justify-between">
                        <span>• 최근 영상:</span>
                        <span class="font-medium">${analysis.recentShorts}개</span>
                    </div>
                    ${analysis.smallChannelSafety ? `
                    <div class="mt-2 pt-2 border-t border-gray-200 ${analysis.smallChannelSafety.isSafe ? 'bg-green-50' : 'bg-orange-50'} rounded p-2">
                        <div class="flex items-start gap-1">
                            <i class="fas ${analysis.smallChannelSafety.isSafe ? 'fa-check-circle text-green-600' : 'fa-exclamation-triangle text-orange-600'} mt-0.5"></i>
                            <div class="leading-tight">
                                <div class="font-semibold ${analysis.smallChannelSafety.isSafe ? 'text-green-700' : 'text-orange-700'} mb-1">
                                    소형 채널 안전도 ${analysis.smallChannelSafety.isSafe ? '✅' : '⚠️'}
                                </div>
                                <div class="text-xs ${analysis.smallChannelSafety.isSafe ? 'text-green-600' : 'text-orange-600'}">
                                    ${analysis.smallChannelSafety.message}
                                    ${analysis.smallChannelSafety.isSafe ? `
                                    <div class="mt-1">
                                        <span class="inline-block bg-white px-2 py-0.5 rounded text-green-700 font-medium">
                                            ${Math.round(analysis.smallChannelSafety.safeVideoRatio * 100)}% (${analysis.smallChannelSafety.smallChannelOldVideos}/${analysis.smallChannelSafety.smallChannelTotalVideos}개)
                                        </span>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : `
                    ${analysis.oldShorts > 0 ? `
                    <div class="mt-2 pt-2 border-t border-gray-200">
                        <div class="flex items-start gap-1">
                            <i class="fas fa-info-circle text-blue-600 mt-0.5"></i>
                            <span class="text-blue-700 leading-tight">
                                <strong>안전도 기준:</strong> 구독자 1만명 이하 소형 채널의 6개월+ 영상이 중요합니다. 
                                ${oldRatio >= 50 ? '현재 비율이 높아 안전도가 높습니다! ✅' : '비율을 확인하고 개별 영상을 체크하세요.'}
                            </span>
                        </div>
                    </div>
                    ` : `
                    <div class="mt-2 pt-2 border-t border-gray-200">
                        <div class="flex items-start gap-1">
                            <i class="fas fa-exclamation-triangle text-orange-600 mt-0.5"></i>
                            <span class="text-orange-700 leading-tight">
                                <strong>주의:</strong> 6개월 이상 경과된 영상이 없습니다. 저작권 리스크가 있을 수 있으니 신중하게 판단하세요.
                            </span>
                        </div>
                    </div>
                    `}
                    `}
                </div>
            </div>
            
            <!-- 경쟁력 점수 -->
            <div class="bg-white rounded-lg p-4 mb-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-semibold text-gray-700">
                        <i class="fas fa-trophy text-blue-600 mr-1"></i>경쟁력
                    </span>
                    <span class="text-xl font-bold text-blue-600">${analysis.competitionScore}점</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-3 mb-2">
                    <div class="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all" 
                        style="width: ${competitionPercent}%"></div>
                </div>
                <div class="text-xs text-gray-600 space-y-1">
                    <div class="flex justify-between">
                        <span>• 총 쇼츠 수:</span>
                        <span class="font-medium">${analysis.totalShorts}개</span>
                    </div>
                    <div class="flex justify-between">
                        <span>• 고유 채널 수:</span>
                        <span class="font-medium">${analysis.uniqueChannels}개</span>
                    </div>
                    <div class="flex justify-between">
                        <span>• 경쟁 정도:</span>
                        <span class="font-medium">${getCompetitionText(analysis.totalShorts)}</span>
                    </div>
                </div>
            </div>
            
            <!-- 안내 문구 -->
            <div class="bg-blue-50 rounded-lg p-3 text-xs text-gray-700">
                <i class="fas fa-info-circle text-blue-600 mr-1"></i>
                <strong>분석 기준:</strong> YouTube에서 검색된 쇼츠 ${analysis.analyzedShorts}개를 분석했습니다.
                ${analysis.totalShorts > analysis.analyzedShorts ? 
                    `(전체 약 ${analysis.totalShorts}개 중)` : ''}
                ${analysis.isForbidden ? `
                <div class="mt-2 pt-2 border-t border-red-200">
                    <i class="fas fa-ban text-red-600 mr-1"></i>
                    <span class="text-red-700 font-bold">절대 금지 채널 ${analysis.forbiddenChannels.length}개 감지됨</span>
                    <span class="text-gray-600"> - 이 작품은 제작하면 안 됩니다!</span>
                </div>
                ` : ''}
                ${analysis.hasWarningChannel ? `
                <div class="mt-2 pt-2 border-t border-orange-200">
                    <i class="fas fa-exclamation-triangle text-orange-600 mr-1"></i>
                    <span class="text-orange-700 font-medium">주의 채널 ${analysis.warningChannels.length}개 감지됨</span>
                    <span class="text-gray-600"> - 신중하게 판단하세요.</span>
                </div>
                ` : ''}
            </div>
            
            <!-- YouTube 바로가기 버튼 -->
            <div class="mt-3">
                <button 
                    onclick="openYouTubeSearch('${analysis.searchQuery || ''}')"
                    class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
                    <i class="fab fa-youtube text-xl"></i>
                    <span>YouTube에서 직접 확인하기</span>
                    <i class="fas fa-external-link-alt text-sm"></i>
                </button>
                <p class="text-xs text-gray-500 text-center mt-2">
                    실제 영상을 확인하고 제작 여부를 결정하세요
                </p>
            </div>
        </div>
    `;
}

/**
 * 경쟁 정도 텍스트
 */
function getCompetitionText(totalShorts) {
    if (totalShorts === 0) return '블루오션 🌊';
    if (totalShorts < 10) return '거의 없음';
    if (totalShorts < 50) return '매우 낮음';
    if (totalShorts < 100) return '낮음';
    if (totalShorts < 200) return '보통';
    if (totalShorts < 500) return '높음';
    if (totalShorts < 1000) return '매우 높음';
    return '레드오션 🔴';
}

/**
 * 하이브리드 점수 계산 (AI + 커뮤니티)
 */
function calculateHybridScore(autoAnalysis, communityRating) {
    if (!autoAnalysis && !communityRating) {
        return null;
    }
    
    // AI 자동 분석만 있는 경우
    if (autoAnalysis && !communityRating) {
        return {
            score: autoAnalysis.totalScore,
            type: 'auto',
            confidence: 'medium'
        };
    }
    
    // 커뮤니티 평가만 있는 경우
    if (!autoAnalysis && communityRating) {
        return {
            score: communityRating.score,
            type: 'community',
            confidence: communityRating.confidence
        };
    }
    
    // 둘 다 있는 경우: 하이브리드
    // AI 40% + 커뮤니티 60%
    const hybridScore = Math.round(
        (autoAnalysis.totalScore * 0.4 + communityRating.score * 0.6) * 10
    ) / 10;
    
    return {
        score: hybridScore,
        type: 'hybrid',
        confidence: 'high',
        autoScore: autoAnalysis.totalScore,
        communityScore: communityRating.score
    };
}

/**
 * 하이브리드 점수 UI 렌더링
 */
function renderHybridScore(hybridResult) {
    if (!hybridResult) return '';
    
    if (hybridResult.type === 'hybrid') {
        return `
            <div class="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg p-4 border-2 border-yellow-300">
                <div class="text-center mb-3">
                    <div class="text-sm font-semibold text-gray-700 mb-2">
                        🏆 최종 추천 점수 (하이브리드)
                    </div>
                    <div class="text-4xl font-bold text-orange-600">${hybridResult.score}점</div>
                    <div class="text-xs text-gray-600 mt-1">
                        AI ${hybridResult.autoScore}점 (40%) + 커뮤니티 ${hybridResult.communityScore}점 (60%)
                    </div>
                </div>
                <div class="flex items-center justify-center gap-2 text-xs">
                    <span class="px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                        <i class="fas fa-check-circle mr-1"></i>높은 신뢰도
                    </span>
                </div>
            </div>
        `;
    }
    
    return '';
}

/**
 * YouTube에서 검색 결과 열기
 */
function openYouTubeSearch(searchQuery) {
    if (!searchQuery) {
        showToast('검색어가 없습니다', 'error');
        return;
    }
    
    // YouTube 검색 URL 생성
    const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    
    // 새 탭에서 열기
    window.open(youtubeSearchUrl, '_blank');
    
    showToast('YouTube에서 확인하세요', 'info');
}

// Export functions to window
if (typeof window !== 'undefined') {
    window.analyzeYouTubeShorts = analyzeYouTubeShorts;
    window.renderAutoAnalysisResult = renderAutoAnalysisResult;
    window.calculateHybridScore = calculateHybridScore;
    window.renderHybridScore = renderHybridScore;
    window.openYouTubeSearch = openYouTubeSearch;
}

console.log('✅ auto-safety-analyzer.js 로드 완료');
