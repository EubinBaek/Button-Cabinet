class GridEffect {
    constructor(options = {}) {
        // 이미 생성된 GridEffect 인스턴스가 있는지 확인
        if (window.existingGridEffect) {
            console.log('기존 GridEffect 인스턴스가 제거됩니다.');
            window.existingGridEffect.destroy();
        }
        
        // 전역 참조 저장
        window.existingGridEffect = this;
        
        this.canvas = options.canvas || document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.mouse = { x: 0, y: 0 };
        this.prevMouse = { x: 0, y: 0 };
        this.radius = options.pointSize || 1;
        this.spacing = options.spacing || 10;
        this.pointColor = options.pointColor || 'rgba(0, 0, 0, 0.05)'; // 점 색상 - 투명도를 0.05로 설정
        this.hoverColor = options.hoverColor || 'rgba(255, 255, 255, 0.7)';
        this.isInteractive = true; // 처음부터 인터랙티브 모드 활성화
        this.activatedPoints = new Set(); // 활성화된 점들을 저장하는 Set
        this.navHeight = 0; // 상단 네비게이션 바의 높이
        this.maxRadius = options.maxRadius || 25; // 최대 반경
        
        // 네온 계열 색상 배열
        this.neonColors = [
            '#FF36FF', // 네온 핑크
            '#00FFFF', // 네온 시안
            '#39FF14', // 네온 그린
            '#FE0000', // 네온 레드
            '#FF9933', // 네온 오렌지
            '#FFFF33'  // 네온 옐로우
        ];
        
        this.currentColorIndex = 0;
        this.colorChangeInterval = 20000; // 20초마다 색상 변경
        this.lastColorChangeTime = Date.now();
        
        this.resetInterval = options.resetInterval || 0; // 점 리셋 기능 비활성화 (0으로 설정)
        this.lastResetTime = Date.now();
        
        // 이벤트 핸들러 바인딩 (제거를 위해 참조 저장)
        this.resizeHandler = this.onResize.bind(this);
        this.mouseMoveHandler = this.onMouseMove.bind(this);
        this.animationId = null;
        
        this.init();
    }
    
    init() {
        // 기존에 만들어진 canvas 요소 제거 (ID로 확인)
        const existingCanvas = document.getElementById('grid-canvas');
        if (existingCanvas) {
            existingCanvas.remove();
        }
        
        // 캔버스에 ID 추가
        this.canvas.id = 'grid-canvas';
        
        // 캔버스 스타일 설정
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.pointerEvents = 'none';
        this.canvas.style.zIndex = '-1';
        
        // 캔버스를 body의 첫 번째 자식으로 추가
        if (document.body.firstChild) {
            document.body.insertBefore(this.canvas, document.body.firstChild);
        } else {
            document.body.appendChild(this.canvas);
        }
        
        // 상단 네비게이션 바의 높이를 가져옴
        const navBar = document.querySelector('.top-nav');
        if (navBar) {
            this.navHeight = navBar.offsetHeight;
        }
        
        // 캔버스 크기 설정
        this.resize();
        
        // 이벤트 리스너 등록
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('mousemove', this.mouseMoveHandler);
        
        // 애니메이션 시작
        this.startAnimation();
    }
    
    // 이벤트 핸들러 메서드
    onResize() {
        // 리사이즈 시 네비게이션 바 높이 다시 계산
        const navBar = document.querySelector('.top-nav');
        if (navBar) {
            this.navHeight = navBar.offsetHeight;
        }
        this.resize();
    }
    
    onMouseMove(e) {
        this.prevMouse.x = this.mouse.x;
        this.prevMouse.y = this.mouse.y;
        this.mouse.x = e.clientX;
        this.mouse.y = e.clientY;
        
        if (this.isInteractive) {
            this.activatePointsInBrushArea();
        }
    }
    
    // 인스턴스 제거 메서드
    destroy() {
        // 애니메이션 중지
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // 이벤트 리스너 제거
        window.removeEventListener('resize', this.resizeHandler);
        window.removeEventListener('mousemove', this.mouseMoveHandler);
        
        // 캔버스 요소 제거
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
        
        // 참조 제거
        this.points = [];
        this.activatedPoints.clear();
    }
    
    resize() {
        // 캔버스 크기를 정수로 설정하여 픽셀 정렬 문제 방지
        this.canvas.width = Math.floor(window.innerWidth);
        this.canvas.height = Math.floor(window.innerHeight);
        this.createPoints();
        this.activatedPoints.clear(); // 리사이즈 시 활성화된 점들 초기화
    }
    
    createPoints() {
        this.points = [];
        
        // 그리드 생성 - 정확한 정수 간격 사용
        const spacing = Math.round(this.spacing);
        
        // 화면 크기에 맞게 행과 열 계산
        const rows = Math.ceil(this.canvas.height / spacing);
        const cols = Math.ceil(this.canvas.width / spacing);
        
        // 그리드 좌표 맵 - 중복 방지용
        const pointMap = new Set();
        
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                // 정확한 정수 좌표 계산
                const x = j * spacing;
                const y = i * spacing;
                
                // 상단 네비게이션 바 영역의 점들은 제외
                if (y >= this.navHeight) {
                    const pointId = `${x}-${y}`;
                    
                    // 중복 검사
                    if (!pointMap.has(pointId)) {
                        pointMap.add(pointId);
                        this.points.push({
                            x: x,
                            y: y,
                            id: pointId
                        });
                    }
                }
            }
        }
    }
    
    activatePointsInBrushArea() {
        // 현재 마우스 위치 주변의 점들을 활성화
        // 상단 네비게이션 바 영역은 제외
        if (this.mouse.y < this.navHeight) return;
        
        this.points.forEach(point => {
            const dx = point.x - this.mouse.x;
            const dy = point.y - this.mouse.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 30) { // 브러시 범위 30px
                this.activatedPoints.add(point.id);
            }
        });
    }
    
    checkResetPoints() {
        // 점 리셋 기능 비활성화 (타이머 제거)
        if (this.resetInterval <= 0) return;
        
        const now = Date.now();
        if (now - this.lastResetTime > this.resetInterval) {
            this.activatedPoints.clear();
            this.lastResetTime = now;
        }
    }
    
    getCurrentColor() {
        // 20초마다 색상 변경
        const now = Date.now();
        if (now - this.lastColorChangeTime > this.colorChangeInterval) {
            this.currentColorIndex = (this.currentColorIndex + 1) % this.neonColors.length;
            this.lastColorChangeTime = now;
        }
        
        return this.neonColors[this.currentColorIndex];
    }
    
    startAnimation() {
        const animate = () => {
            this.animate();
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    animate() {
        // 캔버스 초기화
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (this.isInteractive) {
            this.checkResetPoints(); // 점 리셋 체크
        }
        
        const currentColor = this.getCurrentColor();
        
        // 안티엘리어싱 비활성화 - 선명한 점 렌더링을 위해
        this.ctx.imageSmoothingEnabled = false;
        
        // 점 그리기
        for (const point of this.points) {
            this.ctx.beginPath();
            
            // 정확한 정수 좌표에 점 그리기 (0.5px 오프셋 적용)
            const x = Math.round(point.x) + 0.5;
            const y = Math.round(point.y) + 0.5;
            
            // 크기가 일정한 원형 점 그리기
            this.ctx.arc(x, y, this.radius, 0, Math.PI * 2);
            
            // 활성화된 점은 현재 네온 색상, 나머지는 연한 회색
            if (this.activatedPoints.has(point.id)) {
                this.ctx.fillStyle = currentColor;
            } else {
                this.ctx.fillStyle = this.pointColor;
            }
            
            this.ctx.fill();
        }
    }
    
    setInteractive(interactive) {
        this.isInteractive = interactive;
        if (!interactive) {
            this.activatedPoints.clear(); // 인터랙티브 모드 비활성화 시 활성화된 점들 초기화
        }
    }
}

// 즉시 실행 함수로 래핑하여 DOM이 준비된 후 실행
(function() {
    // DOM이 로드된 후 그리드 효과 초기화
    document.addEventListener('DOMContentLoaded', function() {
        // 페이지 내 모든 grid-canvas 요소 제거
        const existingCanvases = document.querySelectorAll('canvas[id^="grid-"]');
        existingCanvases.forEach(canvas => canvas.remove());
        
        // 새 인스턴스 생성
        window.gridEffect = new GridEffect({
            pointColor: 'rgba(0, 0, 0, 0.05)', // 투명도를 0.05로 설정
            hoverColor: 'rgba(255, 255, 255, 0.7)',
            pointSize: 1, // 점 크기
            spacing: 15, // 간격 조정
            maxRadius: 25,
            resetInterval: 0
        });
    });
})(); 