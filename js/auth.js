/**
 * 인증 시스템 JavaScript
 * - 로그인 체크
 * - 세션 관리
 * - 로그아웃
 * - 관리자 권한 확인
 */

// 현재 로그인한 사용자 정보
let currentUser = null;

/**
 * 로그인 체크 (페이지 로드 시 실행)
 */
function checkAuth() {
    const userJson = localStorage.getItem('currentUser');
    
    if (!userJson) {
        // 로그인하지 않았으면 auth.html로 리다이렉트
        console.log('❌ 로그인되지 않음 → auth.html로 이동');
        window.location.href = 'auth.html';
        return false;
    }
    
    try {
        currentUser = JSON.parse(userJson);
        console.log('✅ 로그인됨:', currentUser.email);
        
        // 사용자 정보 UI 업데이트
        updateUserUI();
        
        // 관리자 탭 표시 여부
        if (currentUser.is_admin) {
            console.log('👑 관리자 권한 확인');
            document.getElementById('tabAdmin').classList.remove('hidden');
        } else {
            document.getElementById('tabAdmin').classList.add('hidden');
        }
        
        return true;
    } catch (error) {
        console.error('세션 파싱 오류:', error);
        localStorage.removeItem('currentUser');
        window.location.href = 'auth.html';
        return false;
    }
}

/**
 * 사용자 정보 UI 업데이트
 */
function updateUserUI() {
    if (!currentUser) return;
    
    // 헤더에 사용자 이름 표시
    const headerUserName = document.getElementById('headerUserName');
    if (headerUserName) {
        headerUserName.textContent = currentUser.name;
    }
    
    // 프로필 사진 표시
    const headerProfilePic = document.getElementById('headerProfilePic');
    if (headerProfilePic && currentUser.profile_pic) {
        headerProfilePic.src = currentUser.profile_pic;
    }
}

/**
 * 로그아웃
 */
function logout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('tmdbApiKey');
        localStorage.removeItem('youtubeApiKey');
        
        console.log('🔓 로그아웃 완료');
        window.location.href = 'auth.html';
    }
}

/**
 * 관리자 권한 확인
 */
function isAdmin() {
    return currentUser && currentUser.is_admin === true;
}

/**
 * 관리자 페이지 접근 체크
 */
function checkAdminAccess() {
    if (!isAdmin()) {
        alert('⚠️ 관리자 권한이 필요합니다.');
        switchTab('home');
        return false;
    }
    return true;
}

/**
 * 현재 사용자 정보 반환
 */
function getCurrentUser() {
    return currentUser;
}

/**
 * API 키 가져오기
 * Note: getTmdbApiKey and getYoutubeApiKey are now in api.js (더 완전한 버전)
 * api.js는 localStorage fallback도 포함하여 더 안정적입니다.
 */

// Export to window
window.checkAuth = checkAuth;
window.logout = logout;
window.isAdmin = isAdmin;
window.checkAdminAccess = checkAdminAccess;
window.getCurrentUser = getCurrentUser;

console.log('🔐 인증 시스템 로드 완료');
