// 랜딩 페이지 JavaScript

// Google 로그인 초기화
window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 랜딩 페이지 로드');
    
    // 이미 로그인되어 있으면 메인으로
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            if (user.is_approved) {
                console.log('✅ 이미 로그인되고 승인됨, index.html로 이동');
                window.location.href = 'index.html';
                return;
            }
        } catch (e) {
            console.error('세션 파싱 오류:', e);
            localStorage.removeItem('currentUser');
        }
    }
    
    // Google Identity Services 초기화
    if (window.google) {
        try {
            // Google OAuth Client ID (실제 Client ID 적용 완료!)
            const GOOGLE_CLIENT_ID = '451333152930-7ld2h59107cj47k3f268peoq5sc8t9rq.apps.googleusercontent.com';
            
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCallback,
                auto_select: false,
                cancel_on_tap_outside: true
            });
            console.log('✅ Google 로그인 초기화 완료');
        } catch (e) {
            console.error('Google 초기화 오류:', e);
            console.warn('⚠️ Google OAuth Client ID가 올바르지 않을 수 있습니다.');
        }
    } else {
        console.log('⏳ Google 로그인 라이브러리 로딩 중...');
    }
});

// Google 로그인 처리
function handleGoogleLogin() {
    console.log('🌐 Google 로그인 시도');
    
    if (!window.google || !window.google.accounts) {
        alert('⚠️ Google 로그인 서비스를 불러오는 중입니다.\n\n잠시 후 다시 시도해주세요.');
        console.error('Google Identity Services가 로드되지 않았습니다');
        return;
    }
    
    try {
        // Google One Tap 로그인 프롬프트 표시
        google.accounts.id.prompt((notification) => {
            console.log('Google 로그인 알림:', notification);
            
            if (notification.isNotDisplayed()) {
                console.warn('Google One Tap이 표시되지 않음:', notification.getNotDisplayedReason());
                alert('⚠️ Google 로그인 팝업이 차단되었습니다.\n\n팝업 차단을 해제하고 다시 시도해주세요.');
            } else if (notification.isSkippedMoment()) {
                console.warn('Google One Tap을 사용자가 건너뜀:', notification.getSkippedReason());
            }
        });
    } catch (error) {
        console.error('Google 로그인 오류:', error);
        alert('⚠️ Google 로그인 중 오류가 발생했습니다.\n\n' + error.message);
    }
}

// Google 콜백
async function handleGoogleCallback(response) {
    try {
        const credential = response.credential;
        const payload = parseJwt(credential);
        
        console.log('👤 Google 사용자:', payload.email);
        
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;
        
        // 기존 사용자 확인
        const checkResponse = await fetch(`tables/users?search=${encodeURIComponent(email)}&limit=1`);
        const checkData = await checkResponse.json();
        
        if (checkData.data && checkData.data.length > 0) {
            // 기존 사용자 - 로그인
            const user = checkData.data[0];
            
            if (!user.is_approved) {
                alert('⏳ 관리자 승인 대기 중입니다.\n\n승인 후 이용 가능합니다.');
                return;
            }
            
            // 로그인 처리
            await fetch(`tables/users/${user.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ last_login: new Date().toISOString() })
            });
            
            const session = {
                id: user.id,
                email: user.email,
                name: user.name,
                is_admin: user.is_admin,
                is_approved: user.is_approved,
                profile_pic: user.profile_pic || picture,
                youtube_api_key: user.youtube_api_key,
                tmdb_api_key: user.tmdb_api_key
            };
            
            localStorage.setItem('currentUser', JSON.stringify(session));
            
            alert('✅ 로그인 성공!');
            window.location.href = 'index.html';
            
        } else {
            // 신규 사용자 - 자동 가입 (승인 대기)
            const now = new Date().toISOString();
            const newUserResponse = await fetch('tables/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    name: name,
                    password_hash: 'GOOGLE_AUTH',
                    youtube_api_key: '',
                    tmdb_api_key: '',
                    is_admin: false,
                    is_approved: false,
                    profile_pic: picture || '',
                    created_at: now,
                    last_login: now
                })
            });
            
            if (!newUserResponse.ok) {
                throw new Error('회원가입 실패');
            }
            
            alert('🎉 회원가입 완료!\n\n⏳ 관리자 승인 후 이용 가능합니다.\n승인 알림은 이메일로 발송됩니다.');
        }
        
    } catch (error) {
        console.error('❌ Google 로그인 오류:', error);
        alert('로그인 처리 중 오류가 발생했습니다: ' + error.message);
    }
}

// JWT 파싱
function parseJwt(token) {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
}

// 데모 모드
function startDemo() {
    console.log('🎭 데모 모드 시작');
    window.location.href = 'index.html?demo=true';
}

// 전역 함수로 노출
window.handleGoogleLogin = handleGoogleLogin;
window.startDemo = startDemo;
window.handleGoogleCallback = handleGoogleCallback;
