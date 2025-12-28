/**
 * 홈 탭 관리 JavaScript
 * - 오늘의 추천 (날씨 기반)
 * - 이번 달 화제작 (최근 30일 이내 개봉 + 평점 높은 작품)
 * - 명작 컬렉션 (평점 8.0+ 작품)
 * - 과거 명작 (2000년 이전 + 평점 높은 작품)
 */

// 홈 탭 초기화
async function initHomeTab() {
    console.log('🏠 홈 탭 초기화 시작');
    
    try {
        // 운영자 추천 로드 (최우선)
        await loadAdminRecommendations();
        
        // 날씨 기반 추천 로드
        await loadWeatherRecommendations();
        
        // 이번 주 화제작 로드
        await loadWeeklyHot();
        
        // 명작 컬렉션 로드
        await loadMasterpieces();
        
        // 과거 명작 로드
        await loadClassicMovies();
        
        console.log('✅ 홈 탭 초기화 완료');
    } catch (error) {
        console.error('❌ 홈 탭 초기화 실패:', error);
    }
}

// 운영자 추천 작품 로드
async function loadAdminRecommendations() {
    const container = document.getElementById('adminRecommendContent');
    const section = document.getElementById('adminRecommendSection');
    
    if (!container || !section) {
        console.warn('운영자 추천 컨테이너를 찾을 수 없습니다');
        return;
    }
    
    try {
        // 운영자 추천 작품 가져오기 (영화 + 드라마)
        const [moviesResponse, dramasResponse] = await Promise.all([
            fetch('tables/movies?limit=100'),
            fetch('tables/dramas?limit=100')
        ]);
        
        const moviesData = await moviesResponse.json();
        const dramasData = await dramasResponse.json();
        
        const movies = moviesData.data.filter(m => m.admin_recommended).map(m => ({...m, type: 'movies'}));
        const dramas = dramasData.data.filter(d => d.admin_recommended).map(d => ({...d, type: 'dramas'}));
        const recommended = [...movies, ...dramas];
        
        // 추천 작품이 없으면 섹션 숨기기
        if (recommended.length === 0) {
            section.style.display = 'none';
            return;
        }
        
        // 섹션 표시
        section.style.display = 'block';
        
        // 평점순 정렬 후 상위 6개
        recommended.sort((a, b) => {
            const scoreA = a.rating || a.reaction_score || 0;
            const scoreB = b.rating || b.reaction_score || 0;
            return scoreB - scoreA;
        });
        
        const top6 = recommended.slice(0, 6);
        
        // 포스터 카드 렌더링
        container.innerHTML = top6.map(item => window.createPosterCard(item, item.type)).join('');
        
        console.log(`✅ 운영자 추천 ${top6.length}개 로드 완료`);
        
    } catch (error) {
        console.error('운영자 추천 로드 실패:', error);
        section.style.display = 'none';
    }
}

// 날씨 기반 추천 로드
async function loadWeatherRecommendations() {
    const container = document.getElementById('weatherRecommendContent');
    const title = document.getElementById('weatherRecommendTitle');
    
    try {
        // 날씨 정보 가져오기
        const weather = await getCurrentWeather();
        
        // 날씨에 따른 추천 태그 결정
        const tags = getWeatherRecommendTags(weather);
        
        // 제목 업데이트
        const weatherIcon = getWeatherIcon(weather.condition);
        title.innerHTML = `${weatherIcon} ${weather.description}에 어울리는 작품`;
        
        // 글로벌 변수에서 데이터 가져오기
        const allContent = [
            ...(allMovies || []).map(m => ({...m, type: 'movies'})),
            ...(allDramas || []).map(d => ({...d, type: 'dramas'}))
        ];
        
        // 데이터가 없을 때
        if (allContent.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-film text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">작품이 없습니다</h3>
                    <p class="text-gray-500 mb-6">먼저 작품을 추가해주세요!</p>
                    <button onclick="switchTab('mylist')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>작품 추가하기
                    </button>
                </div>
            `;
            return;
        }
        
        // 날씨 태그와 매칭되는 작품 필터링
        const matched = allContent.filter(item => {
            const itemTags = item.emotion_tags || generateEmotionTags(item);
            return tags.some(tag => itemTags.includes(tag));
        });
        
        // 평점순 정렬 후 상위 6개
        matched.sort((a, b) => {
            const scoreA = a.rating || a.reaction_score || 0;
            const scoreB = b.rating || b.reaction_score || 0;
            return scoreB - scoreA;
        });
        
        const recommendations = matched.slice(0, 6);
        
        // 추천 작품이 없으면 섹션 전체 숨기기
        const section = document.getElementById('weatherRecommendSection');
        if (recommendations.length === 0) {
            if (section) section.style.display = 'none';
            return;
        }
        
        // 섹션 표시
        if (section) section.style.display = 'block';
        
        // 포스터 카드 렌더링
        container.innerHTML = recommendations.map(item => createPosterCard(item)).join('');
        
    } catch (error) {
        console.error('날씨 기반 추천 로드 실패:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>추천 작품을 불러오는데 실패했습니다.</p>
            </div>
        `;
    }
}

// 현재 날씨 가져오기
async function getCurrentWeather() {
    // 캐시 확인
    const cached = localStorage.getItem('weatherCache');
    if (cached) {
        const data = JSON.parse(cached);
        const now = Date.now();
        // 3시간 이내 캐시 사용
        if (now - data.timestamp < 3 * 60 * 60 * 1000) {
            console.log('☁️ 캐시된 날씨 사용:', data.weather);
            return data.weather;
        }
    }
    
    try {
        // 위치 정보 가져오기
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        const { latitude, longitude } = position.coords;
        
        // OpenWeatherMap API (무료)
        const API_KEY = 'YOUR_OPENWEATHER_API_KEY'; // 사용자가 설정해야 함
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${API_KEY}&units=metric&lang=kr`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        const weather = {
            condition: data.weather[0].main.toLowerCase(), // clear, rain, clouds, snow, etc.
            description: data.weather[0].description,
            temp: data.main.temp
        };
        
        // 캐시 저장
        localStorage.setItem('weatherCache', JSON.stringify({
            timestamp: Date.now(),
            weather
        }));
        
        console.log('🌤️ 현재 날씨:', weather);
        return weather;
        
    } catch (error) {
        console.warn('날씨 정보 가져오기 실패, 기본값 사용:', error);
        
        // 기본값: 맑음
        return {
            condition: 'clear',
            description: '오늘',
            temp: 20
        };
    }
}

// 날씨에 따른 추천 태그
function getWeatherRecommendTags(weather) {
    const { condition, temp } = weather;
    
    // 날씨별 태그 매핑
    const weatherTagMap = {
        'clear': ['힐링되는', '가족과 함께', '로맨틱한'], // 맑음
        'clouds': ['생각하게 만드는', '영상미 좋은'], // 흐림
        'rain': ['감동적인', '로맨틱한', '생각하게 만드는'], // 비
        'snow': ['힐링되는', '로맨틱한', '영상미 좋은'], // 눈
        'thunderstorm': ['스릴있는', '무서운'], // 천둥번개
        'drizzle': ['감동적인', '생각하게 만드는'] // 이슬비
    };
    
    // 온도별 추가 태그
    if (temp > 28) {
        // 더울 때 - 시원한 느낌
        return [...(weatherTagMap[condition] || []), '무서운', '스릴있는'];
    } else if (temp < 10) {
        // 추울 때 - 따뜻한 느낌
        return [...(weatherTagMap[condition] || []), '힐링되는', '감동적인'];
    }
    
    return weatherTagMap[condition] || ['웃긴', '감동적인'];
}

// 날씨 아이콘 가져오기
function getWeatherIcon(condition) {
    const iconMap = {
        'clear': '<i class="fas fa-sun text-yellow-500"></i>',
        'clouds': '<i class="fas fa-cloud text-gray-500"></i>',
        'rain': '<i class="fas fa-cloud-rain text-blue-500"></i>',
        'snow': '<i class="fas fa-snowflake text-blue-300"></i>',
        'thunderstorm': '<i class="fas fa-bolt text-purple-500"></i>',
        'drizzle': '<i class="fas fa-cloud-rain text-blue-400"></i>'
    };
    
    return iconMap[condition] || '<i class="fas fa-cloud-sun text-yellow-500"></i>';
}

// 최근 화제작 로드 (3개월 이내 개봉 + YouTube Shorts 많은 작품 + 평점 높은 작품)
async function loadWeeklyHot() {
    const container = document.getElementById('weeklyHotContent');
    const title = document.getElementById('weeklyHotTitle');
    
    // 제목 변경
    if (title) {
        title.innerHTML = '<i class="fas fa-fire mr-2 text-orange-500"></i>최근 화제작';
    }
    
    try {
        const allContent = [
            ...(allMovies || []).map(m => ({...m, type: 'movies'})),
            ...(allDramas || []).map(d => ({...d, type: 'dramas'}))
        ];
        
        // 데이터가 없을 때
        if (allContent.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>작품을 먼저 추가해주세요.</p>
                </div>
            `;
            return;
        }
        
        // 최근 3개월 이내 작품 필터링
        const threeMonthsAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const recentContent = allContent.filter(item => {
            return item.release_date && item.release_date > threeMonthsAgo;
        });
        
        // YouTube Shorts가 많고 평점이 높은 순으로 정렬
        recentContent.sort((a, b) => {
            // 1순위: YouTube Shorts 개수 (많을수록 화제작)
            const shortsA = a.shorts_channel_count || 0;
            const shortsB = b.shorts_channel_count || 0;
            
            // 2순위: 평점
            const scoreA = a.rating || a.reaction_score || 0;
            const scoreB = b.rating || b.reaction_score || 0;
            
            // Shorts 개수 차이가 10개 이상이면 Shorts 우선
            if (Math.abs(shortsA - shortsB) >= 10) {
                return shortsB - shortsA;
            }
            
            // 그 외에는 평점 우선
            return scoreB - scoreA;
        });
        
        const topRecent = recentContent.slice(0, 6);
        
        if (topRecent.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>최근 화제작이 없습니다.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = topRecent.map(item => createPosterCard(item)).join('');
        
        console.log(`✅ 최근 화제작 (3개월 이내): 총 ${recentContent.length}개 중 상위 ${topRecent.length}개 표시 (YouTube Shorts 많은 순)`);
        
    } catch (error) {
        console.error('화제작 로드 실패:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <p>화제작을 불러오는데 실패했습니다.</p>
            </div>
        `;
    }
}

// 명작 컬렉션 로드 (로테이션: 운영자 추천 + 평점 8.0+)
async function loadMasterpieces() {
    const container = document.getElementById('masterpiecesContent');
    
    try {
        const allContent = [
            ...(allMovies || []).map(m => ({...m, type: 'movies'})),
            ...(allDramas || []).map(d => ({...d, type: 'dramas'}))
        ];
        
        // 데이터가 없을 때
        if (allContent.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <i class="fas fa-film text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-bold text-gray-700 mb-2">작품이 없습니다</h3>
                    <p class="text-gray-500 mb-6">먼저 작품을 추가해주세요!</p>
                    <button onclick="switchTab('mylist')" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>작품 추가하기
                    </button>
                </div>
            `;
            return;
        }
        
        // 1. 운영자 추천 작품 (최우선)
        const adminRecommended = allContent.filter(item => item.admin_recommended);
        
        // 2. 커뮤니티 안전도 7.0+ 작품 (평점 7.5+)
        const communityVerified = allContent.filter(item => {
            const score = item.rating || item.reaction_score || 0;
            const safetyScore = item.safety_rating_average || 0;
            const safetyCount = item.safety_rating_count || 0;
            return score >= 7.5 && safetyScore >= 7.0 && safetyCount >= 3 && !item.admin_recommended;
        });
        
        // 3. 평점 8.0 이상 작품
        const highRated = allContent.filter(item => {
            const score = item.rating || item.reaction_score || 0;
            const safetyScore = item.safety_rating_average || 0;
            const safetyCount = item.safety_rating_count || 0;
            // 운영자 추천 제외 + 커뮤니티 검증 제외
            return score >= 8.0 && !item.admin_recommended && !(safetyScore >= 7.0 && safetyCount >= 3);
        });
        
        // 커뮤니티 + 평점 합치기
        const combinedQuality = [...communityVerified, ...highRated];
        
        // 평점순 정렬
        combinedQuality.sort((a, b) => {
            const scoreA = a.rating || a.reaction_score || 0;
            const scoreB = b.rating || b.reaction_score || 0;
            return scoreB - scoreA;
        });
        
        // 평점 8.0+ 작품을 랜덤하게 섯플
        const shuffled = combinedQuality.sort(() => Math.random() - 0.5);
        
        // 운영자 추천(5개) + 랜덤 명작(15개) = 총 20개
        const masterpieces = [
            ...adminRecommended.slice(0, 5),
            ...shuffled.slice(0, 15)
        ];
        
        if (masterpieces.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>명작이 없습니다.</p>
                    <button onclick="openBulkImport()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        인기작 가져오기
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = masterpieces.map(item => createPosterCard(item)).join('');
        
        console.log(`✅ 명작 컬렉션: 운영자 추천 ${adminRecommended.slice(0, 5).length}개 + 커뮤니티 검증 ${communityVerified.length}개 + 평점 8.0+ ${highRated.length}개 (랜덤 15개 선정)`);
        
    } catch (error) {
        console.error('명작 로드 실패:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <p>명작을 불러오는데 실패했습니다.</p>
            </div>
        `;
    }
}

// 과거 명작 로드 (2000년 이전 + 평점 높은 작품)
async function loadClassicMovies() {
    const container = document.getElementById('classicMoviesContent');
    
    try {
        const allContent = [
            ...(allMovies || []).map(m => ({...m, type: 'movies'})),
            ...(allDramas || []).map(d => ({...d, type: 'dramas'}))
        ];
        
        // 데이터가 없을 때
        if (allContent.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>작품을 먼저 추가해주세요.</p>
                </div>
            `;
            return;
        }
        
        // 2000년 1월 1일 타임스탬프
        const year2000 = new Date('2000-01-01').getTime();
        
        // 2000년 이전 + 평점 7.5 이상
        const classics = allContent.filter(item => {
            const beforeYear2000 = item.release_date && item.release_date < year2000;
            const goodRating = (item.rating || item.reaction_score || 0) >= 7.5;
            return beforeYear2000 && goodRating;
        });
        
        // 평점순 정렬
        classics.sort((a, b) => {
            const scoreA = a.rating || a.reaction_score || 0;
            const scoreB = b.rating || b.reaction_score || 0;
            return scoreB - scoreA;
        });
        
        const top20 = classics.slice(0, 20);
        
        if (top20.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8 text-gray-500">
                    <p>과거 명작이 없습니다.</p>
                    <p class="text-sm mt-2">2000년 이전 작품을 추가해주세요.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = top20.map(item => createPosterCard(item)).join('');
        
    } catch (error) {
        console.error('과거 명작 로드 실패:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-8 text-red-500">
                <p>과거 명작을 불러오는데 실패했습니다.</p>
            </div>
        `;
    }
}

// 포스터 카드 생성 (공통) - 깔끔한 버전
// createPosterCard 함수는 app.js에서 통합 관리
// home.js에서는 window.createPosterCard를 사용

// 쇼츠 점수 색상 클래스
function getShortsScoreColorClass(score) {
    if (score >= 90) return 'bg-purple-600';
    if (score >= 80) return 'bg-blue-600';
    if (score >= 70) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-gray-600';
}

console.log('✅ home.js 로드 완료');
