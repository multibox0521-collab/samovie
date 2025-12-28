// Weather-based Recommendation - 날씨 기반 추천 시스템

/**
 * 날씨별 추천 태그 매핑
 */
const WEATHER_TAG_MAPPING = {
    'Clear': ['funny', 'thrilling', 'family'], // 맑음
    'Clouds': ['deep', 'thrilling', 'twist'], // 흐림
    'Rain': ['touching', 'romantic', 'healing'], // 비
    'Drizzle': ['touching', 'romantic', 'healing'], // 이슬비
    'Snow': ['family', 'healing', 'romantic'], // 눈
    'Thunderstorm': ['scary', 'thrilling'], // 천둥번개
    'Mist': ['deep', 'beautiful'], // 안개
    'Fog': ['deep', 'beautiful'] // 안개
};

/**
 * 날씨별 메시지
 */
const WEATHER_MESSAGES = {
    'Clear': '☀️ 화창한 날이네요! 기분 좋은 작품은 어떠세요?',
    'Clouds': '☁️ 흐린 날엔 생각할 거리가 있는 작품이 좋죠',
    'Rain': '🌧️ 비 오는 날엔 감성 충만한 작품과 함께',
    'Drizzle': '🌦️ 부슬비 내리는 날, 따뜻한 작품 어때요?',
    'Snow': '❄️ 눈 오는 날엔 포근한 작품이 제격이죠',
    'Thunderstorm': '⛈️ 천둥 번개 치는 날! 스릴 넘치는 작품은?',
    'Mist': '🌫️ 안개 낀 신비로운 날, 깊이 있는 작품',
    'Fog': '🌫️ 안개 낀 신비로운 날, 깊이 있는 작품',
    'default': '🎬 오늘은 어떤 작품을 보시겠어요?'
};

/**
 * 날씨 정보 가져오기 (OpenWeatherMap API)
 * 참고: API 키는 무료로 발급 가능
 */
async function fetchWeatherData() {
    try {
        // localStorage에서 캐시된 날씨 확인 (1시간 유효)
        const cached = localStorage.getItem('weatherCache');
        if (cached) {
            const data = JSON.parse(cached);
            const now = Date.now();
            if (now - data.timestamp < 60 * 60 * 1000) { // 1시간
                return data.weather;
            }
        }
        
        // Geolocation으로 위치 가져오기
        const position = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation not supported'));
            }
            navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        
        const { latitude, longitude } = position.coords;
        
        // OpenWeatherMap API 호출 (무료 API 키 필요)
        // 사용자가 직접 발급해야 함
        const weatherApiKey = getWeatherApiKey();
        
        if (!weatherApiKey) {
            console.log('⚠️ 날씨 API 키가 없습니다. 기본 추천을 사용합니다.');
            return null;
        }
        
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${weatherApiKey}`;
        const response = await fetch(url);
        const data = await response.json();
        
        const weather = data.weather?.[0]?.main || 'default';
        
        // 캐시 저장
        localStorage.setItem('weatherCache', JSON.stringify({
            timestamp: Date.now(),
            weather: weather
        }));
        
        return weather;
    } catch (error) {
        console.log('날씨 정보를 가져올 수 없습니다:', error.message);
        return null;
    }
}

/**
 * Weather API 키 가져오기
 */
function getWeatherApiKey() {
    return localStorage.getItem('weatherApiKey') || null;
}

/**
 * Weather API 키 저장
 */
function saveWeatherApiKey(key) {
    localStorage.setItem('weatherApiKey', key);
}

/**
 * 날씨 기반 추천 작품 생성
 */
async function getWeatherBasedRecommendations(allMovies, allDramas, count = 6) {
    const weather = await fetchWeatherData();
    const allContent = [...allMovies, ...allDramas];
    
    if (!weather || !WEATHER_TAG_MAPPING[weather]) {
        // 날씨 정보 없으면 평점 높은 순으로
        return {
            items: allContent
                .sort((a, b) => {
                    const ratingA = a.rating || a.reaction_score || 0;
                    const ratingB = b.rating || b.reaction_score || 0;
                    return ratingB - ratingA;
                })
                .slice(0, count),
            message: WEATHER_MESSAGES.default,
            weather: 'default'
        };
    }
    
    // 날씨에 맞는 감정 태그
    const targetTags = WEATHER_TAG_MAPPING[weather];
    
    // 태그 매칭 작품 찾기
    const filtered = allContent
        .map(item => {
            const itemTags = generateEmotionTags(item);
            const matchCount = targetTags.filter(tag => itemTags.includes(tag)).length;
            return {
                ...item,
                weatherMatchScore: matchCount
            };
        })
        .filter(item => item.weatherMatchScore > 0)
        .sort((a, b) => {
            // 매칭 점수 우선, 그 다음 평점
            if (b.weatherMatchScore !== a.weatherMatchScore) {
                return b.weatherMatchScore - a.weatherMatchScore;
            }
            const ratingA = a.rating || a.reaction_score || 0;
            const ratingB = b.rating || b.reaction_score || 0;
            return ratingB - ratingA;
        })
        .slice(0, count);
    
    return {
        items: filtered,
        message: WEATHER_MESSAGES[weather],
        weather: weather
    };
}

/**
 * 날씨 정보 표시 UI
 */
function displayWeatherInfo(weather) {
    const icons = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Drizzle': '🌦️',
        'Snow': '❄️',
        'Thunderstorm': '⛈️',
        'Mist': '🌫️',
        'Fog': '🌫️',
        'default': '🎬'
    };
    
    return icons[weather] || icons.default;
}
