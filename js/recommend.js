// Recommendation System - 추천 시스템

/**
 * "오늘 뭐볼까?" 뷰 로드
 */
function loadRecommendView() {
    // 내가 본 작품 섹션 표시
    const watchedItems = getWatchedItems();
    if (watchedItems.length > 0) {
        document.getElementById('myWatchedSection').classList.remove('hidden');
        showWatchedBasedRecommendations();
    }
    
    // 자동으로 명작 20개 추천 표시
    showAutoMasterpieces();
}

/**
 * "쇼츠 제작" 뷰 로드
 */
function loadShortsView() {
    // 내가 만든 쇼츠 섹션 표시
    const createdShorts = getCreatedShorts();
    if (createdShorts.length > 0) {
        document.getElementById('myShortsSection').classList.remove('hidden');
        showShortsBasedRecommendations();
    }
    
    // 운영자 추천 미리보기 (상위 4개)
    showAdminRecommendPreview();
}

/**
 * 운영자 추천 미리보기
 */
function showAdminRecommendPreview() {
    // 영화와 드라마에 type 추가
    const movies = allMovies.map(m => ({...m, type: 'movies'}));
    const dramas = allDramas.map(d => ({...d, type: 'dramas'}));
    const allContent = [...movies, ...dramas];
    
    const adminRecommended = allContent
        .filter(item => item.admin_recommended)
        .slice(0, 4);
    
    if (adminRecommended.length === 0) {
        document.getElementById('adminRecommendPreview').innerHTML = '<p class="text-gray-500 text-center py-4 col-span-full">아직 운영자 추천 작품이 없습니다.</p>';
        return;
    }
    
    // createPosterCard 사용 (app.js에서 정의됨)
    const html = adminRecommended.map(item => window.createPosterCard(item)).join('');
    
    document.getElementById('adminRecommendPreview').innerHTML = html;
}

/**
 * 감정 태그 기반 추천 (고도화)
 */
function recommendByEmotion(emotionTag) {
    const allContent = [...allMovies, ...allDramas];
    
    // 감정 태그로 필터링
    const filtered = allContent.filter(item => {
        const tags = generateEmotionTags(item);
        return tags.includes(emotionTag);
    });
    
    // 평점순으로 정렬
    filtered.sort((a, b) => {
        const ratingA = a.rating || a.reaction_score || 0;
        const ratingB = b.rating || b.reaction_score || 0;
        return ratingB - ratingA;
    });
    
    const tagInfo = EMOTION_TAGS[emotionTag];
    const title = `${tagInfo.emoji} ${tagInfo.label} 작품 추천`;
    
    // 상위 12개
    const topItems = filtered.slice(0, 12);
    
    displayEnhancedRecommendations(title, topItems);
}

/**
 * 향상된 추천 결과 표시 (감정 태그 + 추천 이유 포함)
 */
function displayEnhancedRecommendations(title, items) {
    const html = `
        <div class="mb-4">
            <h3 class="text-2xl font-bold mb-6">${title}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                ${items.map(item => {
                    const tags = generateEmotionTags(item);
                    const recommendations = generateRecommendationText(item, tags);
                    const plot = item.plot || '줄거리 정보가 없습니다.';
                    const rating = item.rating || item.reaction_score || 0;
                    const year = item.release_date ? new Date(item.release_date).getFullYear() : '';
                    
                    return `
                        <div onclick="showDetail('${item.id.includes('drama') ? 'dramas' : 'movies'}', '${item.id}')" 
                             class="cursor-pointer group bg-white rounded-lg shadow-md hover:shadow-xl transition overflow-hidden">
                            <!-- 포스터 -->
                            <div class="relative">
                                ${item.poster_url ? `
                                    <img src="${item.poster_url}" alt="${escapeHtml(item.title)}" 
                                         class="w-full h-64 object-cover group-hover:scale-105 transition">
                                ` : `
                                    <div class="w-full h-64 bg-gray-200 flex items-center justify-center">
                                        <i class="fas fa-film text-4xl text-gray-400"></i>
                                    </div>
                                `}
                                <div class="absolute top-2 right-2">
                                    <span class="px-2 py-1 bg-black bg-opacity-70 text-white text-sm rounded font-bold">
                                        ⭐ ${rating.toFixed(1)}
                                    </span>
                                </div>
                            </div>
                            
                            <!-- 정보 -->
                            <div class="p-4">
                                <h4 class="font-bold text-lg mb-2 line-clamp-1">${escapeHtml(item.title)}</h4>
                                
                                <!-- 연도 및 장르 -->
                                <div class="text-xs text-gray-500 mb-2">
                                    ${year ? `${year} · ` : ''}${item.genre || ''}
                                </div>
                                
                                <!-- 감정 태그 -->
                                <div class="flex flex-wrap gap-1 mb-3">
                                    ${createEmotionTagBadges(tags.slice(0, 3))}
                                </div>
                                
                                <!-- 줄거리 -->
                                <p class="text-sm text-gray-700 mb-3 line-clamp-3">${escapeHtml(plot)}</p>
                                
                                <!-- 이런 분께 추천 -->
                                ${recommendations.length > 0 ? `
                                    <div class="bg-blue-50 rounded-lg p-3 text-sm">
                                        <div class="font-semibold text-blue-900 mb-1">
                                            <i class="fas fa-user-check mr-1"></i>이런 분께 추천
                                        </div>
                                        <ul class="text-blue-700 space-y-1">
                                            ${recommendations.slice(0, 2).map(rec => `
                                                <li class="flex items-start">
                                                    <span class="mr-1">•</span>
                                                    <span>${rec}</span>
                                                </li>
                                            `).join('')}
                                        </ul>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('recommendResults').innerHTML = html;
}

/**
 * 쇼츠 카테고리별 표시
 */
function showShortsCategory(category) {
    const allContent = [...allMovies, ...allDramas];
    let filtered = [];
    let title = '';
    
    // 모든 항목에 쇼츠 점수 계산
    allContent.forEach(item => {
        item.shortsScore = calculateShortsScore(item);
    });
    
    switch(category) {
        case 'hot':
            title = '🚀 지금 만들면 대박';
            // 최근 7일 이내 개봉 + 평점 높음 + 쇼츠 점수 높음
            const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
            filtered = allContent.filter(item => {
                const isRecent = item.release_date && item.release_date > sevenDaysAgo;
                const goodRating = (item.rating || item.reaction_score || 0) >= 8.0;
                const goodShortsScore = item.shortsScore >= 70;
                return isRecent && goodRating && goodShortsScore;
            });
            filtered.sort((a, b) => b.shortsScore - a.shortsScore);
            
            // 최근 작품이 없으면 쇼츠 점수 80점 이상 작품으로 대체
            if (filtered.length === 0) {
                filtered = allContent.filter(item => item.shortsScore >= 80);
                filtered.sort((a, b) => b.shortsScore - a.shortsScore);
            }
            break;
            
        case 'lowcomp':
            title = '💰 저경쟁 고인기';
            // AI 분석이 완료된 작품 중 쇼츠 개수 적고 평점 높음
            filtered = allContent.filter(item => {
                // AI 분석이 완료된 작품만 (shorts_channel_count가 null이 아님)
                const hasAnalysis = item.shorts_channel_count !== null && item.shorts_channel_count !== undefined;
                const shortsCount = item.shorts_channel_count || 0;
                const rating = item.rating || item.reaction_score || 0;
                const shortsScore = item.shortsScore || 0;
                
                // 조건: AI 분석 완료 + 쇼츠 20개 미만 + 평점 7.5+ + 쇼츠 점수 65+
                return hasAnalysis && shortsCount < 20 && rating >= 7.5 && shortsScore >= 65;
            });
            
            // 쇼츠 점수순으로 정렬 (높은 순)
            filtered.sort((a, b) => b.shortsScore - a.shortsScore);
            break;
            
        case 'niche':
            title = '🎯 숨은 명작';
            // 흥행에는 실패했지만 평점이 높은 작품
            filtered = allContent.filter(item => {
                const rating = item.rating || item.reaction_score || 0;
                const audience = item.audience_count || 0;
                // 평점 7.5 이상이지만 관객수 100만 미만 (흥행 실패)
                return rating >= 7.5 && audience < 1000000;
            });
            filtered.sort((a, b) => {
                const ratingA = a.rating || a.reaction_score || 0;
                const ratingB = b.rating || b.reaction_score || 0;
                return ratingB - ratingA;
            });
            break;
            
        case 'verified':
            title = '✅ 유저 평가 최고작';
            // 유저들의 안전도 평가가 가장 좋은 작품 (safety_rating 기준)
            filtered = allContent.filter(item => {
                // 안전도 평가가 있고, 최소 3명 이상 참여한 작품
                return item.safety_ratings && 
                       item.safety_ratings.length >= 3 && 
                       item.safety_rating_average >= 7.0;
            });
            // 안전도 평균 점수 높은 순으로 정렬
            filtered.sort((a, b) => {
                const safetyA = a.safety_rating_average || 0;
                const safetyB = b.safety_rating_average || 0;
                // 점수가 같으면 참여자 수로 정렬
                if (safetyA === safetyB) {
                    return (b.safety_rating_count || 0) - (a.safety_rating_count || 0);
                }
                return safetyB - safetyA;
            });
            break;
            
        case 'admin':
            title = '👑 운영자 추천 작품';
            // 운영자가 추천한 작품 (admin_recommended = true)
            filtered = allContent.filter(item => item.admin_recommended);
            filtered.sort((a, b) => b.shortsScore - a.shortsScore);
            break;
            
        case 'classic':
            title = '🎬 과거 명작 (2000년 이전)';
            // 2000년 1월 1일 타임스탬프
            const year2000 = new Date('2000-01-01').getTime();
            filtered = allContent.filter(item => {
                const beforeYear2000 = item.release_date && item.release_date < year2000;
                const goodRating = (item.rating || item.reaction_score || 0) >= 7.5;
                return beforeYear2000 && goodRating;
            });
            filtered.sort((a, b) => {
                const ratingA = a.rating || a.reaction_score || 0;
                const ratingB = b.rating || b.reaction_score || 0;
                return ratingB - ratingA;
            });
            break;
    }
    
    // 상위 20개
    filtered = filtered.slice(0, 20);
    
    displayShortsRecommendations(title, filtered);
}

/**
 * 추천 결과 표시 (오늘 뭐볼까?)
 */
function displayRecommendations(title, items) {
    const html = `
        <div class="mb-4">
            <h3 class="text-2xl font-bold mb-6">${title}</h3>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                ${items.map(item => `
                    <div onclick="showDetail('${item.id.includes('drama') ? 'dramas' : 'movies'}', '${item.id}')" 
                         class="cursor-pointer group">
                        <div class="relative rounded-lg overflow-hidden shadow-md hover:shadow-xl transition">
                            ${item.poster_url ? `
                                <img src="${item.poster_url}" alt="${escapeHtml(item.title)}" 
                                     class="w-full h-80 object-cover group-hover:scale-105 transition">
                            ` : `
                                <div class="w-full h-80 bg-gray-200 flex items-center justify-center">
                                    <i class="fas fa-film text-4xl text-gray-400"></i>
                                </div>
                            `}
                            <div class="absolute top-2 right-2">
                                <span class="px-2 py-1 bg-black bg-opacity-70 text-white text-sm rounded">
                                    ⭐ ${(item.rating || item.reaction_score || 0).toFixed(1)}
                                </span>
                            </div>
                        </div>
                        <div class="mt-2">
                            <h4 class="font-semibold text-sm line-clamp-1">${escapeHtml(item.title)}</h4>
                            <p class="text-xs text-gray-500">${item.release_date ? new Date(item.release_date).getFullYear() : ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('recommendResults').innerHTML = html;
}

/**
 * 쇼츠 추천 결과 표시 (쇼츠 제작)
 */
function displayShortsRecommendations(title, items) {
    const html = `
        <div class="mb-4">
            <h3 class="text-2xl font-bold mb-6">${title}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${items.map(item => {
                    const score = item.shortsScore || calculateShortsScore(item);
                    const grade = getShortsGrade(score, item); // item 전달
                    const competition = getCompetitionLevel(item.shorts_channel_count || 0);
                    const safety = getCopyrightSafety(item);
                    
                    return `
                        <div class="bg-white border rounded-lg p-4 hover:shadow-lg transition">
                            <div class="flex gap-4">
                                <!-- 포스터 -->
                                <div class="flex-shrink-0 w-24">
                                    ${item.poster_url ? `
                                        <img src="${item.poster_url}" alt="${escapeHtml(item.title)}" 
                                             class="w-24 h-36 object-cover rounded">
                                    ` : `
                                        <div class="w-24 h-36 bg-gray-200 rounded flex items-center justify-center">
                                            <i class="fas fa-film text-2xl text-gray-400"></i>
                                        </div>
                                    `}
                                </div>
                                
                                <!-- 정보 -->
                                <div class="flex-1 min-w-0">
                                    <h4 class="font-bold text-lg mb-2 line-clamp-1">${escapeHtml(item.title)}</h4>
                                    
                                    <!-- 쇼츠 적합도 점수 -->
                                    <div class="mb-3">
                                        <div class="flex items-center gap-2 mb-1">
                                            <span class="text-2xl font-bold ${grade.color} text-white px-3 py-1 rounded">${score}</span>
                                            <span class="text-sm font-medium">${grade.emoji} ${grade.text}</span>
                                        </div>
                                        <div class="w-full bg-gray-200 rounded-full h-2">
                                            <div class="${grade.color} h-2 rounded-full" style="width: ${score}%"></div>
                                        </div>
                                    </div>
                                    
                                    <!-- 상세 정보 -->
                                    <div class="space-y-1 text-sm">
                                        <div class="flex items-center gap-2">
                                            <span class="text-gray-500">저작권:</span>
                                            <span class="${safety.color} font-medium">${safety.icon} ${safety.level}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-gray-500">경쟁도:</span>
                                            <span class="${competition.color} font-medium">${competition.stars} ${competition.level}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <span class="text-gray-500">평점:</span>
                                            <span class="font-medium">⭐ ${(item.rating || item.reaction_score || 0).toFixed(1)}</span>
                                        </div>
                                    </div>
                                    
                                    <!-- 버튼 -->
                                    <div class="flex gap-2 mt-3">
                                        <button onclick="searchYouTubeShorts('${escapeHtml(item.title).replace(/'/g, "\\'")}', '${item.id.includes('drama') ? 'dramas' : 'movies'}'); event.stopPropagation();" 
                                                class="flex-1 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                                            <i class="fab fa-youtube mr-1"></i>쇼츠 검색
                                        </button>
                                        <button onclick="showDetail('${item.id.includes('drama') ? 'dramas' : 'movies'}', '${item.id}'); event.stopPropagation();" 
                                                class="flex-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">
                                            <i class="fas fa-info-circle mr-1"></i>상세보기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    document.getElementById('shortsResults').innerHTML = html;
}

/**
 * 내가 본 작품 가져오기 (localStorage 사용)
 */
function getWatchedItems() {
    const watched = localStorage.getItem('watchedItems');
    return watched ? JSON.parse(watched) : [];
}

/**
 * 내가 만든 쇼츠 가져오기 (localStorage 사용)
 */
function getCreatedShorts() {
    const created = localStorage.getItem('createdShorts');
    return created ? JSON.parse(created) : [];
}

/**
 * 작품을 "본 작품"에 추가
 */
function markAsWatched(itemId) {
    const watched = getWatchedItems();
    if (!watched.includes(itemId)) {
        watched.push(itemId);
        localStorage.setItem('watchedItems', JSON.stringify(watched));
        showToast('추가됨', '내가 본 작품에 추가되었습니다!', 'success');
    }
}

/**
 * 작품을 "만든 쇼츠"에 추가
 */
function markAsCreated(itemId) {
    const created = getCreatedShorts();
    if (!created.includes(itemId)) {
        created.push(itemId);
        localStorage.setItem('createdShorts', JSON.stringify(created));
        showToast('추가됨', '만든 쇼츠에 추가되었습니다!', 'success');
    }
}

/**
 * 내가 본 작품 기반 추천
 */
function showWatchedBasedRecommendations() {
    const watchedIds = getWatchedItems();
    const allContent = [...allMovies, ...allDramas];
    const watchedItems = allContent.filter(item => watchedIds.includes(item.id));
    
    if (watchedItems.length === 0) return;
    
    // 본 작품들의 장르, 배우, 감독 수집
    const genres = new Set();
    const actors = new Set();
    const directors = new Set();
    
    watchedItems.forEach(item => {
        if (item.genre) item.genre.split(',').forEach(g => genres.add(g.trim()));
        if (item.actors) item.actors.split(',').forEach(a => actors.add(a.trim()));
        if (item.director) directors.add(item.director.trim());
    });
    
    // 유사 작품 찾기
    const recommendations = allContent
        .filter(item => !watchedIds.includes(item.id))
        .map(item => {
            let score = 0;
            
            // 장르 매칭
            if (item.genre) {
                item.genre.split(',').forEach(g => {
                    if (genres.has(g.trim())) score += 3;
                });
            }
            
            // 배우 매칭
            if (item.actors) {
                item.actors.split(',').forEach(a => {
                    if (actors.has(a.trim())) score += 5;
                });
            }
            
            // 감독 매칭
            if (item.director && directors.has(item.director.trim())) {
                score += 4;
            }
            
            return { ...item, matchScore: score };
        })
        .filter(item => item.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 12);
    
    if (recommendations.length > 0) {
        displayRecommendations('📚 내가 본 작품과 비슷한 영화/드라마', recommendations);
    }
}

/**
 * 만든 쇼츠 기반 추천
 */
function showShortsBasedRecommendations() {
    const createdIds = getCreatedShorts();
    const allContent = [...allMovies, ...allDramas];
    const createdItems = allContent.filter(item => createdIds.includes(item.id));
    
    if (createdItems.length === 0) return;
    
    // 만든 쇼츠들의 특징 수집
    const genres = new Set();
    const actors = new Set();
    
    createdItems.forEach(item => {
        if (item.genre) item.genre.split(',').forEach(g => genres.add(g.trim()));
        if (item.actors) item.actors.split(',').forEach(a => actors.add(a.trim()));
    });
    
    // 유사 작품 찾기
    const recommendations = allContent
        .filter(item => !createdIds.includes(item.id))
        .map(item => {
            let score = calculateShortsScore(item);
            let matchScore = 0;
            
            // 장르 매칭
            if (item.genre) {
                item.genre.split(',').forEach(g => {
                    if (genres.has(g.trim())) matchScore += 3;
                });
            }
            
            // 배우 매칭
            if (item.actors) {
                item.actors.split(',').forEach(a => {
                    if (actors.has(a.trim())) matchScore += 5;
                });
            }
            
            return { ...item, shortsScore: score, matchScore: matchScore };
        })
        .filter(item => item.matchScore > 0 && item.shortsScore >= 60)
        .sort((a, b) => (b.matchScore + b.shortsScore) - (a.matchScore + a.shortsScore))
        .slice(0, 12);
    
    if (recommendations.length > 0) {
        displayShortsRecommendations('🎬 내가 만든 쇼츠와 비슷한 작품', recommendations);
    }
}

/**
 * 자동으로 명작 20개 추천
 */
function showAutoMasterpieces() {
    const allContent = [...allMovies, ...allDramas];
    
    if (allContent.length === 0) {
        // 데이터가 없으면 안내 메시지
        const container = document.getElementById('recommendResults');
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <i class="fas fa-film text-6xl text-gray-300 mb-4"></i>
                <h3 class="text-xl font-bold text-gray-700 mb-2">작품이 없습니다</h3>
                <p class="text-gray-500 mb-6">먼저 작품을 추가해주세요!</p>
                <button onclick="openBulkImport()" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <i class="fas fa-download mr-2"></i>인기작 자동 가져오기
                </button>
            </div>
        `;
        return;
    }
    
    // 평점 8.0 이상 명작 필터링
    const masterpieces = allContent.filter(item => {
        const score = item.rating || item.reaction_score || 0;
        return score >= 8.0;
    });
    
    // 평점순 정렬
    masterpieces.sort((a, b) => {
        const ratingA = a.rating || a.reaction_score || 0;
        const ratingB = b.rating || b.reaction_score || 0;
        return ratingB - ratingA;
    });
    
    // 상위 20개
    const top20 = masterpieces.slice(0, 20);
    
    if (top20.length === 0) {
        // 명작이 없으면 전체에서 평점 높은 순으로
        allContent.sort((a, b) => {
            const ratingA = a.rating || a.reaction_score || 0;
            const ratingB = b.rating || b.reaction_score || 0;
            return ratingB - ratingA;
        });
        
        const recommendations = allContent.slice(0, 20);
        displayEnhancedRecommendations('⭐ 추천 작품', recommendations);
    } else {
        displayEnhancedRecommendations('⭐ 명작 추천', top20);
    }
}

console.log('✅ recommend.js 로드 완료');
