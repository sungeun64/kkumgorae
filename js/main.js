
"use strict";

const caps=[3,5,8,12,18,25,33,42,52,65];
const mins=[0,2,4,6,10,14,19,25,32,40];
const costs=[0,250000,500000,900000,1500000,2300000,3400000,4900000,6900000,9500000];
const baseHireCost=150000;
const environmentTiers=[
    {name:"숯",cost:0,bonus:0},{name:"산세베리아",cost:50000,bonus:2},{name:"다잇소 공청기",cost:120000,bonus:4},{name:"중고 공청기",cost:250000,bonus:6},{name:"대기업 공청기",cost:500000,bonus:9}
];
const drinkTiers=[
    {name:"생수",cost:0,bonus:0},{name:"녹차티백",cost:30000,bonus:2},{name:"믹스커피",cost:60000,bonus:3},{name:"캡슐커피",cost:150000,bonus:5},{name:"음료자판기",cost:350000,bonus:8}
];
const snackTiers=[
    {name:"누룽지사탕",cost:0,bonus:0},{name:"오곡크리스피롤",cost:30000,bonus:2},{name:"아자스",cost:60000,bonus:3},{name:"쫀득롤",cost:150000,bonus:5},{name:"과자자판기",cost:350000,bonus:8}
];
const deskChairTiers=[
    {name:"기본 책상·의자",upgradeCost:0,hireSurcharge:0,satisfactionBonus:0},
    {name:"하드시스",upgradeCost:50000,hireSurcharge:50000,satisfactionBonus:3},
    {name:"디스커",upgradeCost:100000,hireSurcharge:150000,satisfactionBonus:5},
    {name:"목아스",upgradeCost:200000,hireSurcharge:350000,satisfactionBonus:7},
    {name:"구디즈",upgradeCost:350000,hireSurcharge:700000,satisfactionBonus:9},
    {name:"털시스",upgradeCost:500000,hireSurcharge:1200000,satisfactionBonus:12},
    {name:"허먼당길러",upgradeCost:750000,hireSurcharge:1950000,satisfactionBonus:15}
];

const cafeteriaTiers=[
    {name:"기본 급식",cost:0,scoreBonus:0},
    {name:"조금 나아진 급식",cost:100000,scoreBonus:5},
    {name:"영양 균형 식단",cost:250000,scoreBonus:10},
    {name:"맛집 수준 급식",cost:500000,scoreBonus:15},
    {name:"호텔식 구내식당",cost:1000000,scoreBonus:20}
];
const $=id=>document.getElementById(id);
const won=n=>Math.floor(n).toLocaleString("ko-KR")+"원";
const randomInt=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

function freshState(){
    return {
        cash:500000,revenue:0,dailyRevenue:0,
        ap:5,maxAp:5,day:1,staff:1,room:1,research:0,
        staffSatisfaction:50,
        deskChairLevel:0,environmentLevel:0,drinkLevel:0,snackLevel:0,
        cafeteriaInstalled:false,cafeteriaLevel:0,cafeteriaActionCount:0,cafeteriaServedToday:false,cafeteriaMenuData:null,
        xp:0,xpNext:100,level:1,
        companyName:"꿈꾸는 고래 컴퍼니",companyLogo:"🐳",started:false,
        logs:["회사 설립 완료! 하루 행동력 5 AP를 받았습니다.","💗 직원 만족도는 50/100에서 시작합니다."],
        anonymousPosts: [],anonymousUnread: 0,
        dailyStats:{},missions:[],missionsClaimed:false,
        catRolled:false,catVisit:null,catClaimed:false,
        catsFedSinceReward:0,debugMode:false,mouseEventShown:false,
        snackBoughtToday:false,catBonusNextDay:0,catBonusToday:0,
        foodTruckShownToday:false,
        firstAidKit:false,sickEventShownToday:false,sickIncomePenalty:0,
        tunaUsedToday:false,petDone:false,
        projectEventShownToday:false,resignationCheckedToday:false,
        lastSalaryDay:0,goal:null,gameOver:false

    };
}
let s=freshState();
let tab="sales";
let sideTab = "logs";
let modalCallback = null;
let modalCancelCallback = null;

// Supabase 인증 설정: 대시보드의 Project URL과 publishable key를 입력하세요.
const SUPABASE_URL = "https://dwmqofazehgxthinxecb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_kFFYib9oVpl1w184AnNHJQ_IthP1nE4";
const cloudClient =  window.supabase? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY): null;
let currentUser = null;
let playMode = "guest"; // guest | member
const SAVE_APP = "kkumgorae";
const SAVE_VERSION = 1;

function updateAccountUI(message = "") {
    const nickname = $("accountNickname");

    if (!currentUser) {
        nickname.textContent = "비회원";
        $("headerSaveButton").hidden = true;
        $("headerLogoutButton").hidden = true;
        return;
    }
    const userNickname =
        currentUser.user_metadata?.nickname ||
        currentUser.email?.split("@")[0] ||
        "회원";
    nickname.textContent = userNickname;
    $("headerSaveButton").hidden = false;
    $("headerLogoutButton").hidden = false;
}

function showEntryScreen(message = "") {
    $("entryOverlay").hidden = false;
    $("startOverlay").hidden = true;
    document.body.classList.add("not-started");
    $("authMessage").textContent = message;
    setAuthMode("login");
}

function enterAsGuest() {
    currentUser = null;
    playMode = "guest";
    $("entryOverlay").hidden = true;
    $("outcomeOverlay").hidden = true;
    $("eventOverlay").hidden = true;
    $("accountStartChoices").hidden = true;
    $("companySetup").hidden = false;
    $("startOverlay").hidden = false;
    //$("accountStartChoices").hidden = true;
    //$("companySetup").hidden = false;
    document.body.classList.add("not-started");
    updateAccountUI("비회원은 클라우드 저장을 사용할 수 없습니다.");
    render();
}

function makeSaveData() {
    return { app: SAVE_APP, version: SAVE_VERSION, savedAt: new Date().toISOString(), state: s, tab, sideTab };
}

function validateSaveData(data) {
    if (!data || typeof data !== "object" || data.app !== SAVE_APP || data.version !== SAVE_VERSION || !data.state || typeof data.state !== "object") {
        throw new Error("지원하지 않거나 올바르지 않은 저장 파일입니다.");
    }
    const state = data.state;
    if (typeof state.started !== "boolean" || !Array.isArray(state.logs) || !Array.isArray(state.anonymousPosts) || !Array.isArray(state.missions)) {
        throw new Error("저장 데이터의 필수 항목이 없거나 손상되었습니다.");
    }
    if (![state.cash, state.revenue, state.ap, state.day, state.staff, state.room, state.level].every(Number.isFinite) || state.cash < 0 || state.staff < 0 || state.room < 1 || state.room > caps.length) {
        throw new Error("저장 데이터의 숫자 값이 올바르지 않습니다.");
    }
}

function applySaveData(data) {
    validateSaveData(data);
    const defaults = freshState();
    s = { ...defaults, ...data.state };
    s.dailyStats = { ...defaults.dailyStats, ...(data.state.dailyStats || {}) };
    tab = ["sales", "staff", "research", "office"].includes(data.tab) ? data.tab : "sales";
    sideTab = ["logs", "anonymous"].includes(data.sideTab) ? data.sideTab : "logs";
    $("companyNameInput").value = s.companyName || "꿈꾸는 고래 컴퍼니";
    $("companyLogoInput").value = s.companyLogo || "🐳";
    document.querySelectorAll("#companyLogoSlider .logo-option").forEach(button => button.classList.toggle("selected", button.dataset.logo === (s.companyLogo || "🐳")));
    $("entryOverlay").hidden = true;
    $("startOverlay").hidden = s.started;
    $("outcomeOverlay").hidden = true;
    $("eventOverlay").hidden = true;
    document.body.classList.toggle("not-started", !s.started);
    render();
}

async function signUpAccount() {
    if (!cloudClient) { $("authMessage").textContent = "Supabase 설정이 아직 필요합니다. 설정값을 입력한 뒤 다시 시도해 주세요."; return; }
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    const nickname = $("authNickname").value.trim();
    $("authMessage").textContent = "회원가입 처리 중...";
    const { data, error } = await cloudClient.auth.signUp({ email, password, options: { data: { nickname } } });
    if (error) { $("authMessage").textContent = "회원가입 실패: " + error.message; return; }
    if (!data.session) {
        $("authMessage").textContent = "가입 요청이 완료됐어요. 이메일 확인을 마친 뒤 로그인해 주세요.";
        return;
    }
    currentUser = data.user;
    playMode = "member";
    await enterAfterLogin();
}

async function signInAccount(event) {
    if (event) event.preventDefault();
    if (!cloudClient) { $("authMessage").textContent = "Supabase 설정이 아직 필요합니다. 설정값을 입력한 뒤 다시 시도해 주세요."; return; }
    const email = $("authEmail").value.trim();
    const password = $("authPassword").value;
    $("authMessage").textContent = "로그인 중...";
    const { data, error } = await cloudClient.auth.signInWithPassword({ email, password });
    if (error) { $("authMessage").textContent = "로그인 실패: 이메일 또는 비밀번호를 확인해 주세요."; return; }
    currentUser = data.user;
    playMode = "member";
    await enterAfterLogin();
}

$("savedCompanyButton").addEventListener("click", async () => {
    if (!currentUser || !cloudClient) return;

    const { data, error } = await cloudClient
        .from("company_saves")
        .select("save_data, updated_at")
        .eq("user_id", currentUser.id)
        .maybeSingle();
    if (error) {
        alert("저장 데이터 불러오기 실패: " + error.message);
        return;
    }
    if (!data) {
        alert("저장된 회사가 없습니다.");
        return;
    }
    try {
        applySaveData(data.save_data);
        $("startOverlay").hidden = true;
        $("entryOverlay").hidden = true;
        render();
        updateAccountUI("저장된 회사 진행 중");
    } catch (error) {
        alert("저장 데이터를 불러오지 못했습니다: " + error.message);
    }
});

$("newCompanyButton").addEventListener("click", () => {
    s = freshState();
    tab = "office";
    sideTab = "logs";
    $("accountStartChoices").hidden = true;
    $("companySetup").hidden = false;
    render();
});
async function enterAfterLogin() {
    updateAccountUI("로그인 완료");
    $("entryOverlay").hidden = true;

    // 기존 회사 시작 팝업 표시
    $("startOverlay").hidden = false;
    $("accountStartChoices").hidden = false;
    $("companySetup").hidden = true;
    // 기존 시작 팝업에 저장 여부 선택 버튼 표시
    $("savedCompanyButton").hidden = false;
    $("newCompanyButton").hidden = false;

    const { data, error } = await cloudClient
        .from("company_saves")
        .select("updated_at")
        .eq("user_id", currentUser.id)
        .maybeSingle();

    if (error) {
        updateAccountUI("저장 데이터 확인 실패: " + error.message);
        return;
    }

    $("savedCompanyButton").disabled = !data;
    $("savedCompanyButton").textContent = data
        ? "저장된 회사 진행하기"
        : "저장된 회사 없음";

    $("newCompanyButton").textContent = "새 회사 진행하기";
}

async function saveCloudSave() {
    if (!currentUser || !cloudClient) { alert("클라우드 저장은 회원 전용입니다. 로그인 또는 회원가입해 주세요."); showEntryScreen("로그인하면 클라우드 저장을 이용할 수 있어요."); return; }
    if (!s.started) { alert("먼저 회사를 설립해 주세요."); return; }
    const saveData = makeSaveData();
    const { error } = await cloudClient.from("company_saves").upsert({ user_id: currentUser.id, save_data: saveData, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (error) { alert("클라우드 저장 실패: " + error.message); return; }
    updateAccountUI("마지막 저장: " + new Date(saveData.savedAt).toLocaleString("ko-KR"));
    alert("☁️ 회사 데이터가 클라우드에 저장됐어요!");
}

async function loadCloudSave() {
    if (!currentUser || !cloudClient) { alert("클라우드 불러오기는 회원 전용입니다. 로그인해 주세요."); showEntryScreen("로그인하면 클라우드 저장을 이용할 수 있어요."); return; }
    const { data, error } = await cloudClient.from("company_saves").select("save_data, updated_at").eq("user_id", currentUser.id).maybeSingle();
    if (error) { alert("클라우드 불러오기 실패: " + error.message); return; }
    if (!data) { alert("이 계정에 저장된 회사가 없습니다."); return; }
    if (!confirm("현재 진행 상황을 클라우드 저장 데이터로 교체할까요?")) return;
    try { applySaveData(data.save_data); updateAccountUI("불러온 저장: " + new Date(data.updated_at).toLocaleString("ko-KR")); }
    catch (err) { alert("불러오기 실패: " + err.message); }
}

function exportJsonBackup() {
    if (!s.started) { alert("먼저 회사를 설립해 주세요."); return; }
    const saveData = makeSaveData();
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = (s.companyName || "꿈꾸는고래컴퍼니").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
    link.href = url; link.download = `${safeName}_백업.json`; document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    updateAccountUI("JSON 백업 파일을 내보냈습니다.");
}

async function importJsonBackup(file) {
    if (!file) return;
    try {
        const data = JSON.parse(await file.text());
        validateSaveData(data);
        if (!confirm(`백업 파일 “${file.name}”의 진행 상황으로 교체할까요?`)) return;
        applySaveData(data);
        updateAccountUI("JSON 백업 파일을 복원했습니다. 클라우드에 반영하려면 저장 버튼을 눌러 주세요.");
        alert("JSON 백업을 복원했어요. 클라우드 저장은 별도로 저장 버튼을 눌러야 반영됩니다.");
    } catch (error) { alert("JSON 복원 실패: " + error.message); }
}

function signOutAccount() {
    if (!cloudClient) { currentUser = null; playMode = "guest"; showEntryScreen(); updateAccountUI("비회원 플레이"); return; }
    cloudClient.auth.signOut().then(({ error }) => {
        if (error) { alert("로그아웃 실패: " + error.message); return; }
        currentUser = null; playMode = "guest"; s = freshState(); tab = "sales"; sideTab = "logs";
        $("authPassword").value = "";
        $("entryOverlay").hidden = false; $("startOverlay").hidden = true;
        $("outcomeOverlay").hidden = true; $("eventOverlay").hidden = true;
        document.body.classList.add("not-started");
        updateAccountUI("로그아웃했습니다. 비회원으로 계속 플레이할 수 있어요.");
        render();
    });
}


function setAuthMode(mode) {
    const isSignup = mode === "signup";

    $("nicknameField").hidden = !isSignup;
    $("loginButton").hidden = isSignup;

    // 로그인 / 회원가입 화면 전환 버튼
    $("showLoginButton").hidden = !isSignup;

    // 화면 제목도 전환하고 싶다면 사용
    $("showSignupButton").textContent = isSignup?"회원가입 하기": "회원가입";
    
    $("showSignupButton").addEventListener("click", signUpAccount);
    $("authMessage").textContent = "";
}

function initializeAccountAccess() {
    $("guestStartButton").addEventListener("click", enterAsGuest);
    //$("authForm").addEventListener("submit", signInAccount);
    //$("signupButton").addEventListener("click", signUpAccount);
    $("loginButton").addEventListener("click", signInAccount);
    $("headerSaveButton").addEventListener("click", saveCloudSave);
    $("headerLogoutButton").addEventListener("click", signOutAccount);
    //$("cloudSaveButton").addEventListener("click", saveCloudSave);
    //$("cloudLoadButton").addEventListener("click", loadCloudSave);
    //$("jsonExportButton").addEventListener("click", exportJsonBackup);
    //$("jsonImportButton").addEventListener("click", () => $("jsonImportFile").click());
    //$("jsonImportFile").addEventListener("change", async event => { const file = event.target.files?.[0]; if (file) await importJsonBackup(file); event.target.value = ""; });
    //$("accountSwitchButton").addEventListener("click", () => showEntryScreen("로그인하거나 비회원으로 새로 시작할 수 있어요."));
    //$("logoutButton").addEventListener("click", signOutAccount);
    if (!cloudClient) $("authMessage").textContent = "회원 기능을 사용하려면 Supabase 설정이 필요합니다. 비회원 플레이는 바로 이용할 수 있어요.";
    // 진입 화면은 매번 보여 줍니다. 로그인 세션이 남아 있어도 사용자가 비회원 시작을 선택할 수 있습니다.
    updateAccountUI();
}


function showPopup(icon, title, message, callback, options = {}) {
    $("eventIcon").textContent = icon;
    $("eventTitle").textContent = title;
    $("eventText").textContent = message;

    const cancelButton = $("eventCancelButton");
    const closeButton = $("eventCloseButton");

    closeButton.textContent = options.confirmText || "확인";
    cancelButton.hidden = !options.showCancel;
    cancelButton.textContent = options.cancelText || "취소";

    modalCallback = callback || null;
    modalCancelCallback = options.onCancel || null;

    $("eventOverlay").hidden = false;
}

function closeEventPopup() {
    $("eventOverlay").hidden = true;

    const cb = modalCallback;
    modalCallback = null;
    modalCancelCallback = null;

    if (cb) cb();
}

$("eventCloseButton").addEventListener("click", closeEventPopup);

$("eventCancelButton").addEventListener("click", () => {
    $("eventOverlay").hidden = true;

    const cb = modalCancelCallback;
    modalCallback = null;
    modalCancelCallback = null;

    if (cb) cb();
});

function log(message){
    s.logs.unshift(message);
    s.logs=s.logs.slice(0,100);
}

// 불라불라 익명게시판
const anonymousMessages = {
    sales: [
        "방금 매출 오른 거 봤음? 우리 회사 생각보다 잘나가네ㅋㅋ",
        "영업은 역시 실적이 전부인가 봅니다...",
        "오늘 계약 하나 더 따냈다! 퇴근이 조금 가까워진 기분",
        "매출이 오르니까 갑자기 회사가 좋아 보임",
        "영업 담당자분들 오늘도 고생 많으십니다 🙌"
    ],
    market: [
        "시장 조사하다가 시간이 다 갔네...",
        "자료 조사도 은근 체력 쓰는 일인 듯",
        "오늘도 열심히 조사했으니 언젠가는 빛을 보겠지",
        "시장 트렌드 따라가려니 쉽지 않다",
        "분석은 끝났고 이제 누가 결과를 읽어주기만 하면 됨"
    ],
    hire: [
        "신입분 환영합니다! 오래오래 함께해요 🙌",
        "사람이 늘어나니까 진짜 회사 같아졌다",
        "새로운 동료가 왔다! 이제 일도 나눠서 할 수 있겠지?",
        "우리 팀 점점 커지는 중",
        "입사 첫날인데 다들 친절해서 다행이다"
    ],
    research: [
        "연구 개발은 미래를 위한 투자라고 믿습니다...",
        "자동화 좀 더 되면 야근도 줄어들겠지?",
        "기술 부채는 미래의 내가 해결하겠지...",
        "연구 단계가 오를 때마다 괜히 뿌듯함",
        "오늘의 연구가 내일의 칼퇴를 만든다 🔬"
    ],
    office: [
        "사무실 넓어졌다!! 이제 좀 숨통이 트이네",
        "회사 확장 속도 무슨 일이야ㅋㅋ",
        "자리 넓어졌으니 이제 좋은 의자도 주세요",
        "우리 회사 진짜 커지고 있는 거 맞지?",
        "사무실 확장 축하합니다 🎉"
    ],
    cat: [
        "고양이가 귀여워요. 이 회사 복지 최고다 🐈",
        "고양이 보러 출근하는 사람 저 말고 또 있나요?",
        "방금 고양이랑 눈 마주침. 오늘 운 다 썼다",
        "고양이 낮잠 자는 모습 너무 평화롭다...",
        "고양이 사진 공유 게시판은 어디 없나요?",
        "고양이가 이 회사의 실세인 것 같음",
        "고양이 간식비는 회사 복지로 처리해주세요",
        "오늘의 업무 성과: 고양이 쓰다듬기 성공 💗"
    ],
    foodTruck: [
        "붕어빵 트럭 왔을 때 하나 먹을 걸... 냄새가 계속 나네",
        "순대 트럭 맛있어 보였는데 점심 먹고 올 걸 그랬다",
        "타코야끼 냄새 때문에 집중이 안 됨ㅋㅋ",
        "회사 앞에 푸드트럭 오는 날은 은근 기다려짐",
        "다음엔 푸드트럭 메뉴 같이 먹으러 가요!"
    ],
    snack: [
        "간식 사주시는 분 복 받으세요 🥨",
        "간식 들어오니까 사무실 분위기가 달라짐",
        "이 회사 간식 복지는 제가 지키겠습니다",
        "오후 업무의 원동력은 간식이다"
    ],
    day: [
        "오늘 하루도 수고하셨습니다. 내일의 나 파이팅",
        "월급날까지 며칠 남았더라...",
        "하루가 끝났다! 내일은 조금 덜 바쁘길",
        "오늘도 어떻게든 해냈다",
        "내일은 꼭 계획대로 일해야지"
    ],
    general: [
        "회사가 힘들어요...",
        "다들 오늘도 무사히 버텨봅시다",
        "퇴근하고 싶다. 물론 출근한 지 얼마 안 됨",
        "우리 회사 은근 정이 가는 듯",
        "오늘따라 업무량이 많게 느껴지는 건 기분 탓인가",
        "열심히 일하는 모두에게 박수를 👏",
        "회사 생활은 역시 쉽지 않다",
        "이 글을 보는 모두에게 행운이 있기를 🍀"
    ],
    satisfactionPositive: [
        "요즘 회사 분위기 꽤 괜찮은 듯 😊",
        "복지가 조금씩 좋아지는 게 느껴진다!",
        "우리 회사 오래 다니고 싶다",
        "오늘은 출근길이 조금 가벼웠음",
        "직원들 챙겨주는 거 은근 감동임",
        "이 정도면 다닐 맛 나는 회사 아닌가요? 💗",
        "요즘 회사 생활 만족도 높음!",
        "우리 회사 은근 좋은 회사일지도?"
    ],
    satisfactionNegative: [
        "솔직히 요즘 회사 다니기 너무 지친다...",
        "직원들 생각도 조금 해줬으면 좋겠어요",
        "이직 공고 슬슬 찾아보는 중",
        "회사 분위기가 예전 같지 않네",
        "복지 좀 신경 써주세요 제발",
        "출근하기 싫다는 생각이 점점 커진다",
        "요즘 회사 생활 만족도가 바닥임",
        "이 회사 계속 다녀도 괜찮을까..."
    ]
};

function changeStaffSatisfaction(amount, reason = "") {
    const before = s.staffSatisfaction;
    s.staffSatisfaction = clamp(s.staffSatisfaction + amount, 0, 100);
    const changed = s.staffSatisfaction - before;
    if (changed !== 0 && reason) {
        const sign = changed > 0 ? "+" : "";
        log(`💗 직원 만족도 ${sign}${changed} · ${reason} (현재 ${s.staffSatisfaction}/100)`);
    }
}

function getSatisfactionLabel() {
    const value = s.staffSatisfaction;
    if (value >= 85) return "매우 만족";
    if (value >= 70) return "만족";
    if (value >= 50) return "보통";
    if (value >= 30) return "불만";
    return "매우 불만";
}
function currentHireCost() {
    return baseHireCost + deskChairTiers[s.deskChairLevel].hireSurcharge;
}
function upgradeDeskChair() {
    const nextLevel=s.deskChairLevel+1;
    if(nextLevel>=deskChairTiers.length)return;
    const tier=deskChairTiers[nextLevel];
    const cost=tier.upgradeCost*s.staff;
    if(s.cash<cost){
        showPopup("🪑","자금 부족",`${tier.name} 업그레이드에는 현재 직원 ${s.staff}명 기준 ${won(cost)}이 필요합니다.`);
        return;
    }
    s.cash-=cost;
    s.deskChairLevel=nextLevel;
    changeStaffSatisfaction(tier.satisfactionBonus, `${tier.name} 책상·의자 업그레이드`);
    log(`🪑 책상·의자를 ${tier.name}(으)로 업그레이드했습니다. 현재 직원 ${s.staff}명 좌석에 적용 · 비용 ${won(cost)} · 만족도 보너스 +${tier.satisfactionBonus}`);
    render();
}

function maybeCreateanonymousPost(type = "general") {
    // 행동 한 번당 24% 확률로 새 게시글 생성
    if (Math.random() >= 0.24) return;

    const pool = [...(anonymousMessages[type] || anonymousMessages.general)];
    // 만족도가 높거나 낮을수록 해당 분위기의 게시글이 더 자주 올라옵니다.
    if (s.staffSatisfaction >= 80) {
        for (let i = 0; i < 3; i++) pool.push(...anonymousMessages.satisfactionPositive);
    } else if (s.staffSatisfaction <= 35) {
        for (let i = 0; i < 3; i++) pool.push(...anonymousMessages.satisfactionNegative);
    } else if (s.staffSatisfaction >= 65) {
        pool.push(...anonymousMessages.satisfactionPositive);
    } else if (s.staffSatisfaction <= 45) {
        pool.push(...anonymousMessages.satisfactionNegative);
    }
    const content = pool[randomInt(0, pool.length - 1)];

    s.anonymousPosts.unshift({
        content,
        day: s.day,
        id: Date.now() + Math.random()
    });

    // 게시글이 너무 많이 쌓이지 않도록 최근 100개만 유지
    s.anonymousPosts = s.anonymousPosts.slice(0, 100);

    s.anonymousUnread++;

    log("💬 불라불라에 새로운 익명 게시글이 올라왔습니다.");
}

function createanonymousPostForAction(type) {
    maybeCreateanonymousPost(type);
}

function renderanonymousPost(post, isLatest = false) {
    const article = document.createElement("div");
    article.className = "anonymous-post";

    const header = document.createElement("div");
    header.className = "anonymous-post-header";

    const author = document.createElement("span");
    author.className = "anonymous-post-author";
    author.textContent = "익명";

    header.append(author);

    if (isLatest && s.anonymousUnread > 0) {
        const badge = document.createElement("span");
        badge.className = "anonymous-new";
        badge.textContent = "NEW";
        header.append(badge);
    }

    const time = document.createElement("span");
    time.className = "anonymous-post-time";
    time.textContent = `DAY ${post.day}`;
    header.append(time);

    const content = document.createElement("div");
    content.className = "anonymous-post-content";
    content.textContent = post.content;

    article.append(header, content);
    return article;
}

function renderanonymous() {
    const latestArea = $("anonymousLatest");
    const postsArea = $("anonymousPosts");

    latestArea.innerHTML = "";
    postsArea.innerHTML = "";

    if (s.anonymousPosts.length === 0) {
        const emptyPreview = document.createElement("p");
        emptyPreview.className = "anonymous-empty";
        emptyPreview.textContent = "아직 올라온 글이 없습니다. 회사 생활을 하다 보면 새로운 글이 올라올 거예요!";
        latestArea.append(emptyPreview);

        const emptyList = document.createElement("p");
        emptyList.className = "anonymous-empty";
        emptyList.textContent = "아직 게시글이 없습니다.";
        postsArea.append(emptyList);
    } else {
        latestArea.append(
            renderanonymousPost(s.anonymousPosts[0], true)
        );

        s.anonymousPosts.forEach(post => {
            postsArea.append(renderanonymousPost(post));
        });
    }

    const satisfactionArea = $("sharedSatisfaction");
    const satisfactionColor = s.staffSatisfaction >= 70 ? "#168b66" : s.staffSatisfaction >= 40 ? "#9a6b13" : "#d94c63";
    satisfactionArea.innerHTML = `<div class="shared-satisfaction">
   <div class="shared-satisfaction-head"><span>💗 직원 만족도</span><span style="color:${satisfactionColor}">${getSatisfactionLabel()} · ${s.staffSatisfaction}/100</span></div>
   <div class="shared-satisfaction-track"><div class="shared-satisfaction-fill" style="width:${s.staffSatisfaction}%;background:${satisfactionColor}"></div></div>
   <div class="shared-satisfaction-foot"><span>만족도가 높을수록 퇴사 확률 감소</span><span>긍정 게시글 증가</span></div>
  </div>`;

    $("anonymousUnreadCount").textContent =
        s.anonymousUnread > 0 ? s.anonymousUnread : "";

    $("anonymousUnreadCount").hidden = s.anonymousUnread === 0;
}

function renderSidePanel() {
    const isLogs = sideTab === "logs";

    $("logsPanel").hidden = !isLogs;
    $("anonymousPanel").hidden = isLogs;
    document.querySelectorAll("[data-side-tab]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.sideTab === sideTab
        );
    });
    renderanonymous();
}

const missionPool=[
    {id:"sale1",title:"첫 매출 만들기",desc:"오늘 영업 1회 완료",type:"sales",target:1},
    {id:"sale2",title:"영업에 집중하기",desc:"오늘 영업 3회 완료",type:"sales",target:3},
    {id:"market1",title:"시장 살펴보기",desc:"오늘 시장 조사 1회 완료",type:"market",target:1},
    {id:"market2",title:"시장 전문가",desc:"오늘 시장 조사 2회 완료",type:"market",target:2},
    {id:"hire1",title:"새로운 동료 맞이하기",desc:"오늘 직원 1명 채용",type:"hire",target:1},
    {id:"research1",title:"연구 개발의 시작",desc:"오늘 연구 개발 1회 완료",type:"research",target:1},
    {id:"office1",title:"사업 확장",desc:"오늘 사무실 1회 확장",type:"office",target:1},
    {id:"xp30",title:"경험을 쌓자",desc:"오늘 경험치 30 XP 획득",type:"xp",target:30},
    {id:"xp60",title:"성장하는 회사",desc:"오늘 경험치 60 XP 획득",type:"xp",target:60},
    {id:"income100",title:"수익 올리기",desc:"오늘 총수입 100,000원 달성",type:"income",target:100000},
    {id:"staff2",title:"팀 만들기",desc:"직원 2명 이상 보유",type:"staff",target:2},
    {id:"researchLevel",title:"기술 발전",desc:"연구 단계 1 이상 달성",type:"researchLevel",target:1},
    {id:"level2",title:"회사 성장의 첫걸음",desc:"회사 레벨 2 이상 달성",type:"level",target:2}
];

function resetDailyStats(){
    s.dailyStats={sales:0,market:0,hire:0,research:0,office:0,xp:0,income:0};
}
function newDailyMissions() {
    const availableMissions = missionPool.filter(m =>
        !(s.room >= 10 && m.type === "office")
    );
    const shuffled = [...availableMissions];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    s.missions = shuffled.slice(0, 4).map(m => ({ ...m }));
    s.missionsClaimed = false;
}
function missionProgress(m){
    const d=s.dailyStats;
    switch(m.type){
        case "sales":return d.sales;
        case "market":return d.market;
        case "hire":return d.hire;
        case "research":return d.research;
        case "office":return d.office;
        case "xp":return d.xp;
        case "income":return d.income;
        case "staff":return s.staff;
        case "researchLevel":return s.research;
        case "level":return s.level;
        default:return 0;
    }
}
function missionCompleted(m){return missionProgress(m)>=m.target;}
function allMissionsCompleted(){return s.missions.length===4&&s.missions.every(missionCompleted);}

function claimMissionReward(){
    if(s.missionsClaimed||!allMissionsCompleted())return;
    s.missionsClaimed=true;
    addIncome(100000);
    s.ap=Math.min(s.maxAp,s.ap+2);
    log("🎯 오늘의 미션 4개 완료! 보상 100,000원과 AP 2를 받았습니다.");
    render();
}
function renderMissions(){
    const completed=s.missions.filter(missionCompleted).length;
    $("missionCount").textContent=`${completed}/4`;
    $("missions").innerHTML=s.missions.map(m=>{
        const p=missionProgress(m),done=missionCompleted(m);
        const shown=Math.min(p,m.target),pct=Math.min(100,p/m.target*100);
        let text;
        if(m.type==="income")text=`${won(shown)} / ${won(m.target)}`;
        else if(m.type==="xp")text=`${shown} / ${m.target} XP`;
        else if(["staff","researchLevel","level"].includes(m.type))text=`${shown} / ${m.target}`;
        else text=`${shown} / ${m.target}회`;
        return `<div class="mission"><div class="check">${done?"✅":"⬜"}</div><div style="flex:1;min-width:0"><p>${m.title}</p><small>${m.desc}</small><small class="${done?"good":""}">${text}${done?" · 완료!":""}</small><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div></div>`;
    }).join("");

    const area=$("missionRewardArea");
    if(s.missionsClaimed){
        area.innerHTML=`<div class="reward-box"><strong class="good">🎉 오늘의 보상을 받았습니다!</strong><br>100,000원 + AP 2 회복<br><small>다음 날 새로운 미션이 열립니다.</small></div>`;
    }else if(allMissionsCompleted()){
        area.innerHTML=`<div class="reward-box"><strong>🎉 미션 4개를 모두 완료했어요!</strong><br>보상: 100,000원 + AP 2 회복<button id="claimMissionReward" style="width:100%;margin-top:10px">미션 보상 받기 🎁</button></div>`;
        $("claimMissionReward").addEventListener("click",claimMissionReward);
        createanonymousPostForAction("general");
    }else{
        area.innerHTML=`<p class="muted small" style="margin-top:12px">미션을 모두 완료하면 100,000원과 AP 2를 받을 수 있어요.</p>`;
    }
}

function gainXp(amount){
    s.xp+=amount;
    s.dailyStats.xp+=amount;
    while(s.xp>=s.xpNext){
        s.xp-=s.xpNext;
        s.level++;
        s.maxAp++;
        s.ap=s.maxAp;
        s.xpNext=Math.ceil((s.xpNext*1.25)/5)*5;
        log(`🎉 레벨 업! Lv.${s.level} 달성! 다음 레벨 필요 경험치 ${s.xpNext} XP · AP 최대치 ${s.maxAp}로 증가 및 전부 회복!`);
    }
}
function addIncome(amount){
    s.cash+=amount;
    s.dailyStats.income+=amount;
}
function can(ap,money=0){return s.ap>=ap&&s.cash>=money;}

async function loadCafeteriaMenuData() {
    if (s.cafeteriaMenuData) {
        return s.cafeteriaMenuData;
    }
    if (s.cafeteriaMenuDataPromise) {
        return s.cafeteriaMenuDataPromise;
    }

    const base = "data/cafeteria_menu_scored/";
    const files = {
        rice: "rice.json",
        soup: "soup.json",
        mainDish: "mainDish.json",
        sideDish: "sideDish.json",
        kimchi: "kimchi.json"
    };
    s.cafeteriaMenuDataPromise = (async () => {
        try {
            const entries = await Promise.all(
                Object.entries(files).map(async ([key, file]) => {
                    const response = await fetch(base + file);
                    if (!response.ok) {
                        throw new Error(
                            `${file} 로딩 실패: HTTP ${response.status}`
                        );
                    }
                    const json = await response.json();
                    if (!Array.isArray(json) || json.length === 0) {
                        throw new Error(`${file} 데이터가 비어 있거나 형식이 올바르지 않습니다.`);
                    }
                    return [key, json];
                })
            );
            const data = Object.fromEntries(entries);
            s.cafeteriaMenuData = data;

            return data;
        } finally {
            s.cafeteriaMenuDataPromise = null;
        }
    })();
    return s.cafeteriaMenuDataPromise;
}

function pickMenuItem(items){return items[Math.floor(Math.random()*items.length)];}
async function serveCafeteriaMeal(){
    if(!s.cafeteriaInstalled||s.room<6||s.cafeteriaServedToday)return;
    s.cafeteriaServedToday=true;
    const data=await loadCafeteriaMenuData();
    if(!data){s.cafeteriaServedToday=false;render();return;}
    const meal=[pickMenuItem(data.rice),pickMenuItem(data.soup),pickMenuItem(data.mainDish),pickMenuItem(data.sideDish),pickMenuItem(data.kimchi)];
    const baseScore=Math.round(meal.reduce((sum,item)=>sum+(Number(item.score)||0),0)/meal.length);
    const quality=cafeteriaTiers[s.cafeteriaLevel];
    const totalScore=clamp(baseScore+quality.scoreBonus-10,0,100);
    let change=0,grade="보통";
    if(totalScore>=90){change=6;grade="아주 훌륭한 식단";}
    else if(totalScore>=80){change=4;grade="맛있는 식단";}
    else if(totalScore>=70){change=2;grade="괜찮은 식단";}
    else if(totalScore>=60){change=0;grade="평범한 식단";}
    else if(totalScore>=50){change=-2;grade="아쉬운 식단";}
    else {change=-4;grade="실망스러운 식단";}
    changeStaffSatisfaction(change,`구내식당 점심 · ${totalScore}점`);
    const names=meal.map(item=>`${item.category||"메뉴"}: ${item.name}`).join("\n");
    log(`🍱 오늘의 구내식당 식단 ${totalScore}점 · 직원 만족도 ${change>=0?"+":""}${change}`);
    const extra=s.cafeteriaLevel===cafeteriaTiers.length-1&&Math.random()<0.28?"\n\n익명 게시판: ‘밥때문에 다닌다’":"";
    if(extra){s.anonymousPosts.unshift({content:"밥때문에 다닌다",day:s.day,id:Date.now()+Math.random()});s.anonymousPosts=s.anonymousPosts.slice(0,100);s.anonymousUnread++;log("💬 불라불라에 ‘밥때문에 다닌다’ 게시글이 올라왔습니다.");}
    showPopup("🍱","점심시간! 오늘의 구내식당",`${names}\n\n식단 기본 점수 ${baseScore}점 + 식당 퀄리티 ${quality.scoreBonus-10>=0?"+":""}${quality.scoreBonus-10}점\n최종 식단 점수: ${totalScore}/100 · ${grade}\n직원 만족도 변화: ${change>=0?"+":""}${change}${extra}`);
    render();
}
function upgradeCafeteria(){
    const next=s.cafeteriaLevel+1;
    if(next>=cafeteriaTiers.length)return;
    const tier=cafeteriaTiers[next];
    if(s.cash<tier.cost){showPopup("💰","자금이 부족해요",`${tier.name} 업그레이드에는 ${won(tier.cost)}이 필요합니다.`);return;}
    s.cash-=tier.cost;s.cafeteriaLevel=next;
    log(`🍱 구내식당을 ${tier.name}(으)로 업그레이드했습니다. 비용 ${won(tier.cost)} · 식단 점수 보정 +${tier.scoreBonus}`);
    render();
}
function act(ap, fn) {
    if (
        s.gameOver ||
        s.goal?.status === "failed" ||
        (s.goal?.status === "success" && !s.debugMode)
    ) {
        log("현재 도전이 종료되어 행동할 수 없습니다.");
        render();
        return;
    }

    if (s.ap < ap) {
        log("⚠️ 행동력이 부족합니다. 하루를 마감해 주세요.");
        render();
        return;
    }

    s.ap -= ap;
    fn();
    if(s.cafeteriaInstalled && s.room>=6 && ap>0 && !s.cafeteriaServedToday){
        s.cafeteriaActionCount++;
        if(s.cafeteriaActionCount>=2){s.cafeteriaActionCount=0; serveCafeteriaMeal();}
    }

    // 현재 탭에 해당하는 행동으로 게시글 생성 판정
    const typeMap = {
        sales: "sales",
        staff: "hire",
        research: "research",
        office: "office"
    };

    // 영업 탭의 시장 조사는 업무 일지 기록을 기준으로 구분
    const latestLog = s.logs[0] || "";
    let postType = typeMap[tab] || "general";

    if (latestLog.includes("시장 조사")) {
        postType = "market";
    }

    createanonymousPostForAction(postType);
    maybeFoodTruckEvent(ap);
    maybeSickStaffEvent(ap);
    render();
}

function maybeSickStaffEvent(actionAp){
    // 직원 5명 이상일 때 하루 한 번만 낮은 확률로 발생
    if(actionAp<=0 || s.staff<5 || s.sickEventShownToday || !$('eventOverlay').hidden || Math.random()>=0.025) return;
    s.sickEventShownToday=true;
    if(s.firstAidKit){
        showPopup("🩹","직원이 몸이 안 좋아요",`직원 한 명이 몸살 기운을 호소합니다. 회사 상비약을 제공할까요?

상비약 1개가 소진됩니다.`,()=>{
            s.firstAidKit=false;
            changeStaffSatisfaction(2,"아픈 직원에게 상비약 제공");
            log("🩹 아픈 직원에게 회사 상비약을 제공했습니다. 상비약 1개 소진 · 만족도 +2");
            render();
        },{showCancel:true,cancelText:"약을 주지 않는다",onCancel:()=>{
                s.sickIncomePenalty+=50000;
                changeStaffSatisfaction(-5,"아픈 직원 조퇴");
                log("🤒 상비약을 제공하지 않아 직원이 조퇴했습니다. 정기 수익 -50,000원 · 만족도 하락");
                render();
            }});
    }else{
        s.sickIncomePenalty+=50000;
        changeStaffSatisfaction(-5,"아픈 직원 조퇴");
        log("🤒 상비약이 없어 아픈 직원이 조퇴했습니다. 정기 수익 -50,000원 · 만족도 하락");
        showPopup("🤒","직원이 조퇴했어요",`회사에 상비약이 없어 직원의 상태가 더 나빠졌습니다.

직원 한 명 조퇴
오늘 정기 수익 -50,000원
직원 만족도 -5`,null);
    }
}

const foodTruckOptions = [
    {name:"붕어빵",icon:"🐟",cost:30000,satisfaction:4,post:"붕어빵 맛있당. 팥이 최고야 🐟"},
    {name:"순대",icon:"🍢",cost:40000,satisfaction:5,post:"회사 앞 순대 트럭 또 왔으면 좋겠다!"},
    {name:"타코야끼",icon:"🐙",cost:50000,satisfaction:6,post:"타코야끼 문어가 통통해서 맛있었음 🐙"}
];
function createFoodTruckPost(message) {
    s.anonymousPosts.unshift({content:message,day:s.day,id:Date.now()+Math.random()});
    s.anonymousPosts=s.anonymousPosts.slice(0,100);
    s.anonymousUnread++;
    log("💬 불라불라에 푸드트럭 관련 글이 올라왔습니다.");
}
function maybeFoodTruckEvent(actionAp) {
    if(actionAp<=0 || s.foodTruckShownToday || Math.random()>=0.07) return;
    s.foodTruckShownToday=true;
    const truck=foodTruckOptions[randomInt(0,foodTruckOptions.length-1)];
    showPopup(truck.icon,`회사 앞에 ${truck.name} 트럭이 도착했어요!`,
        `직원들이 창밖을 보며 웅성거립니다.

${truck.name}을(를) 직원들에게 사줄까요?
구매 비용: ${won(truck.cost)}
직원 만족도: +${truck.satisfaction}`,
        ()=>{
            if(s.cash<truck.cost){
                log(`🚚 ${truck.name} 트럭을 발견했지만 자금이 부족해 구매하지 못했습니다.`);
                showPopup("💸","자금이 부족해요",`${truck.name} 구매에는 ${won(truck.cost)}이 필요합니다. 다음 기회를 노려보세요.`);
            }else{
                s.cash-=truck.cost;
                changeStaffSatisfaction(truck.satisfaction,`${truck.name} 푸드트럭 간식`);
                log(`🚚 직원들에게 ${truck.name}을(를) 사줬습니다. 비용 ${won(truck.cost)} · 만족도 +${truck.satisfaction}`);
                render();
            }
        },
        {showCancel:true,confirmText:`사주기 · ${won(truck.cost)}`,cancelText:"그냥 보낸다",onCancel:()=>{
                createFoodTruckPost(truck.post);
                log(`🚚 ${truck.name} 트럭은 구매하지 않고 보냈습니다.`);
                render();
            }}
    );
}

function regularIncome() {
    return s.staff * (20000 + Math.max(0, s.room - 1) * 2000)
        + s.research * 5000;
}
function salaryPerEmployee() {
    return 10000 + (s.room * 2000) + (s.research * 1000);
}
function totalSalary() {
    return s.staff * salaryPerEmployee();
}
function shouldPaySalary(nextDayNumber) {
    return nextDayNumber % 5 === 0;
}

function goalTarget(duration,type,difficulty){
    if(type==="revenue"){
        const targets={7:{normal:200000,hard:300000},14:{normal:350000,hard:500000}};
        return targets[duration][difficulty];
    }
    const targets={7:{normal:3,hard:4},14:{normal:5,hard:7}};
    return targets[duration][difficulty];
}
function updateGoalStatus(){
    if(!s.goal||s.goal.status!=="active"||!s.started)return;
    const met=s.goal.type==="revenue"?regularIncome()>=s.goal.target:s.room>=s.goal.target;
    if(met){
        s.goal.status="success";
        log("🏆 도전 목표 달성! 보상을 받거나 새 도전에 도전할 수 있습니다.");
        showOutcome("success");
    }
}
function renderGoal(){
    const g=s.goal;
    if(!g)return;
    const targetText=g.type==="revenue"?won(g.target):`Lv.${g.target}`;
    const current=g.type==="revenue"?regularIncome():s.room;
    const progress=g.type==="revenue"?Math.min(100,current/g.target*100):(s.room>=g.target?100:Math.min(99,(s.room-1)/(g.target-1)*100));
    $("goalDescription").textContent=`${g.duration}일 · ${g.difficulty==="normal"?"보통":"어려움"} · ${g.type==="revenue"?"정기 수익":"사무실 단계 "} ${targetText}`;
    $("goalBar").style.width=progress+"%";
    $("goalProgressText").textContent=g.type==="revenue"?`${won(current)} / ${targetText}`:`현재 Lv.${s.room} / 목표 Lv.${g.target}`;
    $("goalDaysText").textContent=g.status==="active"?`남은 기간 ${Math.max(0,g.duration-s.day+1)}일`:`도전 기간 ${g.duration}일`;
    const status=$("goalStatus");
    if(g.status==="success"){status.className="small good";status.textContent="✅ 목표 달성! 계속해서 회사를 성장시켜 보세요.";}
    else if(g.status==="failed"){status.className="small bad";status.textContent="⌛ 기간 종료 · 목표 미달성. 게임이 종료되었습니다.";}
    else if(g.status==="continued"){status.className="small good";status.textContent="💰 목표 달성 보상을 받고 계속 플레이 중입니다.";}
    else{status.className="small muted";status.textContent="도전 진행 중 · 정기 수익은 직원·사무실·연구 단계에 따라 계산됩니다.";}
}
function previewGoal(){
    const duration=Number(document.querySelector('input[name="goalDuration"]:checked').value);
    const type=document.querySelector('input[name="goalType"]:checked').value;
    const difficulty=document.querySelector('input[name="goalDifficulty"]:checked').value;
    const target=goalTarget(duration,type,difficulty);
    $("goalPreview").textContent=`목표 미리보기: ${duration}일 · ${difficulty==="normal"?"보통":"어려움"} · ${type==="revenue"?"정기 수익 "+won(target):"사무실 Lv."+target+" 달성"}`;
}
document.querySelectorAll('input[name="goalDuration"],input[name="goalType"],input[name="goalDifficulty"]').forEach(el=>el.addEventListener("change",previewGoal));

function button(label,disabled,fn,secondary=false){
    const b=document.createElement("button");
    b.textContent=label;
    if(secondary)b.className="secondary";
    b.disabled=disabled;
    b.addEventListener("click",fn);
    return b;
}
function row(title,desc,label,disabled,fn,tag=""){
    const div=document.createElement("div");div.className="action";
    const left=document.createElement("div");left.style.flex="1";
    const strong=document.createElement("strong");strong.textContent=title;
    if(tag){const badge=document.createElement("span");badge.className="pill";badge.textContent=tag;strong.append(" ",badge);}
    const p=document.createElement("p");p.textContent=desc;
    left.append(strong,p);
    div.append(left,button(label,disabled,fn));
    return div;
}
function upgradeOfficeAmenity(key, tiers){
    const stateKey=key+"Level";
    const nextLevel=s[stateKey]+1;
    if(nextLevel>=tiers.length)return;
    const tier=tiers[nextLevel];
    if(s.cash<tier.cost){showPopup("💰","자금 부족",`${tier.name} 업그레이드에는 ${won(tier.cost)}이 필요합니다.`);return;}
    s.cash-=tier.cost;s[stateKey]=nextLevel;
    changeStaffSatisfaction(tier.bonus,`${tier.name} 업그레이드`);
    const category=key==="environment"?"회사 환경":key==="drink"?"탕비실 음료":"탕비실 과자";
    log(`🏢 ${category}를 ${tier.name}(으)로 업그레이드했습니다. 비용 ${won(tier.cost)} · 만족도 보너스 +${tier.bonus}`);
    render();
}

function renderActions(){
    const area=$("actions");area.innerHTML="";
    if(tab==="sales"){
        area.append(row("신규 영업","기본 매출 50,000원 + 직원 및 연구 보너스 · 소모 1 AP","영업하기",!can(1),()=>act(1,()=>{
            const amount=50000+(s.staff-1)*10000+s.research*15000;
            addIncome(amount);s.revenue+=amount;s.dailyStats.sales++;gainXp(20);
            log("📈 영업 성공! 매출 +"+won(amount));
        }),"수익"));
        area.append(row("시장 조사","경험치 확보 · 소모 1 AP","조사하기",!can(1),()=>act(1,()=>{
            s.dailyStats.market++;gainXp(10);log("🧭 시장 조사 완료! 경험치 +10");
        }),"경험치"));
    }else if(tab==="staff"){
        const full=s.staff>=caps[s.room-1];
        const hireCost=currentHireCost();
        area.append(row("신입 사원 채용",`직원당 영업 수익 보너스 +10,000원 · 소모 2 AP · 비용 ${won(hireCost)} (${deskChairTiers[s.deskChairLevel].name} 좌석 반영)`,"직원 고용하기",!can(2,hireCost)||full,()=>act(2,()=>{
            s.cash-=hireCost;s.staff++;s.dailyStats.hire++;gainXp(15);
            log(`👤 신규 직원 채용 완료. 채용 비용 ${won(hireCost)} · 직원 ${s.staff}명`);
        }),full?"정원 초과":"채용"));
        area.append(row("성과급 지급","월급 총액 기준 성과급 지급 · 지급 배수에 따라 만족도 상승","성과급 지급",s.staff<1||s.cash<Math.round(totalSalary()),()=>{
            const bonusOptions=[
                {label:"1배",multiplier:1,satisfaction:3},
                {label:"1.5배",multiplier:1.5,satisfaction:5},
                {label:"2배",multiplier:2,satisfaction:7},
                {label:"3배",multiplier:3,satisfaction:10}
            ];
            showPopup("🎁","성과급 지급","지급할 성과급 배수를 선택해 주세요.",()=>{
                const select=$("bonusMultiplierSelect");
                const option=bonusOptions.find(item=>item.multiplier===Number(select?.value))||bonusOptions[0];
                const cost=Math.round(totalSalary()*option.multiplier);
                if(s.cash<cost){showPopup("💰","자금이 부족해요",`${option.label} 성과급 지급에는 ${won(cost)}이 필요합니다.`);return;}
                s.cash-=cost;
                changeStaffSatisfaction(option.satisfaction,`${option.label} 성과급 지급`);
                log(`🎁 직원 ${s.staff}명에게 ${option.label} 성과급 지급 · ${won(cost)} 지출 · 만족도 +${option.satisfaction}`);
                render();
            },{confirmText:"지급하기",showCancel:true,cancelText:"취소",onCancel:()=>render()});
            const eventText=$("eventText");
            eventText.innerHTML=`<p style="margin:0 0 10px">월급 총액: <strong>${won(totalSalary())}</strong></p><label for="bonusMultiplierSelect" style="display:block;margin-bottom:6px">성과급 배수</label><select id="bonusMultiplierSelect" style="width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:white;color:var(--navy)">${bonusOptions.map(option=>`<option value="${option.multiplier}">${option.label} · 지급액 ${won(Math.round(totalSalary()*option.multiplier))} · 만족도 +${option.satisfaction}</option>`).join("")}</select><p style="font-size:12px;color:var(--muted);margin:10px 0 0">선택한 금액만큼 지출하고 직원 만족도가 상승합니다.</p>`;
        },"복지"));
        area.append(row("회사 상비약",s.firstAidKit?"상비약 보유 중 · 아픈 직원에게 제공 가능":"직원 질병 이벤트 대비 · 30,000원","상비약 보유" ,s.firstAidKit||!can(0,30000),()=>{
            s.cash-=30000;s.firstAidKit=true;
            log("🩹 회사 상비약을 구비했습니다. 비용 30,000원");
            render();
        },s.firstAidKit?"보유":"복지"));
        if(full){const n=document.createElement("div");n.className="notice";n.textContent="사무실 정원이 가득 찼습니다. 사무실을 확장한 뒤 채용하세요.";area.append(n);}
    }else if(tab==="research"){
        area.append(row("자동화 연구","연구 단계마다 영업 수익 +15,000원 · 정기 수익 +5,000원 · 소모 2 AP · 비용 100,000원","연구 진행하기",!can(2,100000),()=>act(2,()=>{
            s.cash-=100000;s.research++;s.dailyStats.research++;gainXp(25);
            log(`🔬 연구 완료! 연구 단계 ${s.research}`);
        }),"Lv."+s.research));
    }else{
        const envLevel=s.environmentLevel, envCurrent=environmentTiers[envLevel];
        if(envLevel<environmentTiers.length-1){const next=environmentTiers[envLevel+1];area.append(row(`🌿 회사 환경 · ${envCurrent.name}`,`다음 등급 ${next.name} · 만족도 +${next.bonus}`,`${next.name}으로 업그레이드 · ${won(next.cost)}`,!can(0,next.cost),()=>upgradeOfficeAmenity("environment",environmentTiers),"환경"));}
        else area.append(row(`🌿 회사 환경 · ${envCurrent.name}`,`최고 등급 · 만족도 보너스 +${envCurrent.bonus}`,"최고 등급",true,()=>{},"MAX"));
        const drinkLevel=s.drinkLevel, drinkCurrent=drinkTiers[drinkLevel];
        if(drinkLevel<drinkTiers.length-1){const next=drinkTiers[drinkLevel+1];area.append(row(`☕ 사내 탕비실 · 음료 (${drinkCurrent.name})`,`다음 등급 ${next.name} · 만족도 +${next.bonus}`,`${next.name}으로 업그레이드 · ${won(next.cost)}`,!can(0,next.cost),()=>upgradeOfficeAmenity("drink",drinkTiers),"음료"));}
        else area.append(row(`☕ 사내 탕비실 · 음료 (${drinkCurrent.name})`,`최고 등급 · 만족도 보너스 +${drinkCurrent.bonus}`,"최고 등급",true,()=>{},"MAX"));
        const snackLevel=s.snackLevel, snackCurrent=snackTiers[snackLevel];
        if(snackLevel<snackTiers.length-1){const next=snackTiers[snackLevel+1];area.append(row(`🍪 사내 탕비실 · 과자 (${snackCurrent.name})`,`다음 등급 ${next.name} · 만족도 +${next.bonus}`,`${next.name}으로 업그레이드 · ${won(next.cost)}`,!can(0,next.cost),()=>upgradeOfficeAmenity("snack",snackTiers),"과자"));}
        else area.append(row(`🍪 사내 탕비실 · 과자 (${snackCurrent.name})`,`최고 등급 · 만족도 보너스 +${snackCurrent.bonus}`,"최고 등급",true,()=>{},"MAX"));
        const deskLevel=s.deskChairLevel;
        const currentTier=deskChairTiers[deskLevel];
        if(deskLevel<deskChairTiers.length-1){
            const nextTier=deskChairTiers[deskLevel+1];
            const upgradeCost=nextTier.upgradeCost*s.staff;
            area.append(row(`🪑 책상·의자 업그레이드 · ${currentTier.name} (${deskLevel+1}/${deskChairTiers.length})`,
                `다음 등급 ${nextTier.name} · 직원 만족도 +${nextTier.satisfactionBonus} · 직원당 ${won(nextTier.upgradeCost)} · 채용비 ${won(baseHireCost+nextTier.hireSurcharge)} · 빈 좌석 제외`,
                `${nextTier.name}으로 업그레이드 · ${won(upgradeCost)}`,!can(0,upgradeCost),upgradeDeskChair,"복지"));
        }else{
            area.append(row(`🪑 책상·의자 업그레이드 · ${currentTier.name}`,
                `최고 등급 · 직원 만족도 보너스 +${currentTier.satisfactionBonus} · 신규 채용비 ${won(currentHireCost())}`,
                "최고 등급",true,()=>{},"MAX"));
        }
        if(s.room<6){
            area.append(row("🍱 구내식당","사무실 Lv.6부터 선택적으로 설치할 수 있어요. 직원 점심 식단과 만족도에 영향을 줍니다.","Lv.6에서 해금",true,()=>{},"잠김"));
        }else if(!s.cafeteriaInstalled){
            area.append(row("🍱 구내식당 설치","선택 사항 · 설치하면 하루 두 번째 AP 소모 행동 후 점심 식단이 제공됩니다.","구내식당 설치 · 무료",false,()=>{s.cafeteriaInstalled=true;s.cafeteriaLevel=0;s.cafeteriaActionCount=0;log("🍱 구내식당을 설치했습니다. 하루 두 번째 행동 후 점심시간이 발동합니다.");render();},"선택 복지"));
        }else{
            const cafeteriaCurrent=cafeteriaTiers[s.cafeteriaLevel];
            area.append(row(`🍱 구내식당 · ${cafeteriaCurrent.name} (${s.cafeteriaLevel+1}/${cafeteriaTiers.length})`,`하루 두 번째 AP 소모 행동 후 점심 제공 · 식단 점수 보정 +${cafeteriaCurrent.scoreBonus}`,s.cafeteriaLevel<cafeteriaTiers.length-1?`퀄리티 업그레이드 · ${won(cafeteriaTiers[s.cafeteriaLevel+1].cost)}`:"최고 레벨",s.cafeteriaLevel>=cafeteriaTiers.length-1||!can(0,cafeteriaTiers[s.cafeteriaLevel+1]?.cost||0),upgradeCafeteria,s.cafeteriaLevel>=cafeteriaTiers.length-1?"MAX":"식당 개선"));
            const status=document.createElement("div");status.className="notice";status.textContent=s.cafeteriaServedToday?"오늘 점심 제공 완료 · 내일 다시 식단이 제공됩니다.":`오늘 AP 소모 행동 ${s.cafeteriaActionCount}/2회 · ${2-s.cafeteriaActionCount}회 더 행동하면 점심시간입니다.`;area.append(status);
        }
        if(s.room>=10){
            const n=document.createElement("p");n.className="muted";n.textContent="최대 사무실 단계 Lv.10에 도달했습니다!";area.append(n);
        }else{
            const need=mins[s.room],cost=costs[s.room],newCap=caps[s.room];
            area.append(row(`사무실 Lv.${s.room+1} 확장`,`최소 직원 ${need}명 · 확장 후 정원 ${newCap}명 · 비용 ${won(cost)} · 소모 2 AP`,"확장하기",!can(2,cost)||s.staff<need,()=>act(2,()=>{
                s.cash-=cost;s.room++;s.dailyStats.office++;gainXp(30);
                log(`🏢 사무실 확장 완료! Lv.${s.room} · 정원 ${caps[s.room-1]}명`);
            }),"확장"));
            if(s.staff<need){const n=document.createElement("div");n.className="notice";n.textContent=`확장하려면 직원이 ${need-s.staff}명 더 필요합니다.`;area.append(n);}
        }
    }
}

function renderLogs(){
    $("logs").innerHTML="";
    if(!s.logs.length){$("logs").innerHTML='<p class="muted small">아직 기록이 없습니다.</p>';return;}
    s.logs.forEach(msg=>{const d=document.createElement("div");d.className="log";d.textContent=msg;$("logs").append(d);});
}
function renderOfficeGrid(){
    $("officeGrid").innerHTML=caps.map((cap,i)=>`<div class="office-level ${s.room===i+1?"current":""}"><b>Lv.${i+1}${s.room===i+1?" · 현재":""}</b><br>${i===0?"시작 단계":`최소 ${mins[i]}명`}<br>정원 ${cap}명</div>`).join("");
}

function roundedLoss(amount){return Math.max(0,Math.round(amount/10000)*10000);}
function maybeProjectFailure(){
    if(s.projectEventShownToday||s.level<3||s.cash<1000000)return;
    if(Math.random()>=0.18)return;
    s.projectEventShownToday=true;
    let pct=randomInt(5,50);
    let copy;
    if(pct===50){
        const special=Math.random();
        if(special<0.005){
            pct=70;
            copy="대형 프로젝트에서 심각한 문제가 발생했습니다. 예상보다 손실이 더 커졌습니다.";
        }else if(special<0.105){
            pct=randomInt(10,50);
            copy="프로젝트 비용이 예상보다 크게 늘어났습니다. 다행히 손실은 일부로 제한되었습니다.";
        }else{
            copy="대형 프로젝트가 실패했습니다. 상당한 자금 손실이 발생했습니다.";
        }
    }else{
        copy=pct<=15?"작은 프로젝트가 실패했습니다. 다행히 손실은 제한적입니다.":pct<=30?"프로젝트 진행 중 문제가 발생해 예상보다 큰 비용이 들었습니다.":"중요한 프로젝트가 실패했습니다. 회사 자금에 큰 타격이 발생했습니다.";
    }
    const loss=Math.min(s.cash,roundedLoss(s.cash*pct/100));
    s.cash-=loss;
    log(`📉 프로젝트 실패: 자금 ${pct}% 손실 (${won(loss)})`);
    showPopup("📉","프로젝트 실패",`${copy}\n\n보유 자금의 약 ${pct}%에 해당하는 ${won(loss)}을 잃었습니다.`);
}
function maybeStaffResignation(){
    if(s.resignationCheckedToday||s.level<4||s.staff<=1)return;
    s.resignationCheckedToday=true;
    // 만족도 0이면 최대 20%, 100이면 0%의 일일 퇴사 확률
    const resignationChance=0.20*(1-s.staffSatisfaction/100);
    if(Math.random()>=resignationChance)return;
    const satisfactionAtResignation=s.staffSatisfaction;
    const severance=salaryPerEmployee()*5;
    s.staff--;
    addIncome(-severance);
    log(`🚪 직원 한 명이 퇴사했습니다. 퇴직금 ${won(severance)} 지급`);
    showPopup("🚪","직원 퇴사",`직원 한 명이 회사를 떠났습니다.\n퇴직금으로 ${won(severance)}을 지급했습니다.\n퇴사 당시 직원 만족도: ${satisfactionAtResignation}/100`);
}

/* 고양이 방문 확률 */
function catVisitChance(){
    return clamp(0.75+s.catBonusToday,0,0.95);
}

/* 하루 최초 방문 판정 */
function rollCatVisit(){
    if(s.catRolled)return;

    s.catRolled=true;

    const visitChance=catVisitChance();
    const roll=Math.random();

    if(roll>=visitChance){
        s.catVisit={count:0,money:0,xp:0};
        log("🐈 오늘은 고양이가 찾아오지 않았습니다. 참치를 구매해 다시 시도할 수 있어요!");
    }else{
        const r=Math.random();
        if(r<0.67){
            s.catVisit={
                count:1,
                money:randomInt(1,3)*10000+randomInt(0,1)*5000,
                xp:randomInt(5,12)
            };
        }else if(r<0.91){
            s.catVisit={
                count:2,
                money:randomInt(8,13)*10000,
                xp:randomInt(10,18)
            };
        }else{
            s.catVisit={
                count:3,
                money:randomInt(12,17)*10000,
                xp:randomInt(15,25)
            };
        }
        createanonymousPostForAction("cat");
    }

    render();
}

/* 고양이 방문 보상 */
function claimCatReward(){
    if(!s.catRolled||!s.catVisit||s.catVisit.count===0||s.catClaimed)return;

    s.catClaimed=true;
    addIncome(s.catVisit.money);
    gainXp(s.catVisit.xp);
    const boonEligible = s.catsFedSinceReward >= 5;
    s.catsFedSinceReward += s.catVisit.count;
    log(`🐈 고양이 ${s.catVisit.count}마리 방문! 보상 ${won(s.catVisit.money)}과 경험치 ${s.catVisit.xp} XP 획득!`);
    createanonymousPostForAction("cat");
    // 간식을 제공한 뒤 희귀 이벤트 판정
    if(boonEligible && Math.random() < 0.005){
        s.catsFedSinceReward = 0;
        if (s.staff < caps[s.room - 1]) {
            showPopup("🐈‍⬛","고양이의 보은","엇 고양이를 따라오니 이곳이에요.. \n새로운 직원이 80,000원에 함께할 수 있어요. 고용할까요?",
                () => {
                    if (s.cash < 80000) {
                        log("🐈‍⬛ 고양이의 보은! 자금이 부족해 직원을 고용하지 못했습니다.");
                        showPopup("💸", "자금 부족", "직원 채용 비용 80,000원이 필요합니다.");
                        render();
                        return;
                    }
                    s.cash -= 80000;
                    s.staff++;
                    s.dailyStats.hire++;
                    gainXp(15);
                    log(`🐾 고양이의 보은! 새로운 직원을 할인된 비용 80,000원에 채용했습니다. 직원 ${s.staff}명`);
                    render();
                },
                {
                    showCancel: true,
                    confirmText: "고용하기",
                    cancelText: "거절하기",
                    onCancel: () => {
                        log("🐈‍⬛ 고양이의 보은! 찾아온 직원을 고용하지 않았습니다.");
                        render();
                    }
                }
            );
        } else {
            log("🐈‍⬛ 고양이의 보은! 하지만 사무실 정원이 가득 찼습니다.");
            showPopup("🐈‍⬛","고양이의 보은","고양이가 새 직원을 데려왔지만 사무실 정원이 가득 차 있어 함께할 수 없었어요.");
        }
    }else if(Math.random() < 0.01){
        s.cash = Math.max(0, s.cash - 30000);
        log("🐈 고양이의 장난! 마우스를 물어가 30,000원을 잃었습니다.");
        showPopup("🐈","고양이의 장난","앗 그건 쥐가 아냐! 마우스를 물어갔어요 (-30,000원)");
    }
    render();
}

function buySnack(){
    createanonymousPostForAction("snack");
    if(s.snackBoughtToday){
        showPopup("🥨","오늘은 이미 구매했어요","직원 간식은 하루에 한 번만 구매할 수 있습니다.");
        return;
    }
    if(s.cash<10000){
        showPopup("🥨","자금 부족","직원 간식을 구매하려면 10,000원이 필요합니다.");
        return;
    }

    const bonus=randomInt(5,10)/100;

    s.cash-=10000;
    s.snackBoughtToday=true;
    s.catBonusNextDay=Math.min(0.95,s.catBonusNextDay+bonus);

    log(`🥨 직원 간식 구매 완료! 다음 날 고양이 방문 확률이 ${(bonus*100).toFixed(0)}%p 증가합니다.`);

    render();
}

/*
* 고양이용 참치캔 구매
* - 오늘 최초 판정에서 고양이가 오지 않았을 때만 구매 가능
* - 비용은 항상 10,000원
* - 참치캔으로 재시도할 때 직원 간식 보너스를 추가하지 않음
* - 하루 한 번 재시도 가능
*/
function buyTunaAndRetry(){
    if(s.tunaUsedToday||!s.catRolled||s.catVisit?.count!==0)return;

    if(s.cash<10000){
        showPopup("🐟","자금 부족","고양이용 참치캔을 구매하려면 10,000원이 필요합니다.");
        return;
    }

    s.cash-=10000;
    s.tunaUsedToday=true;

    log("🐟 고양이용 참치캔을 10,000원에 구매했습니다. 고양이 방문을 다시 시도합니다!");
    createanonymousPostForAction("cat");
    /*
     * 재시도는 최초 방문 판정과 별도로 처리한다.
     * 직원 간식의 다음 날 보너스는 변경하지 않는다.
     * 재시도 확률은 기본 방문 확률만 사용한다.
     */
    const retryChance=0.75;
    const retryRoll=Math.random();

    s.catRolled=true;

    if(retryRoll>=retryChance){
        s.catVisit={count:0,money:0,xp:0};
        log("🐟 참치캔을 놓아두었지만 고양이는 끝내 찾아오지 않았습니다.");
    }else{
        const r=Math.random();

        if(r<0.67){
            s.catVisit={
                count:1,
                money:randomInt(1,3)*10000+randomInt(0,1)*5000,
                xp:randomInt(5,12)
            };
        }else if(r<0.91){
            s.catVisit={
                count:2,
                money:randomInt(8,13)*10000,
                xp:randomInt(10,18)
            };
        }else{
            s.catVisit={
                count:3,
                money:randomInt(12,17)*10000,
                xp:randomInt(15,25)
            };
        }

        log("🐈 참치캔 덕분에 고양이가 다시 찾아왔습니다!");
    }

    render();
}

/* 고양이 쓰다듬기 */
function petCat(){
    if(!s.catClaimed||s.petDone||!s.catVisit)return;

    if(s.cash<10000){
        showPopup("🐾","자금 부족","고양이에게 할퀴일 경우 약값 10,000원이 필요합니다. 자금을 확보한 뒤 다시 시도해 주세요.");
        return;
    }

    s.petDone=true;

    if(Math.random()<0.08){
        s.cash-=10000;
        changeStaffSatisfaction(1, "고양이에게 긁혔지만 함께한 시간");
        log("🐾 냥냥펀치! 고양이에게 할퀴여 약값 10,000원 지출했습니다.");
        showPopup("🐈‍⬛","냥냥펀치!","앗, 고양이가 손을 할퀴었어요! 약값으로 10,000원이 지출되었습니다. (-10,000원)\n직원 만족도 +1");
    }else{
        gainXp(s.catVisit.xp);
        changeStaffSatisfaction(3, "고양이 골골송");
        log(`💗 고양이를 쓰다듬었습니다! 경험치 ${s.catVisit.xp} XP와 직원 만족도 +3을 획득했습니다.`);
        showPopup("💗","골골송 성공!",`고양이가 기분 좋게 골골거립니다!\n경험치 ${s.catVisit.xp} XP를 추가로 얻었습니다.\n직원 만족도 +3`);
    }
    createanonymousPostForAction("cat");
    render();
}

/* 고양이 이벤트 UI */
function renderEvent(){
    const area=$("eventArea");
    area.innerHTML="";

    if(!s.catRolled){
        const p=document.createElement("p");
        p.className="muted small";
        p.textContent="방문 결과는 하루에 한 번 확인할 수 있습니다.";
        area.append(p);

        area.append(button("오늘의 고양이 확인하기 🐾",false,rollCatVisit));

        return;
    }

    if(!s.catVisit||s.catVisit.count===0){
        const notice=document.createElement("div");
        notice.className="notice";
        notice.textContent="오늘은 고양이가 찾아오지 않았어요. 고양이용 참치캔을 구매해 다시 시도할 수 있습니다.";
        area.append(notice);

        if(!s.tunaUsedToday){
            area.append(button(
                "참치캔 구매 후 다시 부르기 🐟 (10,000원)",
                s.cash<10000,
                buyTunaAndRetry
            ));
        }else{
            const p=document.createElement("p");
            p.className="muted small";
            p.textContent="오늘 참치캔 재시도는 이미 사용했습니다.";
            area.append(p);
        }

        return;
    }

    const count=s.catVisit.count;
    const result=document.createElement("div");
    result.className="reward-box";
    result.innerHTML=`<strong>🐈 ${count===1?"고양이 한 마리":count===2?"고양이 두 마리":"고양이 세 마리"}가 찾아왔어요!</strong><br>예상 보상: ${won(s.catVisit.money)} + ${s.catVisit.xp} XP`;
    area.append(result);

    if(!s.catClaimed){
        area.append(button("간식 주고 보상 받기 🎁",false,claimCatReward));
    }else{
        const p=document.createElement("p");
        p.className="good small";
        p.textContent="보상을 받았습니다. 고양이들이 행복하게 돌아갔어요!";
        area.append(p);

        if(!s.petDone){
            area.append(button("고양이 쓰다듬기 💗 (실패 시 10,000원)",s.cash<10000,petCat));
        }else{
            const p2=document.createElement("p");
            p2.className="muted small";
            p2.textContent="오늘 고양이 쓰다듬기를 완료했습니다.";
            area.append(p2);
        }
    }

}

function render(){
    updateGoalStatus();
    $("dayBadge").textContent="DAY "+s.day;
    $("level").textContent=s.level;
    $("xpText").textContent=`경험치 ${s.xp} / ${s.xpNext} XP`;
    $("xpBar").style.width=Math.min(100,s.xp/s.xpNext*100)+"%";
    $("companyNameTitle").textContent=s.companyName;
    $("companyLogoTitle").textContent=s.companyLogo||"🐳";
    $("cash").textContent=won(s.cash);
    $("revenue").textContent=won(s.revenue);
    $("ap").textContent=`${s.ap} / ${s.maxAp} AP`;
    $("staff").textContent=`${s.staff} / ${caps[s.room-1]}명`;
    s.dailyRevenue=regularIncome();
    $("incomePreview").textContent = `예상 정기 수익: ${won(regularIncome())} `;

    document.querySelectorAll("[data-tab]").forEach(b=>{
        b.className=b.dataset.tab===tab?"active":"secondary";
    });

    renderActions();
    renderMissions();
    renderLogs();
    renderOfficeGrid();
    renderEvent();
    renderGoal();
    renderSidePanel();
}

function showOutcome(kind){
    const overlay=$("outcomeOverlay"),actions=$("outcomeActions");
    actions.innerHTML="";

    if(kind==="failed"){
        $("outcomeIcon").textContent="⌛";
        $("outcomeTitle").textContent="도전 실패";
        $("outcomeText").textContent=`${s.goal.duration}일 동안 목표를 달성하지 못했어요. 이번 회사의 도전은 종료되었습니다. 다시 도전해 보세요!`;
        actions.append(button("새 목표로 다시 시작하기 🔄",false,()=>restartToGoalSetup()));
    }else{
        $("outcomeIcon").textContent="🏆";
        $("outcomeTitle").textContent="목표 달성!";
        const reward=s.goal.difficulty==="normal"?3000000:5000000;
        $("outcomeText").textContent=`목표 달성을 축하합니다! 새 목표로 회사를 처음부터 다시 시작하거나, ${won(reward)}을 받고 현재 회사를 계속 운영할 수 있어요.`;
        actions.append(button("새 목표로 재시작하기 🔄",false,()=>restartToGoalSetup()));
        actions.append(button(`${won(reward)} 받고 계속하기 💰`,false,()=>{
            s.cash+=reward;
            s.goal.status="continued";
            log(`🎁 목표 달성 보상 ${won(reward)} 획득! 현재 회사를 계속 운영합니다.`);
            overlay.hidden=true;
            render();
        },true));
    }

    overlay.hidden=false;
}

function restartToGoalSetup(){
    s=freshState();
    tab="sales";
    sideTab = "logs";
    $("companyNameInput").value="꿈꾸는 고래 컴퍼니";
    $("companyLogoInput").value="🐳";
    document.querySelectorAll("#companyLogoSlider .logo-option")
        .forEach(button => {
            button.classList.toggle("selected", button.dataset.logo === "🐳");
        });
    document.querySelector("#companyLogoSlider .logo-option")
        ?.scrollIntoView({ block: "nearest", inline: "center" });
    document.querySelector('input[name="goalDuration"][value="7"]').checked=true;
    document.querySelector('input[name="goalType"][value="revenue"]').checked=true;
    document.querySelector('input[name="goalDifficulty"][value="normal"]').checked=true;
    $("outcomeOverlay").hidden=true;
    $("eventOverlay").hidden=true;
    $("startOverlay").hidden=false;
    document.body.classList.add("not-started");
    resetDailyStats();
    newDailyMissions();
    previewGoal();
    render();
}

function sellCompany() {
    showPopup(
        "🏷️",
        "회사 매각",
        "현재 회사를 매각할까요?\n\n" +
        "매각하면 다음 진행 상황이 초기화됩니다.\n" +
        "• 보유 자금 및 누적 매출\n" +
        "• 직원과 사무실 단계\n" +
        "• 회사 레벨 및 연구 단계\n" +
        "• 현재 도전 목표와 일일 미션\n\n" +
        "새로운 회사 설립 화면으로 이동합니다.",
        () => restartToGoalSetup(),
        {
            showCancel: true,
            confirmText: "매각하기",
            cancelText: "취소"
        }
    );
}

function startGame(event){
    if(event)event.preventDefault();
    if(s.started)return;

    const name=$("companyNameInput").value.trim()||"꿈꾸는 고래 컴퍼니";
    const duration=Number(document.querySelector('input[name="goalDuration"]:checked').value);
    const type=document.querySelector('input[name="goalType"]:checked').value;
    const difficulty=document.querySelector('input[name="goalDifficulty"]:checked').value;

    s.companyName=name;
    s.companyLogo=$("companyLogoInput").value||"🐳";
    s.goal={
        duration,
        type,
        difficulty,
        target:goalTarget(duration,type,difficulty),
        status:"active"
    };
    s.started=true;

    $("entryOverlay").hidden=true;
    $("startOverlay").hidden=true;
    document.body.classList.remove("not-started");

    log(`🏢 ${name} 설립 완료! ${duration}일 도전 시작: ${type==="revenue"?"정기 수익 "+won(s.goal.target):"사무실 Lv."+s.goal.target+" 달성"} · ${difficulty==="normal"?"보통":"어려움"}`);
    render();
}

// 시작 화면 고래를 빠르게 세 번 누르면 비밀 시작 상태로 진입
let whaleClicks = [];
$("secretWhale").addEventListener("click", () => {
    if ($("startOverlay").hidden) return;
    const now = Date.now();
    whaleClicks = whaleClicks.filter(t => now - t < 850);
    whaleClicks.push(now);
    if (whaleClicks.length < 3) return;
    whaleClicks = [];

    s = freshState();
    s.cash = 10000000;
    s.room = 9;
    s.staff = 32;
    s.research = 150;
    s.started = true;
    s.debugMode = true;
    s.goal = {duration:7,type:"office",difficulty:"normal",target:9,status:"success"};
    s.logs = ["🐳 비밀 모드 시작! 목표 달성 상태 · 사무실 Lv.9 · 직원 32명 · 연구 Lv.150 · 보유 자금 10,000,000원"];
    resetDailyStats();
    newDailyMissions();
    $("startOverlay").hidden = true;
    document.body.classList.remove("not-started");
    log("🏆 목표 달성 상태로 자유롭게 계속 플레이할 수 있습니다.");
    render();
});

$("startForm").addEventListener("submit",startGame);

document.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{
    tab=b.dataset.tab;
    render();
}));

document.querySelectorAll("#companyLogoSlider .logo-option")
    .forEach(button => {
        button.addEventListener("click", () => {
            document.querySelectorAll("#companyLogoSlider .logo-option")
                .forEach(item => item.classList.remove("selected"));

            button.classList.add("selected");
            $("companyLogoInput").value = button.dataset.logo;
        });
    });

$("clearLogs").addEventListener("click",()=>{
    s.logs=["업무 일지를 새로 시작했습니다."];
    renderLogs();
});

document.getElementById("clearAnonymous").addEventListener("click", () => {
    s.anonymousPosts = [];
    renderanonymous();
});

document.querySelectorAll("[data-side-tab]").forEach(button => {
    button.addEventListener("click", () => {
        sideTab = button.dataset.sideTab;
        if (sideTab === "anonymous") {
            s.anonymousUnread = 0;
        }
        renderSidePanel();
    });
});

$("sellCompany").addEventListener("click",sellCompany);

$("nextDay").addEventListener("click",()=>{
    if(!s.started||!s.goal||s.gameOver)return;
    if(s.goal.status==="failed"||(s.goal.status==="success"&&!s.debugMode))return;

    if(s.goal.status==="active"&&s.day>=s.goal.duration){
        s.goal.status="failed";
        s.gameOver=true;
        log("⏰ 도전 기간이 끝났습니다. 목표 미달성으로 게임이 종료되었습니다.");
        render();
        showOutcome("failed");
        return;
    }

    const nextDay=s.day+1;

    const income = Math.max(0, regularIncome()-s.sickIncomePenalty);
    s.sickIncomePenalty=0;
    addIncome(income);
    s.revenue += income;
    log(`💰 정기 수익 지급! ${won(income)} 획득`);

    if (shouldPaySalary(nextDay)) {
        const salary = totalSalary();
        s.cash -= salary;
        log(
            `💸 직원 월급 지급! 직원 ${s.staff}명 · ` +
            `1인당 ${won(salaryPerEmployee())} · 총 ${won(salary)} 지출`
        );
        showPopup(
            "💸",
            "직원 월급 지급",
            `DAY ${nextDay} 직원 월급 지급일입니다.\n\n` +
            `직원 수: ${s.staff}명\n` +
            `1인당 월급: ${won(salaryPerEmployee())}\n` +
            `총 월급 지출: ${won(salary)}\n\n` +
            `월급 지급이 완료되었습니다.`,
            null
        );
    }
    s.day=nextDay;
    s.ap=s.maxAp;
    s.cafeteriaActionCount=0;
    s.cafeteriaServedToday=false;

    resetDailyStats();
    newDailyMissions();

    s.catRolled=false;
    s.catVisit=null;
    s.catClaimed=false;

    s.snackBoughtToday=false;
    s.foodTruckShownToday=false;
    s.sickEventShownToday=false;
    s.sickIncomePenalty=0;
    s.catBonusToday=s.catBonusNextDay;
    s.catBonusNextDay=0;

    s.tunaUsedToday=false;
    s.petDone=false;

    s.projectEventShownToday=false;
    s.resignationCheckedToday=false;

    log(`🌅 DAY ${s.day} 시작! AP ${s.maxAp}로 회복 · 일일 미션 갱신 · 고양이 방문 확률 보너스 ${(s.catBonusToday*100).toFixed(0)}%p`);
    createanonymousPostForAction("day");
    maybeProjectFailure();
    maybeStaffResignation();
    render();
});

$("showSignupButton").addEventListener("click", () => {setAuthMode("signup");});

$("showLoginButton").addEventListener("click", () => {setAuthMode("login");});


initializeAccountAccess();

loadCafeteriaMenuData().catch(error => {
    console.error("구내식당 데이터 사전 로딩 실패:", error);
});

resetDailyStats();
newDailyMissions();
previewGoal();
render();
