// Review Analyzer - 리뷰 분석 및 감정 태그 시스템

/**
 * 감정/분위기 태그 정의
 */
const EMOTION_TAGS = {
    funny: { label: '웃긴', emoji: '😂', keywords: ['웃', '재밌', '재미있', '코믹', '유쾌', '개그', '유머', 'funny', 'hilarious', 'comedy'] },
    touching: { label: '감동적인', emoji: '😭', keywords: ['감동', '눈물', '울', '뭉클', '따뜻', '진심', 'touching', 'emotional', 'heartwarming'] },
    scary: { label: '무서운', emoji: '😱', keywords: ['무서', '공포', '소름', '긴장', '섬뜩', 'scary', 'horror', 'creepy', 'terrifying'] },
    thrilling: { label: '스릴있는', emoji: '🔥', keywords: ['스릴', '긴장감', '박진감', '액션', '전개', 'thrilling', 'action', 'intense', 'exciting'] },
    romantic: { label: '로맨틱한', emoji: '💕', keywords: ['로맨스', '사랑', '연애', '달달', '설렘', 'romantic', 'love', 'romance'] },
    deep: { label: '생각하게 만드는', emoji: '🤔', keywords: ['생각', '철학', '의미', '메시지', '사회', '인생', 'thought-provoking', 'philosophical', 'meaningful'] },
    beautiful: { label: '영상미가 좋은', emoji: '🎨', keywords: ['영상', '미', '화면', '촬영', '비주얼', 'beautiful', 'cinematography', 'visual'] },
    twist: { label: '반전있는', emoji: '🎭', keywords: ['반전', '결말', '놀랐', '예상', '반전', 'twist', 'surprising', 'unexpected'] },
    family: { label: '가족과 함께', emoji: '👨‍👩‍👧‍👦', keywords: ['가족', '아이', '어린이', '순수', 'family', 'kids', 'children'] },
    healing: { label: '힐링되는', emoji: '🌿', keywords: ['힐링', '위로', '평화', '따뜻', '안정', 'healing', 'comfort', 'peaceful'] }
};

/**
 * 장르 기반 기본 태그 매핑
 */
const GENRE_TAG_MAPPING = {
    '코미디': ['funny'],
    'Comedy': ['funny'],
    '액션': ['thrilling'],
    'Action': ['thrilling'],
    '공포': ['scary'],
    'Horror': ['scary'],
    '스릴러': ['thrilling', 'scary'],
    'Thriller': ['thrilling', 'scary'],
    '로맨스': ['romantic'],
    'Romance': ['romantic'],
    '멜로': ['romantic', 'touching'],
    '드라마': ['deep', 'touching'],
    'Drama': ['deep', 'touching'],
    '가족': ['family', 'healing'],
    'Family': ['family', 'healing'],
    '판타지': ['beautiful'],
    'Fantasy': ['beautiful'],
    '애니메이션': ['family', 'beautiful'],
    'Animation': ['family', 'beautiful']
};

/**
 * 작품의 감정 태그 생성 (장르 + 리뷰 분석)
 */
function generateEmotionTags(item) {
    const tags = new Set();
    
    // 1. 장르 기반 태그
    if (item.genre) {
        const genres = item.genre.split(',').map(g => g.trim());
        genres.forEach(genre => {
            const mappedTags = GENRE_TAG_MAPPING[genre];
            if (mappedTags) {
                mappedTags.forEach(tag => tags.add(tag));
            }
        });
    }
    
    // 2. 리뷰 분석 (plot에서 키워드 추출)
    if (item.plot) {
        const plotLower = item.plot.toLowerCase();
        Object.entries(EMOTION_TAGS).forEach(([key, tagInfo]) => {
            const hasKeyword = tagInfo.keywords.some(keyword => 
                plotLower.includes(keyword.toLowerCase())
            );
            if (hasKeyword) {
                tags.add(key);
            }
        });
    }
    
    // 3. 비고(notes)에서도 키워드 추출
    if (item.notes) {
        const notesLower = item.notes.toLowerCase();
        Object.entries(EMOTION_TAGS).forEach(([key, tagInfo]) => {
            const hasKeyword = tagInfo.keywords.some(keyword => 
                notesLower.includes(keyword.toLowerCase())
            );
            if (hasKeyword) {
                tags.add(key);
            }
        });
    }
    
    // 4. 평점 기반 추가 태그
    const rating = item.rating || item.reaction_score || 0;
    if (rating >= 8.5) {
        tags.add('deep'); // 고평점은 생각하게 만드는 작품일 가능성
    }
    
    return Array.from(tags);
}

/**
 * "이런 분께 추천합니다" 자동 생성
 */
function generateRecommendationText(item, tags) {
    const recommendations = [];
    
    // 태그 기반 추천
    if (tags.includes('funny')) {
        recommendations.push('웃으면서 스트레스를 풀고 싶은 분');
    }
    if (tags.includes('touching')) {
        recommendations.push('감동적인 이야기로 마음을 채우고 싶은 분');
    }
    if (tags.includes('scary')) {
        recommendations.push('공포와 스릴을 즐기는 분');
    }
    if (tags.includes('thrilling')) {
        recommendations.push('긴박하고 박진감 넘치는 전개를 좋아하는 분');
    }
    if (tags.includes('romantic')) {
        recommendations.push('달달한 로맨스를 원하는 분');
    }
    if (tags.includes('deep')) {
        recommendations.push('깊이 있는 메시지를 찾는 분');
    }
    if (tags.includes('beautiful')) {
        recommendations.push('뛰어난 영상미를 감상하고 싶은 분');
    }
    if (tags.includes('family')) {
        recommendations.push('가족과 함께 즐기고 싶은 분');
    }
    if (tags.includes('healing')) {
        recommendations.push('마음의 위로와 힐링이 필요한 분');
    }
    
    // 평점 기반 추가
    const rating = item.rating || item.reaction_score || 0;
    if (rating >= 8.5) {
        recommendations.push('명작을 감상하고 싶은 분');
    }
    
    // 관객수 기반 추가
    if (item.audience_count && item.audience_count >= 5000000) {
        recommendations.push('검증된 흥행작을 원하는 분');
    }
    
    // 상영시간 기반
    if (item.runtime) {
        if (item.runtime <= 100) {
            recommendations.push('짧고 굵게 보고 싶은 분');
        } else if (item.runtime >= 150) {
            recommendations.push('여유롭게 몰입하고 싶은 분');
        }
    }
    
    return recommendations.slice(0, 3); // 최대 3개
}

/**
 * 태그 기반 작품 필터링
 */
function filterByEmotionTags(items, selectedTags) {
    if (!selectedTags || selectedTags.length === 0) {
        return items;
    }
    
    return items.filter(item => {
        const itemTags = generateEmotionTags(item);
        return selectedTags.some(tag => itemTags.includes(tag));
    });
}

/**
 * 감정 태그 배지 HTML 생성
 */
function createEmotionTagBadges(tags) {
    return tags.map(tag => {
        const tagInfo = EMOTION_TAGS[tag];
        if (!tagInfo) return '';
        
        return `
            <span class="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                <span class="mr-1">${tagInfo.emoji}</span>
                ${tagInfo.label}
            </span>
        `;
    }).join(' ');
}

/**
 * 리뷰 요약 생성 (간단 버전)
 */
function generateReviewSummary(item, tags) {
    const tagLabels = tags.map(tag => EMOTION_TAGS[tag]?.label).filter(Boolean);
    
    if (tagLabels.length === 0) {
        return `${item.title}는 ${item.genre || '다양한 장르'}의 작품입니다.`;
    }
    
    const tagText = tagLabels.slice(0, 3).join(', ');
    return `${tagText} 작품으로, 많은 관객들의 사랑을 받았습니다.`;
}

/**
 * 유사 감정 작품 추천
 */
function findSimilarEmotionMovies(item, allItems, limit = 6) {
    const itemTags = generateEmotionTags(item);
    
    if (itemTags.length === 0) {
        return [];
    }
    
    return allItems
        .filter(other => other.id !== item.id)
        .map(other => {
            const otherTags = generateEmotionTags(other);
            const commonTags = itemTags.filter(tag => otherTags.includes(tag));
            return {
                ...other,
                matchScore: commonTags.length
            };
        })
        .filter(item => item.matchScore > 0)
        .sort((a, b) => {
            if (b.matchScore !== a.matchScore) {
                return b.matchScore - a.matchScore;
            }
            // 같은 점수면 평점 높은 순
            const ratingA = a.rating || a.reaction_score || 0;
            const ratingB = b.rating || b.reaction_score || 0;
            return ratingB - ratingA;
        })
        .slice(0, limit);
}

/**
 * TMDB 리뷰 가져오기 (향후 구현)
 */
async function fetchTMDBReviews(tmdbId, type = 'movie') {
    const apiKey = getTmdbApiKey();
    if (!apiKey || !tmdbId) return [];
    
    try {
        const url = `https://api.themoviedb.org/3/${type}/${tmdbId}/reviews?api_key=${apiKey}&language=ko-KR`;
        const response = await fetch(url);
        const data = await response.json();
        
        return data.results || [];
    } catch (error) {
        console.error('Failed to fetch reviews:', error);
        return [];
    }
}

/**
 * 리뷰 키워드 분석
 */
function analyzeReviewKeywords(reviews) {
    const keywords = {};
    
    reviews.forEach(review => {
        const content = review.content.toLowerCase();
        
        Object.entries(EMOTION_TAGS).forEach(([key, tagInfo]) => {
            tagInfo.keywords.forEach(keyword => {
                if (content.includes(keyword.toLowerCase())) {
                    keywords[key] = (keywords[key] || 0) + 1;
                }
            });
        });
    });
    
    // 가장 많이 등장한 태그 순으로 정렬
    return Object.entries(keywords)
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key)
        .slice(0, 5);
}
