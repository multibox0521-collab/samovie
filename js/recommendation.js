// Recommendation System

// Get recommendations for a movie/drama
function getRecommendations(item, allItems, type, limit = 6) {
    const recommendations = [];
    
    // Score each item based on similarity
    for (const candidate of allItems) {
        if (candidate.id === item.id) continue; // Skip the same item
        
        let score = 0;
        
        // Genre similarity (highest weight)
        if (item.genre && candidate.genre) {
            const itemGenres = item.genre.toLowerCase().split(',').map(g => g.trim());
            const candidateGenres = candidate.genre.toLowerCase().split(',').map(g => g.trim());
            const commonGenres = itemGenres.filter(g => candidateGenres.includes(g));
            score += commonGenres.length * 30;
        }
        
        // Actor similarity
        if (item.actors && candidate.actors) {
            const itemActors = item.actors.toLowerCase().split(',').map(a => a.trim());
            const candidateActors = candidate.actors.toLowerCase().split(',').map(a => a.trim());
            const commonActors = itemActors.filter(a => candidateActors.includes(a));
            score += commonActors.length * 20;
        }
        
        // Director similarity
        if (item.director && candidate.director && 
            item.director.toLowerCase() === candidate.director.toLowerCase()) {
            score += 25;
        }
        
        // Rating similarity
        const itemRating = type === 'movies' ? item.rating : item.reaction_score;
        const candidateRating = type === 'movies' ? candidate.rating : candidate.reaction_score;
        if (itemRating && candidateRating) {
            const ratingDiff = Math.abs(itemRating - candidateRating);
            score += Math.max(0, 10 - ratingDiff);
        }
        
        // Release year similarity (prefer similar era)
        if (item.release_date && candidate.release_date) {
            const itemYear = new Date(item.release_date).getFullYear();
            const candidateYear = new Date(candidate.release_date).getFullYear();
            const yearDiff = Math.abs(itemYear - candidateYear);
            if (yearDiff <= 2) score += 10;
            else if (yearDiff <= 5) score += 5;
        }
        
        // Verified safe bonus
        if (candidate.is_verified_safe) {
            score += 5;
        }
        
        // Emotion tags similarity (if available)
        if (item.emotion_tags && candidate.emotion_tags) {
            const itemTags = item.emotion_tags;
            const candidateTags = candidate.emotion_tags;
            const commonTags = itemTags.filter(t => candidateTags.includes(t));
            score += commonTags.length * 15;
        }
        
        // Production company similarity
        if (item.production_companies && candidate.production_companies) {
            const itemCompanies = item.production_companies.toLowerCase().split(',').map(c => c.trim());
            const candidateCompanies = candidate.production_companies.toLowerCase().split(',').map(c => c.trim());
            const commonCompanies = itemCompanies.filter(c => candidateCompanies.includes(c));
            score += commonCompanies.length * 10;
        }
        
        if (score > 0) {
            recommendations.push({
                item: candidate,
                score: score
            });
        }
    }
    
    // Sort by score and return top N
    recommendations.sort((a, b) => b.score - a.score);
    return recommendations.slice(0, limit).map(r => r.item);
}

// Get recommendations by genre
function getRecommendationsByGenre(genre, allItems, excludeId, limit = 6) {
    const genreLower = genre.toLowerCase();
    
    const matches = allItems.filter(item => {
        if (item.id === excludeId) return false;
        if (!item.genre) return false;
        return item.genre.toLowerCase().includes(genreLower);
    });
    
    // Sort by rating
    matches.sort((a, b) => {
        const aRating = a.rating || a.reaction_score || 0;
        const bRating = b.rating || b.reaction_score || 0;
        return bRating - aRating;
    });
    
    return matches.slice(0, limit);
}

// Get recommendations by actor
function getRecommendationsByActor(actor, allItems, excludeId, limit = 6) {
    const actorLower = actor.toLowerCase();
    
    const matches = allItems.filter(item => {
        if (item.id === excludeId) return false;
        if (!item.actors) return false;
        return item.actors.toLowerCase().includes(actorLower);
    });
    
    // Sort by release date (newest first)
    matches.sort((a, b) => {
        const aDate = a.release_date ? new Date(a.release_date).getTime() : 0;
        const bDate = b.release_date ? new Date(b.release_date).getTime() : 0;
        return bDate - aDate;
    });
    
    return matches.slice(0, limit);
}

// Get recommendations by director
function getRecommendationsByDirector(director, allItems, excludeId, limit = 6) {
    const directorLower = director.toLowerCase();
    
    const matches = allItems.filter(item => {
        if (item.id === excludeId) return false;
        if (!item.director) return false;
        return item.director.toLowerCase() === directorLower;
    });
    
    // Sort by rating
    matches.sort((a, b) => {
        const aRating = a.rating || a.reaction_score || 0;
        const bRating = b.rating || b.reaction_score || 0;
        return bRating - aRating;
    });
    
    return matches.slice(0, limit);
}

// Show recommendations in detail modal
function showRecommendationsInModal(type, id) {
    let item, allItems;
    
    if (type === 'movies') {
        item = allMovies.find(m => m.id === id);
        allItems = allMovies;
    } else {
        item = allDramas.find(d => d.id === id);
        allItems = allDramas;
    }
    
    if (!item || allItems.length <= 1) return '';
    
    const recommendations = getRecommendations(item, allItems, type, 6);
    
    if (recommendations.length === 0) return '';
    
    let html = `
        <div class="mt-6 pt-6 border-t border-gray-200">
            <h4 class="font-semibold text-gray-900 mb-3 flex items-center">
                <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                이 작품을 좋아한다면?
            </h4>
            <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
    `;
    
    for (const rec of recommendations) {
        const posterUrl = rec.poster_url || '';
        const rating = type === 'movies' ? rec.rating : rec.reaction_score;
        const year = rec.release_date ? new Date(rec.release_date).getFullYear() : '미정';
        
        html += `
            <div class="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition cursor-pointer"
                 onclick="showDetail('${type}', '${rec.id}')">
                ${posterUrl ? 
                    `<img src="${posterUrl}" alt="${escapeHtml(rec.title)}" class="w-full aspect-[2/3] object-cover">` :
                    `<div class="w-full aspect-[2/3] bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white">
                        <i class="fas fa-${type === 'movies' ? 'film' : 'tv'} text-3xl opacity-50"></i>
                    </div>`
                }
                <div class="p-2">
                    <h5 class="text-xs font-semibold line-clamp-1 mb-1" title="${escapeHtml(rec.title)}">
                        ${escapeHtml(rec.title)}
                    </h5>
                    <div class="flex items-center justify-between text-xs text-gray-600">
                        <span>${year}</span>
                        ${rating ? `<span>⭐ ${rating}</span>` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    html += `
            </div>
            
            ${item.genre ? `
                <div class="mt-4">
                    <button onclick="showGenreRecommendations('${type}', '${item.genre.split(',')[0].trim()}', '${id}')" 
                        class="text-sm text-blue-600 hover:underline">
                        <i class="fas fa-tags mr-1"></i>
                        "${item.genre.split(',')[0].trim()}" 장르 더보기
                    </button>
                </div>
            ` : ''}
            
            ${item.actors ? `
                <div class="mt-2">
                    <button onclick="showActorRecommendations('${type}', '${item.actors.split(',')[0].trim()}', '${id}')" 
                        class="text-sm text-blue-600 hover:underline">
                        <i class="fas fa-user mr-1"></i>
                        "${item.actors.split(',')[0].trim()}" 출연작 더보기
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    return html;
}

// Show genre recommendations modal
function showGenreRecommendations(type, genre, excludeId) {
    closeDetail();
    
    const allItems = type === 'movies' ? allMovies : allDramas;
    const recommendations = getRecommendationsByGenre(genre, allItems, excludeId, 20);
    
    if (recommendations.length === 0) {
        alert('해당 장르의 다른 작품이 없습니다.');
        return;
    }
    
    showRecommendationModal(type, `"${genre}" 장르 추천`, recommendations);
}

// Show actor recommendations modal
function showActorRecommendations(type, actor, excludeId) {
    closeDetail();
    
    const allItems = type === 'movies' ? [...allMovies, ...allDramas] : [...allDramas, ...allMovies];
    const recommendations = getRecommendationsByActor(actor, allItems, excludeId, 20);
    
    if (recommendations.length === 0) {
        alert('해당 배우의 다른 작품이 없습니다.');
        return;
    }
    
    showRecommendationModal('mixed', `"${actor}" 출연작`, recommendations);
}

// Show recommendation modal
function showRecommendationModal(type, title, items) {
    const modalHtml = `
        <div class="flex justify-between items-center mb-4">
            <h3 class="text-xl font-bold text-gray-900">
                <i class="fas fa-lightbulb text-yellow-500 mr-2"></i>
                ${title}
            </h3>
            <button onclick="closeRecommendationModal()" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            ${items.map(item => {
                const posterUrl = item.poster_url || '';
                const rating = item.rating || item.reaction_score;
                const year = item.release_date ? new Date(item.release_date).getFullYear() : '미정';
                const itemType = allMovies.find(m => m.id === item.id) ? 'movies' : 'dramas';
                
                return `
                    <div class="poster-card bg-white rounded-lg overflow-hidden shadow-sm cursor-pointer"
                         onclick="closeRecommendationModal(); showDetail('${itemType}', '${item.id}')">
                        ${posterUrl ? 
                            `<img src="${posterUrl}" alt="${escapeHtml(item.title)}" class="poster-img w-full">` :
                            `<div class="poster-img flex items-center justify-center text-white">
                                <i class="fas fa-film text-4xl opacity-50"></i>
                            </div>`
                        }
                        <div class="p-3">
                            <h5 class="text-sm font-semibold line-clamp-2 mb-1" title="${escapeHtml(item.title)}">
                                ${escapeHtml(item.title)}
                            </h5>
                            <div class="flex items-center justify-between text-xs text-gray-600">
                                <span>${year}</span>
                                ${rating ? `<span>⭐ ${rating}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    
    document.getElementById('recommendationContent').innerHTML = modalHtml;
    document.getElementById('recommendationModal').classList.remove('hidden');
}

// Close recommendation modal
function closeRecommendationModal() {
    document.getElementById('recommendationModal').classList.add('hidden');
}

// Export to window
window.showGenreRecommendations = showGenreRecommendations;
window.showActorRecommendations = showActorRecommendations;
window.closeRecommendationModal = closeRecommendationModal;
