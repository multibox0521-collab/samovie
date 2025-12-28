// Auto Loader - 자동 데이터 로딩 및 캐싱 시스템

/**
 * 자동 로딩 설정
 */
const AUTO_LOAD_CONFIG = {
    initialLoad: 50, // 첫 방문 시 가져올 영화 수
    dailyUpdate: 10, // 매일 추가할 영화 수
    cacheExpiry: 7 * 24 * 60 * 60 * 1000, // 7일 (밀리초)
    dailyExpiry: 24 * 60 * 60 * 1000 // 24시간
};

/**
 * 캐시 데이터 확인
 */
function getCachedData() {
    try {
        const cached = localStorage.getItem('autoMovieCache');
        if (!cached) return null;
        
        const data = JSON.parse(cached);
        const now = Date.now();
        
        // 7일 경과 시 캐시 무효화
        if (now - data.timestamp > AUTO_LOAD_CONFIG.cacheExpiry) {
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('Cache read error:', error);
        return null;
    }
}

/**
 * 캐시 데이터 저장
 */
function saveCachedData(movies, dramas) {
    try {
        const data = {
            timestamp: Date.now(),
            movies: movies,
            dramas: dramas,
            lastDailyUpdate: Date.now()
        };
        localStorage.setItem('autoMovieCache', JSON.stringify(data));
        console.log('✅ 캐시 저장 완료:', movies.length, '영화,', dramas.length, '드라마');
    } catch (error) {
        console.error('Cache save error:', error);
    }
}

/**
 * 자동 데이터 로딩 (첫 방문 또는 캐시 만료 시)
 */
async function autoLoadInitialData() {
    const apiKey = getTmdbApiKey();
    
    if (!apiKey) {
        console.log('⚠️ TMDB API 키가 없습니다. 자동 로딩을 건너뜁니다.');
        showToast('알림', 'API 키를 설정하면 자동으로 작품을 불러옵니다!', 'info');
        return false;
    }
    
    console.log('🚀 자동 데이터 로딩 시작...');
    showToast('데이터 로딩 중', '인기 작품을 자동으로 가져오고 있습니다...', 'info');
    
    try {
        // 한국 영화 30개 + 한국 드라마 20개
        const [movies, dramas] = await Promise.all([
            fetchKoreanMovies(apiKey, 30, 'popular'),
            fetchKoreanTV(apiKey, 20, 'popular')
        ]);
        
        // TMDB ID 기반으로 DB에 저장
        let movieCount = 0;
        let dramaCount = 0;
        
        // 영화 저장
        for (const movie of movies) {
            try {
                const detailUrl = `${TMDB_BASE_URL}/movie/${movie.id}?api_key=${apiKey}&language=ko-KR&append_to_response=credits`;
                const response = await fetch(detailUrl);
                const details = await response.json();
                
                // 중복 체크
                const checkUrl = `tables/movies?limit=1000`;
                const checkResponse = await fetch(checkUrl);
                const checkData = await checkResponse.json();
                const exists = checkData.data?.find(item => item.tmdb_id === details.id.toString());
                
                if (!exists) {
                    const data = prepareItemData(details, false);
                    const saveResponse = await fetch('tables/movies', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    });
                    
                    if (saveResponse.ok) {
                        movieCount++;
                    }
                }
                
                await delay(100); // Rate limiting
            } catch (error) {
                console.error('Movie import error:', error);
            }
        }
        
        // 드라마 저장
        for (const drama of dramas) {
            try {
                const detailUrl = `${TMDB_BASE_URL}/tv/${drama.id}?api_key=${apiKey}&language=ko-KR&append_to_response=credits`;
                const response = await fetch(detailUrl);
                const details = await response.json();
                
                // 중복 체크
                const checkUrl = `tables/dramas?limit=1000`;
                const checkResponse = await fetch(checkUrl);
                const checkData = await checkResponse.json();
                const exists = checkData.data?.find(item => item.tmdb_id === details.id.toString());
                
                if (!exists) {
                    const data = prepareItemData(details, true);
                    const saveResponse = await fetch('tables/dramas', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(data)
                    });
                    
                    if (saveResponse.ok) {
                        dramaCount++;
                    }
                }
                
                await delay(100);
            } catch (error) {
                console.error('Drama import error:', error);
            }
        }
        
        // 캐시 저장
        saveCachedData(movies, dramas);
        
        console.log('✅ 자동 로딩 완료:', movieCount, '영화,', dramaCount, '드라마');
        showToast('완료!', `${movieCount}개 영화, ${dramaCount}개 드라마를 불러왔습니다!`, 'success');
        
        return true;
    } catch (error) {
        console.error('Auto load error:', error);
        showToast('오류', '자동 로딩 중 오류가 발생했습니다.', 'error');
        return false;
    }
}

/**
 * 매일 업데이트 체크
 */
async function checkDailyUpdate() {
    const cached = getCachedData();
    if (!cached) return false;
    
    const now = Date.now();
    const daysSinceUpdate = (now - cached.lastDailyUpdate) / AUTO_LOAD_CONFIG.dailyExpiry;
    
    if (daysSinceUpdate >= 1) {
        console.log('📅 일일 업데이트 실행...');
        await autoLoadInitialData();
        return true;
    }
    
    return false;
}

/**
 * 초기화 - 앱 시작 시 자동 실행
 */
async function initAutoLoader() {
    const cached = getCachedData();
    
    if (!cached) {
        // 첫 방문 또는 캐시 만료
        console.log('🎬 첫 방문 감지 - 자동 데이터 로딩 시작');
        await autoLoadInitialData();
    } else {
        // 일일 업데이트 체크
        await checkDailyUpdate();
        console.log('✅ 캐시 데이터 사용 중');
    }
}

/**
 * 최신 화제작 가져오기 (최근 7일)
 */
async function fetchWeeklyHotMovies() {
    const apiKey = getTmdbApiKey();
    if (!apiKey) return [];
    
    try {
        // 최근 7일 이내 개봉 + 높은 평점
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&language=ko-KR&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=10&primary_release_date.gte=${weekAgo.toISOString().split('T')[0]}&primary_release_date.lte=${today.toISOString().split('T')[0]}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        return data.results?.slice(0, 6) || [];
    } catch (error) {
        console.error('Weekly hot fetch error:', error);
        return [];
    }
}

/**
 * 명작 컬렉션 가져오기 (평점 8.5+)
 */
async function fetchMasterpieces(limit = 20) {
    const apiKey = getTmdbApiKey();
    if (!apiKey) return [];
    
    try {
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&language=ko-KR&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=100&vote_average.gte=8.5`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        return data.results?.slice(0, limit) || [];
    } catch (error) {
        console.error('Masterpieces fetch error:', error);
        return [];
    }
}

/**
 * 과거 명작 가져오기 (2000년 이전)
 */
async function fetchClassicMovies(limit = 20) {
    const apiKey = getTmdbApiKey();
    if (!apiKey) return [];
    
    try {
        const url = `${TMDB_BASE_URL}/discover/movie?api_key=${apiKey}&language=ko-KR&with_original_language=ko&sort_by=vote_average.desc&vote_count.gte=50&primary_release_date.lte=1999-12-31&vote_average.gte=7.5`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        return data.results?.slice(0, limit) || [];
    } catch (error) {
        console.error('Classic movies fetch error:', error);
        return [];
    }
}
