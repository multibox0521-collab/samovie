// Shorts Score System - 쇼츠 적합도 점수 계산

/**
 * 쇼츠 적합도 점수 계산 (0-100점)
 * @param {Object} item - 영화 또는 드라마 객체
 * @returns {number} 0-100 사이의 점수
 */
function calculateShortsScore(item) {
    let score = 0;
    
    // 1. 인기도 (30점)
    const audienceCount = item.audience_count || 0;
    if (audienceCount >= 10000000) score += 30; // 1000만 이상
    else if (audienceCount >= 5000000) score += 25; // 500만 이상
    else if (audienceCount >= 3000000) score += 20; // 300만 이상
    else if (audienceCount >= 1000000) score += 15; // 100만 이상
    else if (audienceCount >= 500000) score += 10; // 50만 이상
    
    // TMDB popularity도 고려 (드라마의 경우 관객수가 없을 수 있음)
    if (audienceCount === 0 && item.rating) {
        // 평점 기반 대체 점수
        if (item.rating >= 8.5) score += 25;
        else if (item.rating >= 8.0) score += 20;
        else if (item.rating >= 7.5) score += 15;
        else if (item.rating >= 7.0) score += 10;
    }
    
    // 2. 퀄리티 (20점) - 평점 기준
    const rating = item.rating || item.reaction_score || 0;
    if (rating >= 9.0) score += 20;
    else if (rating >= 8.5) score += 18;
    else if (rating >= 8.0) score += 15;
    else if (rating >= 7.5) score += 12;
    else if (rating >= 7.0) score += 10;
    else if (rating >= 6.5) score += 5;
    
    // 3. 저작권 안전성 (30점) - 기준 강화: 6개월+ 필수
    if (item.shorts_first_upload) {
        const monthsSince = getMonthsSinceUpload(item.shorts_first_upload);
        if (!item.copyright_warning) {
            if (monthsSince >= 12) score += 30; // 1년 이상 경과 (매우 안전)
            else if (monthsSince >= 6) score += 20; // 6개월 이상 (안전) - S등급 기준
            else if (monthsSince >= 4) score += 10; // 4개월 이상 (주의)
            else if (monthsSince >= 3) score += 5; // 3개월 이상 (위험)
            else score += 0; // 3개월 미만 (매우 위험)
        } else {
            // 경고가 있으면 큰 감점
            score -= 20;
        }
    } else {
        // 쇼츠 업로드 정보가 없으면 보수적 평가
        score += 5;
    }
    
    // 4. 경쟁도 (20점) - 쇼츠 개수가 적을수록 좋음
    const shortsCount = item.shorts_channel_count || 0;
    if (shortsCount === 0) score += 20; // 아직 없음 (최고)
    else if (shortsCount < 5) score += 18; // 거의 없음
    else if (shortsCount < 10) score += 15; // 적음
    else if (shortsCount < 30) score += 12; // 보통
    else if (shortsCount < 50) score += 8; // 경쟁 있음
    else if (shortsCount < 100) score += 5; // 경쟁 많음
    // 100개 이상이면 0점
    
    // 5. 보너스 점수
    if (item.is_verified_safe) score += 10; // 검증된 작품
    
    // 최신성 보너스 (2020년 이후 +5점)
    if (item.release_date) {
        const releaseYear = new Date(item.release_date).getFullYear();
        if (releaseYear >= 2020) score += 5;
    }
    
    // 점수는 0-100 사이로 제한
    return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * 쇼츠 업로드 이후 경과 개월 수 계산
 */
function getMonthsSinceUpload(uploadDate) {
    if (!uploadDate) return 0;
    const now = Date.now();
    const upload = new Date(uploadDate).getTime();
    const daysSince = Math.floor((now - upload) / (1000 * 60 * 60 * 24));
    return Math.floor(daysSince / 30);
}

/**
 * 등급 반환 (커뮤니티 + 운영자 평가 기반)
 * ⚠️ 중요: AI 점수는 참고만, 등급은 실제 사용자 평가 기반
 */
function getShortsGrade(score, item) {
    // 1️⃣ 운영자 평가 (절대적)
    if (item && item.admin_recommended) {
        return { 
            grade: 'S', 
            color: 'bg-gradient-to-r from-purple-600 to-pink-600', 
            text: '운영자 인증', 
            emoji: '👑',
            description: '운영자가 직접 검증한 안전한 작품'
        };
    }
    
    if (item && item.is_verified_safe) {
        return { 
            grade: 'A', 
            color: 'bg-gradient-to-r from-blue-600 to-cyan-600', 
            text: '운영자 검증', 
            emoji: '✓',
            description: '운영자가 안전하다고 확인한 작품'
        };
    }
    
    // 2️⃣ 커뮤니티 평가 (3명 이상 평가 시)
    if (item && item.safety_rating_count >= 3) {
        const avgSafety = item.safety_rating_average || 0;
        
        if (avgSafety >= 8.0) {
            return { 
                grade: 'S', 
                color: 'bg-gradient-to-r from-green-600 to-emerald-600', 
                text: '커뮤니티 검증', 
                emoji: '🛡️',
                description: `커뮤니티 안전도 ${avgSafety.toFixed(1)}/10 (${item.safety_rating_count}명 평가)`
            };
        }
        
        if (avgSafety >= 7.0) {
            return { 
                grade: 'A', 
                color: 'bg-gradient-to-r from-blue-500 to-cyan-500', 
                text: '커뮤니티 안전', 
                emoji: '👍',
                description: `커뮤니티 안전도 ${avgSafety.toFixed(1)}/10 (${item.safety_rating_count}명 평가)`
            };
        }
        
        if (avgSafety >= 5.0) {
            return { 
                grade: 'B', 
                color: 'bg-gradient-to-r from-yellow-500 to-orange-500', 
                text: '주의 필요', 
                emoji: '⚠️',
                description: `커뮤니티 안전도 ${avgSafety.toFixed(1)}/10 (${item.safety_rating_count}명 평가)`
            };
        }
        
        return { 
            grade: 'C', 
            color: 'bg-gradient-to-r from-red-500 to-orange-600', 
            text: '위험', 
            emoji: '❌',
            description: `커뮤니티 안전도 ${avgSafety.toFixed(1)}/10 (${item.safety_rating_count}명 평가)`
        };
    }
    
    // 3️⃣ AI 분석 참고 (평가 부족 시)
    // ⚠️ 주의: AI 분석은 참고만! 실제 제작 전 반드시 커뮤니티 평가 확인!
    return { 
        grade: '?', 
        color: 'bg-gradient-to-r from-gray-500 to-gray-600', 
        text: 'AI 분석 참고', 
        emoji: '🤖',
        description: 'AI 분석 점수: ' + score + '점 (참고용, 커뮤니티 평가 필요)'
    };
}

/**
 * 경쟁도 분석
 */
function getCompetitionLevel(shortsCount) {
    if (shortsCount === 0) return { level: '없음', color: 'text-green-600', stars: '⭐⭐⭐⭐⭐' };
    if (shortsCount < 10) return { level: '매우 낮음', color: 'text-green-500', stars: '⭐⭐⭐⭐' };
    if (shortsCount < 30) return { level: '낮음', color: 'text-blue-500', stars: '⭐⭐⭐' };
    if (shortsCount < 50) return { level: '보통', color: 'text-yellow-500', stars: '⭐⭐' };
    if (shortsCount < 100) return { level: '높음', color: 'text-orange-500', stars: '⭐' };
    return { level: '매우 높음', color: 'text-red-500', stars: '⚠️' };
}

/**
 * 저작권 안전도 분석
 */
function getCopyrightSafety(item) {
    // 운영자 추천은 무조건 안전
    if (item.admin_recommended) {
        return { level: '운영자인증', color: 'text-purple-600', icon: '👑' };
    }
    
    if (item.copyright_warning) {
        return { level: '위험', color: 'text-red-600', icon: '🔴' };
    }
    
    if (!item.shorts_first_upload) {
        return { level: '미확인', color: 'text-gray-500', icon: '⚪' };
    }
    
    const months = getMonthsSinceUpload(item.shorts_first_upload);
    if (months >= 12) return { level: '매우 안전', color: 'text-green-600', icon: '🟢' };
    if (months >= 6) return { level: '안전', color: 'text-green-500', icon: '🟢' };
    if (months >= 4) return { level: '주의', color: 'text-yellow-500', icon: '🟡' };
    if (months >= 3) return { level: '위험', color: 'text-orange-500', icon: '🟠' };
    return { level: '매우위험', color: 'text-red-600', icon: '🔴' };
}
