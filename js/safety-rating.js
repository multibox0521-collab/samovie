/**
 * 안전도 평점 시스템 (개선 버전)
 * - 커뮤니티 기반 안전도 평가
 * - 시간 가중치: 오래 살아남은 쇼츠 = 더 안전
 * - 최신 평가 우선: 최근 평가에 더 높은 가중치
 * - 신뢰도 표시: 참여자 수로 신뢰도 계산
 */

/**
 * 개별 평가의 점수 계산 (시간 보너스 포함)
 * @param {Object} rating - 평가 객체
 * @returns {Number|null} - 0~10점 또는 null (평가 불가)
 */
function calculateSingleRating(rating) {
    // 👑 관리자 평가는 무조건 10점 (S등급) - 절대적 권한
    if (rating.is_admin_rating === true || rating.forced_score === 10) {
        return 10;
    }
    
    // 쇼츠를 제작하지 않은 경우 → 평가 불가
    if (!rating.shorts_created) {
        return null;
    }
    
    let baseScore = 0;
    
    // 기본 점수 계산 (0~7점)
    if (rating.copyright_issue && rating.shorts_deleted) {
        baseScore = 0; // 최악: 경고 + 삭제
    } else if (rating.copyright_issue && !rating.shorts_deleted) {
        baseScore = 3; // 경고만 (아직 살아있음)
    } else if (!rating.copyright_issue && rating.shorts_deleted) {
        baseScore = 5; // 삭제됨 (경고 없이 삭제는 이상함)
    } else {
        baseScore = 7; // 안전: 경고 없음 + 유지중
    }
    
    // 시간 보너스 계산 (0~3점)
    // 오래 살아남은 쇼츠 = 더 안전
    const months = rating.months_since_upload || 0;
    let timeBonus = 0;
    
    if (months >= 12) {
        timeBonus = 3; // 1년 이상 생존: +3점
    } else if (months >= 6) {
        timeBonus = 2; // 6개월 이상 생존: +2점
    } else if (months >= 3) {
        timeBonus = 1; // 3개월 이상 생존: +1점
    }
    // 3개월 미만: +0점
    
    const finalScore = Math.min(baseScore + timeBonus, 10);
    return finalScore;
}

/**
 * 안전도 평균 점수 계산 (시간 가중치 + 최신 평가 우선 + 삭제 경험 패널티)
 * @param {Array} ratings - 안전도 평가 배열
 * @returns {Object} - { score, count, confidence, deletionCount, deletionRatio, safetyLevel }
 */
function calculateAverageSafetyRating(ratings) {
    if (!ratings || ratings.length === 0) {
        return { score: 0, count: 0, confidence: 'none', deletionCount: 0, deletionRatio: 0, safetyLevel: 'unknown' };
    }
    
    // 👑 관리자 평가가 있으면 무조건 10점 반환 (절대적 권한)
    const hasAdminRating = ratings.some(r => r.is_admin_rating === true || r.forced_score === 10);
    if (hasAdminRating) {
        return {
            score: 10.0,
            count: ratings.length,
            confidence: 'admin',
            deletionCount: 0,
            deletionRatio: 0,
            safetyLevel: 'admin_verified' // S등급 강제
        };
    }
    
    // 실제 제작한 평가만 필터링
    const validRatings = ratings.filter(r => r.shorts_created);
    
    if (validRatings.length === 0) {
        return { score: 0, count: 0, confidence: 'none', deletionCount: 0, deletionRatio: 0, safetyLevel: 'unknown' };
    }
    
    // 삭제 경험자 카운트
    const deletionCount = validRatings.filter(r => r.shorts_deleted).length;
    const deletionRatio = deletionCount / validRatings.length;
    
    const now = Date.now();
    let weightedSum = 0;
    let totalWeight = 0;
    
    validRatings.forEach(rating => {
        const score = calculateSingleRating(rating);
        if (score === null) return;
        
        // 평가 나이 계산 (개월)
        const ageInMonths = (now - rating.timestamp) / (30 * 24 * 60 * 60 * 1000);
        
        // 최신 평가에 더 높은 가중치
        let recencyWeight = 1.0;
        if (ageInMonths < 1) recencyWeight = 1.5;      // 최근 1개월: x1.5
        else if (ageInMonths < 3) recencyWeight = 1.2; // 최근 3개월: x1.2
        else if (ageInMonths < 6) recencyWeight = 1.0; // 최근 6개월: x1.0
        else recencyWeight = 0.8;                       // 6개월 이상: x0.8
        
        weightedSum += score * recencyWeight;
        totalWeight += recencyWeight;
    });
    
    let avgScore = Math.round((weightedSum / totalWeight) * 10) / 10;
    
    // 삭제 경험 패널티 적용
    let safetyLevel = 'safe';
    
    if (deletionCount > 0) {
        // 1명이라도 삭제 경험이 있으면 최대 점수 제한
        if (deletionRatio >= 0.4) {
            // 5명 중 2명 이상 삭제 → 위험 (최대 4점)
            avgScore = Math.min(avgScore, 4.0);
            safetyLevel = 'danger';
        } else if (deletionRatio >= 0.1) {
            // 10명 중 1명 이상 삭제 → 조심 (최대 6점)
            avgScore = Math.min(avgScore, 6.0);
            safetyLevel = 'caution';
        } else {
            // 삭제 경험 있지만 비율 낮음 → 주의 (최대 7점)
            avgScore = Math.min(avgScore, 7.0);
            safetyLevel = 'warning';
        }
    } else if (avgScore >= 8.0) {
        safetyLevel = 'very_safe';
    }
    
    // 신뢰도 계산
    let confidence = 'low';
    if (validRatings.length >= 10) confidence = 'high';
    else if (validRatings.length >= 3) confidence = 'medium';
    
    return {
        score: avgScore,
        count: validRatings.length,
        confidence: confidence,
        deletionCount: deletionCount,
        deletionRatio: Math.round(deletionRatio * 100) / 100,
        safetyLevel: safetyLevel
    };
}

/**
 * 안전도 평점 UI 렌더링
 */
function renderSafetyRating(item) {
    const result = calculateAverageSafetyRating(item.safety_ratings || []);
    const { score, count, confidence, deletionCount, deletionRatio, safetyLevel } = result;
    
    if (count === 0) {
        return `
        <div class="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-300">
            <div class="flex items-center justify-between mb-2">
                <h4 class="font-semibold text-gray-700">
                    <i class="fas fa-shield-alt mr-2"></i>커뮤니티 안전도 평가
                </h4>
                <span class="text-xs px-2 py-1 rounded bg-gray-200 text-gray-600">
                    <i class="fas fa-question"></i> 미평가
                </span>
            </div>
            <p class="text-sm text-gray-600 mb-3">
                아직 안전도 평가가 없습니다. 이 작품으로 쇼츠를 제작해보셨나요?
            </p>
            <button onclick="openSafetyRatingModal('${item.type || 'movies'}', '${item.id}')" 
                class="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm">
                <i class="fas fa-star mr-2"></i>첫 평가 남기기
            </button>
        </div>
        `;
    }
    
    // 색상 및 레이블 (삭제 경험 고려)
    let badgeColor = '';
    let badgeIcon = '';
    let badgeText = '';
    let warningMessage = '';
    
    if (safetyLevel === 'very_safe') {
        badgeColor = 'bg-green-500';
        badgeIcon = '🟢';
        badgeText = '매우 안전';
    } else if (safetyLevel === 'safe') {
        badgeColor = 'bg-blue-500';
        badgeIcon = '🔵';
        badgeText = '안전';
    } else if (safetyLevel === 'warning') {
        badgeColor = 'bg-yellow-500';
        badgeIcon = '🟡';
        badgeText = '주의';
        warningMessage = `삭제 경험 ${deletionCount}명 (${Math.round(deletionRatio * 100)}%)`;
    } else if (safetyLevel === 'caution') {
        badgeColor = 'bg-orange-500';
        badgeIcon = '🟠';
        badgeText = '조심';
        warningMessage = `삭제 경험 ${deletionCount}명 (${Math.round(deletionRatio * 100)}%) - 신중하게 판단하세요`;
    } else if (safetyLevel === 'danger') {
        badgeColor = 'bg-red-500';
        badgeIcon = '🔴';
        badgeText = '위험';
        warningMessage = `삭제 경험 ${deletionCount}명 (${Math.round(deletionRatio * 100)}%) - 매우 위험합니다!`;
    } else {
        // fallback
        if (score >= 8) {
            badgeColor = 'bg-green-500';
            badgeIcon = '🟢';
            badgeText = '매우 안전';
        } else if (score >= 6) {
            badgeColor = 'bg-blue-500';
            badgeIcon = '🔵';
            badgeText = '안전';
        } else if (score >= 4) {
            badgeColor = 'bg-yellow-500';
            badgeIcon = '🟡';
            badgeText = '주의';
        } else {
            badgeColor = 'bg-red-500';
            badgeIcon = '🔴';
            badgeText = '위험';
        }
    }
    
    // 신뢰도 표시
    let confidenceBadge = '';
    if (confidence === 'high') {
        confidenceBadge = '<span class="text-xs text-green-600">✅ 높은 신뢰도</span>';
    } else if (confidence === 'medium') {
        confidenceBadge = '<span class="text-xs text-blue-600">충분한 평가</span>';
    } else {
        confidenceBadge = '<span class="text-xs text-orange-600">⚠️ 평가 부족 (더 필요)</span>';
    }
    
    return `
        <div class="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
            <div class="flex items-center justify-between mb-3">
                <h4 class="font-semibold text-gray-900">
                    <i class="fas fa-shield-alt mr-2 text-blue-600"></i>커뮤니티 안전도 평가
                </h4>
                <span class="text-xs px-3 py-1 rounded ${badgeColor} text-white font-bold">
                    ${badgeIcon} ${badgeText}
                </span>
            </div>
            
            <div class="flex items-center gap-4 mb-3">
                <div class="text-center">
                    <div class="text-4xl font-bold text-blue-900">${score}</div>
                    <div class="text-xs text-gray-600">안전도</div>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between text-xs text-gray-600 mb-1">
                        <span>${count}명 참여</span>
                        <span>${confidenceBadge}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3">
                        <div class="${badgeColor} h-3 rounded-full transition-all" style="width: ${score * 10}%"></div>
                    </div>
                </div>
            </div>
            
            <div class="flex items-center justify-between text-xs text-gray-600 mb-2">
                <span class="text-gray-600 min-w-[80px]">0점 (위험)</span>
                <span class="text-gray-600 min-w-[80px] text-right">10점 (매우 안전)</span>
            </div>
            
            ${warningMessage ? `
            <div class="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 mb-3">
                <div class="flex items-start gap-2">
                    <i class="fas fa-exclamation-triangle text-orange-600 mt-0.5"></i>
                    <div class="text-sm">
                        <p class="font-semibold text-orange-800 mb-1">삭제 경험 보고됨</p>
                        <p class="text-orange-700">${warningMessage}</p>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${renderRecentRatings(item.safety_ratings || [])}
            
            <button onclick="openSafetyRatingModal('${item.type || 'movies'}', '${item.id}')" 
                class="w-full mt-3 px-4 py-2 bg-white border-2 border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition text-sm font-medium">
                <i class="fas fa-plus mr-2"></i>내 평가 추가하기
            </button>
        </div>
    `;
}

/**
 * 최근 평가 내역 렌더링
 */
function renderRecentRatings(ratings) {
    if (!ratings || ratings.length === 0) return '';
    
    const validRatings = ratings.filter(r => r.shorts_created);
    if (validRatings.length === 0) return '';
    
    // 최신순 정렬
    const sortedRatings = [...validRatings].sort((a, b) => b.timestamp - a.timestamp);
    const recentRatings = sortedRatings.slice(0, 3); // 최근 3개만
    
    const now = Date.now();
    
    return `
        <div class="mt-3 pt-3 border-t border-blue-200">
            <div class="text-xs font-medium text-gray-700 mb-2">
                <i class="fas fa-comments mr-1"></i>최근 평가
            </div>
            <div class="space-y-2">
                ${recentRatings.map(rating => {
                    const score = calculateSingleRating(rating);
                    const timeAgo = getTimeAgo(now - rating.timestamp);
                    
                    let scoreColor = 'text-gray-600';
                    if (score >= 8) scoreColor = 'text-green-600';
                    else if (score >= 6) scoreColor = 'text-blue-600';
                    else if (score >= 4) scoreColor = 'text-yellow-600';
                    else scoreColor = 'text-red-600';
                    
                    return `
                        <div class="bg-white rounded p-2 text-xs">
                            <div class="flex items-center justify-between mb-1">
                                <span class="font-medium ${scoreColor}">${score}점</span>
                                <span class="text-gray-500">${timeAgo}</span>
                            </div>
                            ${rating.comment ? `
                                <p class="text-gray-700 line-clamp-2">"${escapeHtml(rating.comment)}"</p>
                            ` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            ${sortedRatings.length > 3 ? `
                <div class="text-center mt-2">
                    <button class="text-xs text-blue-600 hover:underline">
                        +${sortedRatings.length - 3}개 평가 더보기
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

/**
 * 시간 경과 표시 (예: "1시간 전", "3일 전")
 */
function getTimeAgo(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    
    if (months > 0) return `${months}개월 전`;
    if (days > 0) return `${days}일 전`;
    if (hours > 0) return `${hours}시간 전`;
    if (minutes > 0) return `${minutes}분 전`;
    return '방금 전';
}

/**
 * 안전도 등급 배지
 */
function getSafetyBadge(rating) {
    if (!rating || rating === 0) {
        return '<span class="px-2 py-1 text-xs rounded bg-gray-200 text-gray-600"><i class="fas fa-question"></i> 미평가</span>';
    }
    
    if (rating >= 8) {
        return '<span class="px-2 py-1 text-xs rounded bg-green-500 text-white"><i class="fas fa-check-circle"></i> 매우 안전</span>';
    } else if (rating >= 6) {
        return '<span class="px-2 py-1 text-xs rounded bg-blue-500 text-white"><i class="fas fa-shield-alt"></i> 안전</span>';
    } else if (rating >= 4) {
        return '<span class="px-2 py-1 text-xs rounded bg-yellow-500 text-white"><i class="fas fa-exclamation-triangle"></i> 주의</span>';
    } else {
        return '<span class="px-2 py-1 text-xs rounded bg-red-500 text-white"><i class="fas fa-times-circle"></i> 위험</span>';
    }
}

/**
 * 안전한 작품 필터링
 */
function filterSafeContent(items, minRating = 6) {
    return items.filter(item => {
        const result = calculateAverageSafetyRating(item.safety_ratings || []);
        return result.count >= 3 && result.score >= minRating;
    });
}

/**
 * 추천 작품 정렬 (안전도 우선)
 */
function sortBySafety(items) {
    return items.sort((a, b) => {
        const resultA = calculateAverageSafetyRating(a.safety_ratings || []);
        const resultB = calculateAverageSafetyRating(b.safety_ratings || []);
        
        // 1차: 안전도 평점
        if (resultB.score !== resultA.score) {
            return resultB.score - resultA.score;
        }
        
        // 2차: 평가 참여자 수
        return resultB.count - resultA.count;
    });
}

// Safety Rating Modal State
let currentRatingItemType = '';
let currentRatingItemId = '';
let ratingData = {
    shorts_created: null,
    copyright_issue: null,
    shorts_deleted: null,
    months_since_upload: null,
    comment: ''
};

// Open Safety Rating Modal
function openSafetyRatingModal(type, id) {
    currentRatingItemType = type;
    currentRatingItemId = id;
    
    // Find item
    let item;
    if (type === 'movies') {
        item = allMovies.find(m => m.id === id);
    } else {
        item = allDramas.find(d => d.id === id);
    }
    
    if (!item) return;
    
    // Reset form
    ratingData = {
        shorts_created: null,
        copyright_issue: null,
        shorts_deleted: null,
        months_since_upload: null,
        comment: ''
    };
    
    // Update UI
    document.getElementById('safetyRatingTitle').textContent = item.title;
    document.getElementById('safetyComment').value = '';
    
    // Reset buttons
    resetSafetyButtons();
    
    // Hide sections
    document.getElementById('copyrightSection').classList.add('hidden');
    document.getElementById('deletedSection').classList.add('hidden');
    document.getElementById('timeSection').classList.add('hidden');
    
    // Disable submit
    document.getElementById('submitSafetyBtn').disabled = true;
    
    // Show modal
    document.getElementById('safetyRatingModal').classList.remove('hidden');
}

// Close Safety Rating Modal
function closeSafetyRatingModal() {
    document.getElementById('safetyRatingModal').classList.add('hidden');
    currentRatingItemType = '';
    currentRatingItemId = '';
}

// Set Shorts Created
function setShortsCreated(created) {
    ratingData.shorts_created = created;
    
    // Update button styles
    if (created) {
        document.getElementById('shortsCreatedYes').classList.add('border-green-500', 'bg-green-50');
        document.getElementById('shortsCreatedYes').classList.remove('border-gray-300');
        document.getElementById('shortsCreatedNo').classList.remove('border-gray-500', 'bg-gray-50');
        document.getElementById('shortsCreatedNo').classList.add('border-gray-300');
        
        // Show next sections
        document.getElementById('copyrightSection').classList.remove('hidden');
        document.getElementById('timeSection').classList.remove('hidden');
    } else {
        document.getElementById('shortsCreatedNo').classList.add('border-gray-500', 'bg-gray-50');
        document.getElementById('shortsCreatedNo').classList.remove('border-gray-300');
        document.getElementById('shortsCreatedYes').classList.remove('border-green-500', 'bg-green-50');
        document.getElementById('shortsCreatedYes').classList.add('border-gray-300');
        
        // Hide next sections and reset
        document.getElementById('copyrightSection').classList.add('hidden');
        document.getElementById('deletedSection').classList.add('hidden');
        document.getElementById('timeSection').classList.add('hidden');
        ratingData.copyright_issue = null;
        ratingData.shorts_deleted = null;
        ratingData.months_since_upload = null;
    }
    
    checkSubmitReady();
}

// Set Copyright Issue
function setCopyrightIssue(issue) {
    ratingData.copyright_issue = issue;
    
    // Update button styles
    if (issue) {
        document.getElementById('copyrightYes').classList.add('border-red-500', 'bg-red-50');
        document.getElementById('copyrightYes').classList.remove('border-gray-300');
        document.getElementById('copyrightNo').classList.remove('border-green-500', 'bg-green-50');
        document.getElementById('copyrightNo').classList.add('border-gray-300');
    } else {
        document.getElementById('copyrightNo').classList.add('border-green-500', 'bg-green-50');
        document.getElementById('copyrightNo').classList.remove('border-gray-300');
        document.getElementById('copyrightYes').classList.remove('border-red-500', 'bg-red-50');
        document.getElementById('copyrightYes').classList.add('border-gray-300');
    }
    
    // Show deleted section
    document.getElementById('deletedSection').classList.remove('hidden');
    
    checkSubmitReady();
}

// Set Shorts Deleted
function setShortsDeleted(deleted) {
    ratingData.shorts_deleted = deleted;
    
    // Update button styles
    if (deleted) {
        document.getElementById('deletedYes').classList.add('border-red-500', 'bg-red-50');
        document.getElementById('deletedYes').classList.remove('border-gray-300');
        document.getElementById('deletedNo').classList.remove('border-green-500', 'bg-green-50');
        document.getElementById('deletedNo').classList.add('border-gray-300');
    } else {
        document.getElementById('deletedNo').classList.add('border-green-500', 'bg-green-50');
        document.getElementById('deletedNo').classList.remove('border-gray-300');
        document.getElementById('deletedYes').classList.remove('border-red-500', 'bg-red-50');
        document.getElementById('deletedYes').classList.add('border-gray-300');
    }
    
    checkSubmitReady();
}

// Set Months Since Upload
function setMonthsSinceUpload(months) {
    ratingData.months_since_upload = months;
    
    // Update all buttons
    const buttons = ['months0', 'months1', 'months3', 'months6', 'months12'];
    buttons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        btn.classList.remove('border-blue-500', 'bg-blue-50');
        btn.classList.add('border-gray-300');
    });
    
    // Highlight selected
    const selectedBtn = document.getElementById(`months${months}`);
    selectedBtn.classList.add('border-blue-500', 'bg-blue-50');
    selectedBtn.classList.remove('border-gray-300');
    
    checkSubmitReady();
}

// Check if submit is ready
function checkSubmitReady() {
    const submitBtn = document.getElementById('submitSafetyBtn');
    
    if (ratingData.shorts_created === false) {
        // If not created, show message
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-info-circle mr-2"></i>제작하지 않으면 평가할 수 없습니다';
    } else if (ratingData.shorts_created === true && 
               ratingData.copyright_issue !== null && 
               ratingData.shorts_deleted !== null &&
               ratingData.months_since_upload !== null) {
        // If created, need all fields
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>평가 제출';
    } else {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-check mr-2"></i>평가 제출';
    }
}

// Reset Safety Buttons
function resetSafetyButtons() {
    const buttons = [
        'shortsCreatedYes', 'shortsCreatedNo',
        'copyrightYes', 'copyrightNo',
        'deletedYes', 'deletedNo',
        'months0', 'months1', 'months3', 'months6', 'months12'
    ];
    
    buttons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('border-green-500', 'bg-green-50', 'border-red-500', 'bg-red-50', 'border-gray-500', 'bg-gray-50', 'border-blue-500', 'bg-blue-50');
            btn.classList.add('border-gray-300');
        }
    });
}

// Submit Safety Rating
async function submitSafetyRating() {
    try {
        // 필수 데이터 검증
        if (ratingData.shorts_created === null) {
            showToast('입력 오류', '쇼츠 제작 여부를 선택해주세요.', 'error');
            return;
        }
        
        if (ratingData.shorts_created === true) {
            if (ratingData.copyright_issue === null) {
                showToast('입력 오류', '저작권 경고 여부를 선택해주세요.', 'error');
                return;
            }
            if (ratingData.shorts_deleted === null) {
                showToast('입력 오류', '쇼츠 삭제 여부를 선택해주세요.', 'error');
                return;
            }
            if (ratingData.months_since_upload === null) {
                showToast('입력 오류', '제작 시기를 선택해주세요.', 'error');
                return;
            }
        }
        
        const comment = document.getElementById('safetyComment').value.trim();
        ratingData.comment = comment;
        
        // Get current item
        let item;
        if (currentRatingItemType === 'movies') {
            item = allMovies.find(m => m.id === currentRatingItemId);
        } else {
            item = allDramas.find(d => d.id === currentRatingItemId);
        }
        
        if (!item) {
            showToast('오류', '작품을 찾을 수 없습니다.', 'error');
            return;
        }
        
        console.log('✅ 평가 데이터:', ratingData);
        console.log('✅ 작품:', item.title);
        
        // Get existing ratings
        const existingRatings = item.safety_ratings || [];
        
        // 관리자 여부 확인
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const isAdmin = currentUser && currentUser.is_admin === true;
        
        // Create new rating
        const newRating = {
            id: Date.now().toString(),
            user_id: 'user_' + Date.now(), // In real app, use actual user ID
            timestamp: Date.now(),
            shorts_created: ratingData.shorts_created,
            copyright_issue: ratingData.copyright_issue,
            shorts_deleted: ratingData.shorts_deleted,
            months_since_upload: ratingData.months_since_upload,
            comment: ratingData.comment,
            is_admin_rating: isAdmin, // 관리자 평가 표시
            forced_score: isAdmin ? 10 : null // 관리자는 무조건 10점 (S등급)
        };
        
        // Add to ratings array
        existingRatings.push(newRating);
        
        // Calculate new average
        const avgResult = calculateAverageSafetyRating(existingRatings);
        
        // Update item
        const updateData = {
            safety_ratings: existingRatings,
            safety_rating_average: avgResult.score,
            safety_rating_count: avgResult.count,
            safety_last_updated: Date.now()
        };
        
        // Save to database
        const table = currentRatingItemType === 'movies' ? 'movies' : 'dramas';
        console.log('💾 저장 시도:', `tables/${table}/${currentRatingItemId}`);
        console.log('📦 업데이트 데이터:', updateData);
        
        const response = await fetch(`tables/${table}/${currentRatingItemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateData)
        });
        
        console.log('📡 응답 상태:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 저장 실패:', errorText);
            throw new Error(`Failed to save rating: ${response.status} - ${errorText}`);
        }
        
        console.log('✅ 저장 성공!');
        
        // Update local data
        if (currentRatingItemType === 'movies') {
            const index = allMovies.findIndex(m => m.id === currentRatingItemId);
            if (index !== -1) {
                allMovies[index] = { ...allMovies[index], ...updateData };
            }
        } else {
            const index = allDramas.findIndex(d => d.id === currentRatingItemId);
            if (index !== -1) {
                allDramas[index] = { ...allDramas[index], ...updateData };
            }
        }
        
        // Show success message
        const predictedScore = calculateSingleRating(newRating);
        showToast('평가 완료!', `${predictedScore}점으로 평가되었습니다. 감사합니다!`, 'success');
        
        // Close modal
        closeSafetyRatingModal();
        
        // Refresh detail view if open
        if (!document.getElementById('detailModal').classList.contains('hidden')) {
            showDetail(currentRatingItemType, currentRatingItemId);
        }
        
    } catch (error) {
        console.error('❌ 안전도 평가 제출 오류:', error);
        console.error('오류 스택:', error.stack);
        showToast('평가 제출 실패', 
            error.message || '평가 제출 중 오류가 발생했습니다. 브라우저 콘솔(F12)을 확인하세요.', 
            'error');
    }
}

// Export functions to window for global access
if (typeof window !== 'undefined') {
    window.calculateSingleRating = calculateSingleRating;
    window.calculateAverageSafetyRating = calculateAverageSafetyRating;
    window.renderSafetyRating = renderSafetyRating;
    window.renderRecentRatings = renderRecentRatings;
    window.openSafetyRatingModal = openSafetyRatingModal;
    window.closeSafetyRatingModal = closeSafetyRatingModal;
    window.setShortsCreated = setShortsCreated;
    window.setCopyrightIssue = setCopyrightIssue;
    window.setShortsDeleted = setShortsDeleted;
    window.setMonthsSinceUpload = setMonthsSinceUpload;
    window.submitSafetyRating = submitSafetyRating;
}

console.log('✅ safety-rating.js 로드 완료 (개선 버전)');
