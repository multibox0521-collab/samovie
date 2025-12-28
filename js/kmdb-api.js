/**
 * KMDB (한국영화데이터베이스) API 연동
 * https://www.kmdb.or.kr
 * 
 * KMDB는 한국 고전영화 데이터가 풍부합니다.
 * 2000년 이전 한국영화 데이터를 보완하기 위해 사용합니다.
 */

const KMDB_BASE_URL = 'https://api.koreafilm.or.kr/openapi-data2/wisenut/search_api/search_json2.jsp';

/**
 * KMDB API 키 저장/불러오기
 */
function getKmdbApiKey() {
    return localStorage.getItem('kmdb_api_key') || '';
}

function setKmdbApiKey(key) {
    localStorage.setItem('kmdb_api_key', key);
}

/**
 * KMDB에서 한국 고전영화 검색
 * @param {Object} options - 검색 옵션
 * @param {number} options.releaseDts - 개봉 시작년도 (예: 1960)
 * @param {number} options.releaseDte - 개봉 종료년도 (예: 1999)
 * @param {number} options.listCount - 가져올 개수 (기본: 100)
 * @param {string} options.sort - 정렬 (prodYear: 제작년도순, title: 제목순)
 * @returns {Array} 영화 목록
 */
async function fetchKmdbMovies(options = {}) {
    const apiKey = getKmdbApiKey();
    
    if (!apiKey) {
        console.warn('⚠️ KMDB API 키가 없습니다. 설정에서 입력해주세요.');
        return [];
    }
    
    const {
        releaseDts = 1960,  // 1960년부터
        releaseDte = 1999,  // 1999년까지
        listCount = 100,
        sort = 'prodYear',
        nation = '한국'
    } = options;
    
    try {
        // KMDB API 파라미터
        const params = new URLSearchParams({
            collection: 'kmdb_new2',
            ServiceKey: apiKey,
            detail: 'Y',
            releaseDts: releaseDts.toString(),
            releaseDte: releaseDte.toString(),
            nation: nation,
            listCount: listCount.toString(),
            sort: sort
        });
        
        const url = `${KMDB_BASE_URL}?${params.toString()}`;
        console.log('🎬 KMDB API 호출:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`KMDB API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        
        // KMDB 응답 구조: { Data: [{ Result: [...] }] }
        const results = data.Data?.[0]?.Result || [];
        
        console.log(`✅ KMDB에서 ${results.length}개 영화 가져옴`);
        
        // TMDB 형식으로 변환
        return results.map(movie => convertKmdbToTmdbFormat(movie));
        
    } catch (error) {
        console.error('❌ KMDB API 오류:', error);
        return [];
    }
}

/**
 * KMDB 데이터를 TMDB 형식으로 변환
 * KMDB와 TMDB의 데이터 구조가 다르므로 통일된 형식으로 변환
 */
function convertKmdbToTmdbFormat(kmdbMovie) {
    // KMDB 데이터 구조 파싱
    const title = kmdbMovie.title?.replaceAll('!HS', '').replaceAll('!HE', '').trim() || '';
    const titleEn = kmdbMovie.titleEng || '';
    const directors = kmdbMovie.directors?.director?.[0]?.directorNm || '';
    const actors = kmdbMovie.actors?.actor?.slice(0, 5).map(a => a.actorNm).join(', ') || '';
    const plot = kmdbMovie.plots?.plot?.[0]?.plotText || '';
    const genre = kmdbMovie.genre || '';
    const releaseDate = kmdbMovie.repRlsDate || '';
    const runtime = kmdbMovie.runtime ? parseInt(kmdbMovie.runtime) : 0;
    const rating = kmdbMovie.rating ? parseFloat(kmdbMovie.rating) : 0;
    const posterUrl = kmdbMovie.posters?.split('|')?.[0] || '';
    const prodYear = kmdbMovie.prodYear || '';
    const company = kmdbMovie.company || '';
    
    // 개봉일 형식 변환: YYYYMMDD -> YYYY-MM-DD
    let formattedReleaseDate = '';
    if (releaseDate && releaseDate.length === 8) {
        formattedReleaseDate = `${releaseDate.substring(0, 4)}-${releaseDate.substring(4, 6)}-${releaseDate.substring(6, 8)}`;
    }
    
    return {
        id: `kmdb_${kmdbMovie.DOCID}`, // KMDB ID로 고유 ID 생성
        title: title,
        title_en: titleEn,
        release_date: formattedReleaseDate || `${prodYear}-01-01`,
        rating: rating || 7.5, // KMDB에 평점 없으면 기본 7.5
        actors: actors,
        director: directors,
        genre: genre,
        poster_url: posterUrl,
        plot: plot,
        runtime: runtime,
        production_companies: company,
        vote_average: rating || 7.5,
        vote_count: 0, // KMDB는 투표 수 없음
        source: 'kmdb', // 출처 표시
        kmdb_id: kmdbMovie.DOCID
    };
}

/**
 * KMDB로 특정 영화 검색
 * @param {string} title - 영화 제목
 * @returns {Array} 검색 결과
 */
async function searchKmdbMovie(title) {
    const apiKey = getKmdbApiKey();
    
    if (!apiKey) {
        console.warn('⚠️ KMDB API 키가 없습니다.');
        return [];
    }
    
    try {
        const params = new URLSearchParams({
            collection: 'kmdb_new2',
            ServiceKey: apiKey,
            detail: 'Y',
            title: title,
            listCount: '20'
        });
        
        const url = `${KMDB_BASE_URL}?${params.toString()}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`KMDB API 오류: ${response.status}`);
        }
        
        const data = await response.json();
        const results = data.Data?.[0]?.Result || [];
        
        return results.map(movie => convertKmdbToTmdbFormat(movie));
        
    } catch (error) {
        console.error('❌ KMDB 검색 오류:', error);
        return [];
    }
}

/**
 * KMDB 한국 고전영화 자동 수집 (1960-1999)
 * 평점 높은 순으로 정렬
 */
async function fetchKmdbClassicMovies() {
    const apiKey = getKmdbApiKey();
    
    if (!apiKey) {
        console.warn('⚠️ KMDB API 키가 없습니다. 관리자 페이지에서 설정해주세요.');
        console.log('📌 KMDB API 발급: https://www.kmdb.or.kr/info/api/apiDetail/6');
        return [];
    }
    
    console.log('🎬 KMDB에서 한국 고전영화 가져오는 중...');
    
    // 1960년대부터 1990년대까지 각 10년씩 가져오기
    const decades = [
        { start: 1960, end: 1969, count: 30 },
        { start: 1970, end: 1979, count: 30 },
        { start: 1980, end: 1989, count: 30 },
        { start: 1990, end: 1999, count: 30 }
    ];
    
    let allMovies = [];
    
    for (const decade of decades) {
        const movies = await fetchKmdbMovies({
            releaseDts: decade.start,
            releaseDte: decade.end,
            listCount: decade.count,
            sort: 'prodYear'
        });
        
        allMovies = allMovies.concat(movies);
        
        // API 호출 간격 (Rate limiting 방지)
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`✅ KMDB에서 총 ${allMovies.length}개 고전영화 수집 완료!`);
    
    // 평점 높은 순으로 정렬
    allMovies.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    
    return allMovies;
}

/**
 * KMDB 영화를 DB에 저장
 * @param {Array} movies - KMDB 영화 목록
 * @param {string} table - 저장할 테이블 (movies 또는 dramas)
 * @returns {Object} { success: number, failed: number }
 */
async function saveKmdbMoviesToDB(movies, table = 'movies') {
    let success = 0;
    let failed = 0;
    
    for (const movie of movies) {
        try {
            // 중복 체크: title + release_date
            const checkUrl = `tables/${table}?search=${encodeURIComponent(movie.title)}&limit=1`;
            const checkResponse = await fetch(checkUrl);
            const checkData = await checkResponse.json();
            
            // 같은 제목 + 같은 년도 = 중복
            const isDuplicate = checkData.data.some(existing => {
                const existingYear = existing.release_date?.substring(0, 4);
                const newYear = movie.release_date?.substring(0, 4);
                return existing.title === movie.title && existingYear === newYear;
            });
            
            if (isDuplicate) {
                console.log(`⏭️ 중복: ${movie.title} (${movie.release_date})`);
                continue;
            }
            
            // 저장
            const response = await fetch(`tables/${table}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(movie)
            });
            
            if (response.ok) {
                success++;
                console.log(`✅ 저장: ${movie.title} (${movie.release_date})`);
            } else {
                failed++;
                console.error(`❌ 저장 실패: ${movie.title}`);
            }
            
            // API Rate limiting 방지
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            failed++;
            console.error(`❌ 오류: ${movie.title}`, error);
        }
    }
    
    return { success, failed };
}

// Export to window
window.getKmdbApiKey = getKmdbApiKey;
window.setKmdbApiKey = setKmdbApiKey;
window.fetchKmdbMovies = fetchKmdbMovies;
window.searchKmdbMovie = searchKmdbMovie;
window.fetchKmdbClassicMovies = fetchKmdbClassicMovies;
window.saveKmdbMoviesToDB = saveKmdbMoviesToDB;
window.convertKmdbToTmdbFormat = convertKmdbToTmdbFormat;

console.log('✅ KMDB API 모듈 로드 완료');
