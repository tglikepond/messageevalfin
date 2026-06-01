// ===== Firebase Imports =====
import { db, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy } from './firebase-config.js';

// ===== 10 AI Evaluation Items (Full Analysis) =====
const aiEvalItems = [
  {
    id: 'first_line_attraction', title: '첫 줄 및 프리뷰 후킹력', category: '수신 & 프리뷰', icon: '✍️',
    tip: '30자 이내 질문형/수치형 키워드 배치. 상투적 인사 최소화', rec: '첫 문장의 상투적 인사를 빼고 30자 이내에 핵심 질문이나 수치 혜택을 명시하세요.'
  },
  {
    id: 'visual_emoji_harmony', title: '비주얼 후킹 및 이모지 조화', category: '시각적 인지', icon: '🎨',
    tip: '100자당 이모지 1~2개 수준 최적. 과도함 및 전무함 방지', rec: '텍스트 100자당 1-2개 수준으로 이모지를 배치해 시각적 집중도를 높이세요.'
  },
  {
    id: 'personalization_density', title: '개인화 정밀성 & 밀도', category: '오프닝', icon: '🧩',
    tip: '고객명/치환 변수의 오프닝 자연스러운 배치 및 개수(2개 이상)', rec: '메시지 오프닝에 동적 치환 변수([이름], [날짜] 등)를 추가하여 개별 맞춤 느낌을 강화하세요.'
  },
  {
    id: 'opening_conciseness', title: '오프닝 맥락 간결성', category: '오프닝', icon: '📄',
    tip: '상투적 서두 생략. 3초 이내 본론 목적 인지 두괄식 전개', rec: '안부 인사를 생략하고 첫 1~2문장 내에 발송 목적과 주요 가치를 두괄식으로 기술하세요.'
  },
  {
    id: 'timing_optimization', title: '요일/시간 타이밍 매칭', category: '컨텍스트', icon: '⏰',
    tip: '콘텐츠 성격(감성/후기 vs 혜택/마감)에 적절한 발송 요일/시간대', rec: '기부 성과/스토리는 주말 전 저녁 시간대, 참여 신청은 주중 오전 시간대로 발송 일정을 조정해 보세요.'
  },
  {
    id: 'urgency_trigger', title: '긴급성 및 즉각적 유도', category: '본문 탐독', icon: '🚨',
    tip: '마감 시한, 희소성 자극, 실시간 아동 상황 등으로 즉시 열람 유도', rec: '메시지에 마감 시간(예: 오늘 밤 12시 마감)이나 즉시 확인해야 할 실시간 명분을 추가해 보세요.'
  },
  {
    id: 'cognitive_readability', title: '인지 명확성 및 가독 구조', category: '본문 탐독', icon: '👁️',
    tip: '쉬운 어휘와 짧은 단문 위주 구성, 핵심 정보가 직관적으로 배치된 구조', rec: '만연체 문장을 줄이고 단락 구분 및 줄바꿈을 활용하여 한눈에 핵심 정보가 들어오도록 구조화하세요.'
  },
  {
    id: 'value_pre_exposure', title: '혜택 가치 사전 노출도', category: '본문 신뢰', icon: '🎁',
    tip: '상세 링크 클릭 전 본문에서 명확한 정서적 보람/수혜 결과 사전 요약', rec: '링크 클릭 전에 알림톡 본문 내에서 고객이 누릴 보람이나 혜택 요약본을 미리 일부 노출하세요.'
  },
  {
    id: 'copywriting_quality', title: '문장 완결성 및 표현 퀄리티', category: '최종 액션', icon: '✍️',
    tip: '자연스러운 문맥 흐름, 비문/오탈자 없음, 감정적 호소와 정보의 균형', rec: '스토리텔링의 전개를 유기적으로 흐르도록 매끄럽게 다듬고, 맞춤법과 올바른 주술 호응 문장으로 격조를 높이세요.'
  },
  {
    id: 'cta_actionability', title: 'CTA 액션 문구 직관성', category: '최종 액션', icon: '🔗',
    tip: '행동 촉구형 동사와 클릭 후 얻게 될 혜택의 매력적 결합 명칭', rec: '버튼 텍스트를 모호한 \'자세히 보기\' 대신 \'💌 아이의 손편지 읽어보기\'처럼 혜택과 행동이 결합된 표현으로 수정하세요.'
  }
];

function calculateTpi(scores) {
  if (!scores || Object.keys(scores).length === 0) return 0;
  
  const openIds = [
    'first_line_attraction', 
    'visual_emoji_harmony', 
    'personalization_density', 
    'opening_conciseness', 
    'timing_optimization', 
    'urgency_trigger', 
    'cognitive_readability', 
    'value_pre_exposure'
  ];
  const convertIds = [
    'copywriting_quality', 
    'cta_actionability'
  ];
  
  let openSum = 0, openCount = 0;
  openIds.forEach(id => {
    if (typeof scores[id] === 'number') {
      openSum += scores[id];
      openCount++;
    }
  });
  const openIndex = openCount > 0 ? (openSum / openCount) : 5;
  
  let convertSum = 0, convertCount = 0;
  convertIds.forEach(id => {
    if (typeof scores[id] === 'number') {
      convertSum += scores[id];
      convertCount++;
    }
  });
  const convertIndex = convertCount > 0 ? (convertSum / convertCount) : 5;
  
  let tpi = (openIndex * 8) + (convertIndex * 2);
  tpi = Math.round(tpi * 10) / 10;
  
  return Math.round(Math.max(0, Math.min(100, tpi)));
}

// ===== Firestore Storage =====
const CAMPAIGNS_COLLECTION = 'campaigns';
let campaignsCache = []; // Local cache synced with Firestore

function loadCampaigns() { return campaignsCache; }

async function saveCampaignToFirestore(campaign) {
  try {
    await setDoc(doc(db, CAMPAIGNS_COLLECTION, String(campaign.id)), campaign);
  } catch (e) {
    console.error('Firestore save error:', e);
    showToast('⚠️ 저장 실패: ' + e.message);
  }
}

async function deleteCampaignFromFirestore(id) {
  try {
    await deleteDoc(doc(db, CAMPAIGNS_COLLECTION, String(id)));
  } catch (e) {
    console.error('Firestore delete error:', e);
    showToast('⚠️ 삭제 실패: ' + e.message);
  }
}

function initFirestore() {
  // Real-time listener: syncs all changes from any user
  const q = query(collection(db, CAMPAIGNS_COLLECTION));
  onSnapshot(q, (snapshot) => {
    campaignsCache = snapshot.docs.map(d => ({ ...d.data(), id: isNaN(Number(d.id)) ? d.id : Number(d.id) }));
    // Sort by createdAt or id
    campaignsCache.sort((a, b) => (a.id > b.id ? 1 : -1));
    updateBadge();
    refreshOverview();
    refreshResultSelector();
  }, (error) => {
    console.error('Firestore listener error:', error);
    showToast('⚠️ 데이터 동기화 오류: ' + error.message);
  });
}

// ===== State =====
let aiScores = {};
let aiImprovements = {};
let aiRecommendations = [];
let lastUsedModel = '';
let feedbackRating = 0;
let feedbackEnabled = false;
let aiCompleted = false;
let currentCampaignId = null;
let aiImageBase64 = null;
let aiImageMimeType = null;
let selectedCampaignCache = null;
let lastGeneratedPrompt = `============================================================
💚 초록우산 AI 알림톡 문안 생성기 시스템 지침 명세서 (System Prompt Spec)
============================================================

[1] AI 페르소나 및 핵심 미션
- 아동복지 전문기관 초록우산(www.chorogusan.or.kr)의 전문 카피라이터
- 후원자 대상 정기 정보 전달 및 참여 유도를 위한 따뜻하고 품격 있는 메시지 작성

[2] 알림톡 공통 3단계 구조 지침
- 1단계: 오프닝 (안부 인사를 생략하고 첫 문장부터 강렬하게 유형별 성격 강조)
- 2단계: 실제 내용 및 제안 (사용자 제공 성과 수치, 통계, 혜택 일정 기술)
- 3단계: 행동 촉구 (메시지 테마에 맞춰 고도화된 타겟 유도 문구 구성)

[3] 서비스 종류별 3대 특화 유형 정의
------------------------------------------------------------
■ 서비스 종류 A: 피드백 / 결과보고 (지원 현황 및 성과 안내)
- [유형 1] 정보제공중심형: 객관적 수치(XX명, XX%) 강조, 지어낸 숫자는 XX 마스킹 처리
- [유형 2] 감정터치중심형: 수혜 아동의 순수한 편지글/한마디 직접 인용구('...') 및 스토리텔링
- [유형 3] 행동강조중심형: 아동 변화를 보여주며 테마 밀착형 행동 유도(CTA) 강조

■ 서비스 종류 B: 혜택 / 참여활동 (문화 혜택 및 활동 신청 안내)
- [유형 1] 희소성강조형: 마감 임박 상태, 한정 수량, 🚨 경고 이모지 활용으로 긴급성 부여
- [유형 2] 우대프라이빗형: 명예로운 혜택/VIP 전용 초청 톤, 품격 있는 감사와 우대
- [유형 3] 화제가치강조형: 트렌드, SNS 화제성, 독창적 요소를 자극하는 호기심 유발 질문
------------------------------------------------------------

[4] 글자 수 준수 규칙
- 단문(short): 공백 포함 140자 이상 ~ 200자 이하의 조밀한 전개
- 장문(long): 공백 포함 210자 이상 ~ 400자 이하의 구체적이고 풍부한 감동 전달

[5] JSON 무결성 및 인용 따옴표 예외 지침
- 데이터의 안정적 수신을 위해 'application/json' 구조로 출력 강제
- JSON 파싱 오류 방지를 위해 텍스트 내 직접 인용구 표현 시 쌍따옴표(") 금지 및 홑따옴표(') 사용 강제`;

// ===== Rate Calculators =====
function updateCalculatedRates() {
  const sendCount = parseFloat(document.getElementById('sendCount').value) || 0;
  const openCount = parseFloat(document.getElementById('openCount').value) || 0;
  const convertCount = parseFloat(document.getElementById('convertCount').value) || 0;

  const openRateEl = document.getElementById('calculatedOpenRate');
  const convertRateEl = document.getElementById('calculatedConvertRate');

  if (openCount > sendCount && sendCount > 0) {
    openRateEl.style.color = 'var(--accent-rose)';
    openRateEl.style.fontWeight = '800';
  } else {
    openRateEl.style.color = 'var(--accent-blue)';
    openRateEl.style.fontWeight = '700';
  }

  if (convertCount > openCount && openCount > 0) {
    convertRateEl.style.color = 'var(--accent-rose)';
    convertRateEl.style.fontWeight = '800';
  } else {
    convertRateEl.style.color = 'var(--accent-emerald)';
    convertRateEl.style.fontWeight = '700';
  }

  const openRate = sendCount > 0 ? (openCount / sendCount) * 100 : 0;
  const convertRate = openCount > 0 ? (convertCount / openCount) * 100 : 0;

  openRateEl.value = sendCount > 0 ? openRate.toFixed(1) + '%' : '—';
  convertRateEl.value = openCount > 0 ? convertRate.toFixed(1) + '%' : '—';
}

function initRateCalculators() {
  ['sendCount', 'openCount', 'convertCount'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', updateCalculatedRates);
    }
  });
}

// ===== Init =====
function initAll() {
  initTabs();
  initFeedbackStars();
  initDragDrop();
  initFirestore(); // Start real-time sync with Firestore
  updateBadge();
  initGenServiceType();
  initImgGen();
  initRateCalculators();
}


function updateBadge() { document.getElementById('savedCountBadge').textContent = `📊 저장된 평가: ${campaignsCache.length}건`; }

// ===== Tabs =====
function initTabs() { document.querySelectorAll('.nav-tab').forEach(tab => { tab.addEventListener('click', () => switchTab(tab.dataset.tab)); }); }
function switchTab(tabId) {
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(`tab-${tabId}`).classList.add('active');
  if (tabId === 'overview') refreshOverview();
  if (tabId === 'results') refreshResultSelector();
}

// ===== Feedback Stars =====
function initFeedbackStars() {
  const labels = ['', '😞 1점', '🙁 2점', '😐 3점', '😊 4점', '🤩 5점'];
  document.querySelectorAll('.feedback-star').forEach(star => {
    star.addEventListener('click', () => { feedbackRating = parseInt(star.dataset.value); setStars(feedbackRating); document.getElementById('starLabel').textContent = labels[feedbackRating]; });
  });
}
function setStars(r) { document.querySelectorAll('.feedback-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= r)); }

// ===== Save Campaign Data =====
async function saveCampaignData() {
  const name = document.getElementById('campaignName').value.trim();
  if (!name) { showToast('⚠️ 캠페인명을 입력해 주세요.'); return false; }
  
  const campaignType = document.getElementById('campaignType').value;
  if (!campaignType) { showToast('⚠️ 발송 유형을 선택해 주세요.'); return false; }

  const sendCountVal = document.getElementById('sendCount').value;
  const openCountVal = document.getElementById('openCount').value;
  const convertCountVal = document.getElementById('convertCount').value;

  if (sendCountVal === '' || openCountVal === '' || convertCountVal === '') {
    showToast('⚠️ 발송수, 오픈수, 후원신청수를 모두 입력해 주세요.');
    return false;
  }

  const sendCount = parseFloat(sendCountVal) || 0;
  const openCount = parseFloat(openCountVal) || 0;
  const convertCount = parseFloat(convertCountVal) || 0;

  const openRate = sendCount > 0 ? Math.round((openCount / sendCount) * 1000) / 10 : 0;
  const convertRate = openCount > 0 ? Math.round((convertCount / openCount) * 1000) / 10 : 0;

  const campaign = {
    id: currentCampaignId || Date.now(), name,
    campaignType,
    sendDate: document.getElementById('sendDate').value,
    sendTime: document.getElementById('sendTime').value,
    sendRecipients: sendCount,
    sendCount,
    openCount,
    convertCount,
    channel: '',
    segment: '',
    openRate,
    convertRate,
    msgTitle: '',
    msgBody: document.getElementById('aiMsgBody').value.trim(),
    ctaLinks: getCtaLinks(),
    msgStats: calculateMsgStats(document.getElementById('aiMsgBody').value.trim()),
    aiScores: { ...aiScores },
    aiImprovements: { ...aiImprovements },
    aiRecommendations: [...aiRecommendations],
    aiReport: document.getElementById('aiResultContent')?.innerHTML || '',
    aiModel: lastUsedModel || '',
    feedback: feedbackEnabled ? {
      rating: feedbackRating,
      relevance: parseInt(document.getElementById('fbRelevance').value) || 5,
      willingness: parseInt(document.getElementById('fbWillingness').value) || 5,
      count: parseInt(document.getElementById('fbCount').value) || 0,
      comment: document.getElementById('fbComment').value
    } : { rating: 0, relevance: 5, willingness: 5, count: 0, comment: '' },
    createdAt: new Date().toLocaleDateString('ko-KR')
  };
  await saveCampaignToFirestore(campaign);
  currentCampaignId = campaign.id;
  updateBadge();
  return true;
}

// ===== Navigation Actions =====
async function saveAndShowResult() {
  const result = await saveCampaignData();
  if (!result) return;
  switchTab('results');
  document.getElementById('resultCampaignSelect').value = currentCampaignId;
  loadCampaignResult();
  showToast('📊 저장 완료! 종합 결과를 확인하세요.');
}

function runAiAndSave() {
  const name = document.getElementById('campaignName').value.trim();
  if (!name) { showToast('⚠️ 캠페인명을 먼저 입력해 주세요.'); return; }
  runAiEvaluation();
}

// ===== Results =====
function clearCampaignResult() {
  selectedCampaignCache = null;
  const scoreRing = document.getElementById('scoreRing');
  const openRing = document.getElementById('openIndexRing');
  const convertRing = document.getElementById('convertIndexRing');
  if (scoreRing) scoreRing.style.strokeDashoffset = '238.76';
  if (openRing) openRing.style.strokeDashoffset = '301.6';
  if (convertRing) convertRing.style.strokeDashoffset = '175.93';
  
  document.getElementById('scoreNum').textContent = '—';
  document.getElementById('scoreGrade').textContent = '캠페인을 선택해 주세요';
  document.getElementById('scoreComment').textContent = '위 선택박스에서 캠페인을 선택하세요.';
  
  document.getElementById('scoreNumTpi').textContent = '—';
  document.getElementById('scoreNumOpen').textContent = '—';
  document.getElementById('scoreNumConvert').textContent = '—';
  
  document.getElementById('resultSummarySection').style.display = 'none';
  
  const msgBodySection = document.getElementById('resultMsgBodySection');
  if (msgBodySection) msgBodySection.style.display = 'none';
  const ctaSection = document.getElementById('resultCtaSection');
  if (ctaSection) ctaSection.style.display = 'none';
  const statsSection = document.getElementById('resultMsgStatsSection');
  if (statsSection) statsSection.style.display = 'none';
  
  document.getElementById('aiResultSection').style.display = 'none';
  document.getElementById('aiScoreSummary').style.display = 'none';
  document.getElementById('aiResultCard').style.display = 'none';
}

function refreshResultSelector() {
  const dateFilter = document.getElementById('filterCampaignDate');
  const typeFilter = document.getElementById('filterCampaignType');
  const sel = document.getElementById('resultCampaignSelect');
  
  if (!dateFilter || !typeFilter || !sel) return;
  
  const campaigns = loadCampaigns();
  const selectedDate = dateFilter.value;
  const selectedType = typeFilter.value;
  const curVal = sel.value;
  
  // Extract unique send dates (ignoring empty dates) and sort descending
  const uniqueDates = [...new Set(campaigns.map(c => c.sendDate).filter(d => d))].sort((a, b) => b.localeCompare(a));
  
  dateFilter.innerHTML = '<option value="">발송일 선택 (전체)</option>' +
    uniqueDates.map(d => `<option value="${d}">${d}</option>`).join('');
  
  if (uniqueDates.includes(selectedDate)) {
    dateFilter.value = selectedDate;
  } else {
    dateFilter.value = '';
  }
  
  // Filter campaigns
  let filteredCampaigns = campaigns;
  if (dateFilter.value) {
    filteredCampaigns = filteredCampaigns.filter(c => c.sendDate === dateFilter.value);
  }
  if (selectedType) {
    filteredCampaigns = filteredCampaigns.filter(c => c.campaignType === selectedType);
  }
  
  sel.innerHTML = '<option value="">캠페인을 선택하세요</option>' +
    filteredCampaigns.map(c => `<option value="${c.id}">${c.name} (${c.sendDate || c.createdAt})</option>`).join('');
  
  // If previously selected campaign is in the filtered list, keep it selected. Otherwise reset.
  if (curVal && filteredCampaigns.some(c => String(c.id) === String(curVal))) {
    sel.value = curVal;
  } else {
    sel.value = '';
    clearCampaignResult();
  }
}

function loadCampaignResult() {
  const idVal = document.getElementById('resultCampaignSelect').value;
  if (!idVal) return;
  const c = loadCampaigns().find(x => String(x.id) === String(idVal));
  if (!c) return;
  selectedCampaignCache = c;

  // Calculate scores
  const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
  let aiPct = 0;
  if (hasAi) aiPct = calculateTpi(c.aiScores);
  const hasFb = c.feedback && c.feedback.rating > 0;
  let fbPct = 0;
  if (hasFb) fbPct = Math.round(((c.feedback.rating * 2) + c.feedback.relevance + c.feedback.willingness) / 30 * 100);

  let totalPct, breakdown;
  if (hasAi && hasFb) { totalPct = Math.round(aiPct * 0.7 + fbPct * 0.3); breakdown = `AI ${aiPct}×70% + 피드백 ${fbPct}×30%`; }
  else if (hasAi) { totalPct = aiPct; breakdown = `AI 평가 점수`; }
  else if (hasFb) { totalPct = fbPct; breakdown = `피드백 점수만 반영`; }
  else { totalPct = 0; breakdown = '아직 평가되지 않음'; }

  // Concentric Neon SVG Rings Stroke animation
  const openIds = ['first_line_attraction', 'visual_emoji_harmony', 'personalization_density', 'opening_conciseness', 'timing_optimization', 'urgency_trigger', 'cognitive_readability', 'value_pre_exposure'];
  const convertIds = ['copywriting_quality', 'cta_actionability'];
  
  let openSum = 0, openCount = 0;
  openIds.forEach(fid => { if (typeof c.aiScores[fid] === 'number') { openSum += c.aiScores[fid]; openCount++; } });
  const openIndex = openCount > 0 ? (openSum / openCount) : 0;
  
  let convertSum = 0, convertCount = 0;
  convertIds.forEach(fid => { if (typeof c.aiScores[fid] === 'number') { convertSum += c.aiScores[fid]; convertCount++; } });
  const convertIndex = convertCount > 0 ? (convertSum / convertCount) : 0;

  const openIndexRing = document.getElementById('openIndexRing');
  const convertIndexRing = document.getElementById('convertIndexRing');
  const scoreRing = document.getElementById('scoreRing');
  
  if (openIndexRing) {
    openIndexRing.style.strokeDashoffset = '301.6';
    setTimeout(() => { openIndexRing.style.strokeDashoffset = String(301.6 - (301.6 * (openIndex / 10))); }, 100);
  }
  if (convertIndexRing) {
    convertIndexRing.style.strokeDashoffset = '175.93';
    setTimeout(() => { convertIndexRing.style.strokeDashoffset = String(175.93 - (175.93 * (convertIndex / 10))); }, 100);
  }
  if (scoreRing) {
    scoreRing.style.strokeDashoffset = '238.76';
    setTimeout(() => { scoreRing.style.strokeDashoffset = String(238.76 - (238.76 * (totalPct / 100))); }, 100);
  }
  
  document.getElementById('scoreNum').textContent = totalPct;
  document.getElementById('scoreGrade').textContent = totalPct >= 75 ? '🏆 우수' : totalPct >= 50 ? '📈 보통' : totalPct > 0 ? '⚠️ 개선 필요' : '—';
  
  document.getElementById('scoreComment').innerHTML = (totalPct >= 75 ? '매우 우수한 캠페인입니다!' : totalPct >= 50 ? '양호하나 일부 개선이 필요합니다.' : totalPct > 0 ? '여러 항목에서 개선이 필요합니다.' : 'AI 분석을 실행해 주세요.') + `<br><span style="font-size:12px;color:var(--text-muted);">가중치: ${breakdown}</span>`;
  
  document.getElementById('scoreNumTpi').textContent = totalPct + '점';
  document.getElementById('scoreNumOpen').textContent = openIndex.toFixed(1) + '점/10';
  document.getElementById('scoreNumConvert').textContent = convertIndex.toFixed(1) + '점/10';

  // Summary cards
  document.getElementById('resultSummarySection').style.display = 'block';

  // Campaign info
  const typeLabel = c.campaignType === 'feedback' ? '📋 피드백/결과보고' : c.campaignType === 'benefit' ? '🎁 혜택/참여활동' : c.campaignType === 'other' ? '💬 기타' : '—';
  let countsHtml = '';
  if (c.sendCount !== undefined) {
    countsHtml = `<strong>발송수:</strong> ${c.sendCount.toLocaleString()}건 · <strong>오픈수:</strong> ${c.openCount.toLocaleString()}건 · <strong>후원신청수:</strong> ${c.convertCount.toLocaleString()}건<br>`;
  }
  document.getElementById('resultCampaignSummary').innerHTML = `
    <strong>캠페인명:</strong> ${c.name}<br>
    <strong>발송 유형:</strong> ${typeLabel}<br>
    <strong>발송일시:</strong> ${c.sendDate || '미입력'} ${c.sendTime || ''}<br>
    ${countsHtml}
    <strong>오픈율:</strong> <span style="color:var(--accent-blue)">${c.openRate}%</span> · 
    <strong>전환율:</strong> <span style="color:var(--accent-emerald)">${c.convertRate}%</span>`;

  // AI summary and detailed report
  if (hasAi) {
    document.getElementById('resultAiSummary').innerHTML = `
      <strong>AI 종합:</strong> <span style="color:var(--accent-purple)">${aiPct}점</span>/100<br>
      ${aiEvalItems.map(it => `${it.icon} ${it.title}: <strong>${c.aiScores[it.id] || '-'}</strong>`).join('<br>')}`;

    // Show AI result sections in Tab 2
    document.getElementById('aiResultSection').style.display = 'block';
    document.getElementById('aiScoreSummary').style.display = 'block';
    document.getElementById('aiResultCard').style.display = 'block';
    document.getElementById('aiResultTime').textContent = c.aiModel ? `${c.sendDate || c.createdAt || ''} · ${c.aiModel}` : 'AI Generated';
    
    // Restore global states to render score grid correctly
    aiScores = c.aiScores || {};
    aiImprovements = c.aiImprovements || {};
    renderAiScoreGrid();

    // Restore report HTML
    document.getElementById('aiResultContent').innerHTML = c.aiReport || '';
  } else {
    document.getElementById('resultAiSummary').innerHTML = '<span style="color:var(--text-muted)">AI 평가 미실행</span>';
    document.getElementById('aiResultSection').style.display = 'none';
    document.getElementById('aiScoreSummary').style.display = 'none';
    document.getElementById('aiResultCard').style.display = 'none';
  }

  // Feedback summary
  if (hasFb) {
    document.getElementById('resultFbSummary').innerHTML = `
      <strong>별점:</strong> ${'★'.repeat(c.feedback.rating)}${'☆'.repeat(5 - c.feedback.rating)} (${c.feedback.rating}/5)<br>
      <strong>관련성:</strong> ${c.feedback.relevance}/10<br>
      <strong>재수신:</strong> ${c.feedback.willingness}/10<br>
      <strong>수집 건수:</strong> ${c.feedback.count || '미입력'}건
      ${c.feedback.comment ? '<br><strong>의견:</strong> ' + c.feedback.comment.slice(0, 60) + (c.feedback.comment.length > 60 ? '...' : '') : ''}`;
  } else {
    document.getElementById('resultFbSummary').innerHTML = '<span style="color:var(--text-muted)">피드백 미입력</span>';
  }

  // Message Body display
  const msgBodyEl = document.getElementById('resultMsgBody');
  const msgBodySection = document.getElementById('resultMsgBodySection');
  if (c.msgBody) {
    msgBodySection.style.display = 'block';
    const truncated = c.msgBody.length > 300 ? c.msgBody.slice(0, 300) + '...' : c.msgBody;
    msgBodyEl.textContent = truncated;
  } else {
    msgBodySection.style.display = 'none';
  }

  // CTA Links display
  const ctaSection = document.getElementById('resultCtaSection');
  const ctaEl = document.getElementById('resultCtaLinks');
  const ctaLinks = c.ctaLinks || [];
  if (ctaLinks.length > 0) {
    ctaSection.style.display = 'block';
    ctaEl.innerHTML = ctaLinks.map((link, i) =>
      `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(15,23,42,0.4);border-radius:var(--radius-md);border:1px solid var(--border-glass);margin-bottom:8px;">
        <span style="font-size:12px;color:var(--accent-purple);font-weight:700;min-width:20px;">${['①','②','③','④'][i] || (i+1)}</span>
        <div style="flex:1;">
          <div style="font-weight:600;color:var(--text-primary);font-size:13px;">${link.name || '(미입력)'}</div>
          <a href="${link.url}" target="_blank" style="font-size:12px;color:var(--accent-blue);word-break:break-all;">${link.url || '(미입력)'}</a>
        </div>
      </div>`
    ).join('');
  } else {
    ctaSection.style.display = 'none';
  }

  // Message Stats (quantitative metrics)
  const stats = c.msgStats || (c.msgBody ? calculateMsgStats(c.msgBody) : null);
  const statsSection = document.getElementById('resultMsgStatsSection');
  if (stats && stats.charCount > 0) {
    statsSection.style.display = 'block';
    document.getElementById('resultMsgStats').innerHTML = `
      <div class="stat-card">
        <div class="stat-value blue">${stats.charCount}<span style="font-size:12px;color:var(--text-muted);">자</span></div>
        <div class="stat-label">총 글자 수</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">공백 제외 ${stats.charCountNoSpaces}자 · ${stats.lineCount}줄</div>
      </div>
      <div class="stat-card">
        <div class="stat-value amber">${stats.emojiCount}<span style="font-size:12px;color:var(--text-muted);">개</span></div>
        <div class="stat-label">이모지 사용</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${stats.emojiList && stats.emojiList.length > 0 ? stats.emojiList.join(' ') : '없음'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value emerald">${stats.personalizationCount}<span style="font-size:12px;color:var(--text-muted);">개</span></div>
        <div class="stat-label">개인화 변수</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${stats.personalizationList && stats.personalizationList.length > 0 ? stats.personalizationList.join(', ') : '없음'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-value purple">${(c.ctaLinks || []).length}<span style="font-size:12px;color:var(--text-muted);">개</span></div>
        <div class="stat-label">CTA 버튼</div>
        <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">본문 URL ${stats.urlCount || 0}개</div>
      </div>`;
  } else {
    statsSection.style.display = 'none';
  }

  // Result table (AI 10 items) - removed from UI, but keep aiImps for reference
  const aiImps = c.aiImprovements || {};

  // 1:1 Side-by-side Feature Contrast Matrix
  const pastCampaigns = loadCampaigns().filter(camp => camp.aiScores && Object.keys(camp.aiScores).length > 0 && String(camp.id) !== String(idVal));
  let bestCampaign = null;
  let similarCampaign = null;
  if (pastCampaigns.length > 0) {
    const sortedByOpen = [...pastCampaigns].sort((x, y) => (y.openRate || 0) - (x.openRate || 0));
    bestCampaign = sortedByOpen[0];
    similarCampaign = findMostSimilarCampaign(c, pastCampaigns);
  }

  if (bestCampaign || similarCampaign) {
    document.getElementById('featureSimulatorSection').style.display = 'block';
    const fVal = (camp, type) => {
      if (!camp) return '—';
      if (type === 'weekday') return getDayOfWeek(camp.sendDate) || '(미지정)';
      if (type === 'time') return camp.sendTime || '(미지정)';
      if (type === 'chars') return (camp.msgStats ? camp.msgStats.charCount : (camp.msgBody ? camp.msgBody.length : 0)) + '자';
      if (type === 'emojis') return (camp.msgStats ? camp.msgStats.emojiCount : 0) + '개';
      if (type === 'cta') return (camp.ctaLinks ? camp.ctaLinks.length : 0) + '개';
      if (type === 'open') return (camp.openRate || 0) + '%';
      if (type === 'convert') return (camp.convertRate || 0) + '%';
      return '—';
    };

    const dims = [
      { label: '📅 발송 요일', key: 'weekday' },
      { label: '⏰ 발송 시간대', key: 'time' },
      { label: '📝 총 글자 수', key: 'chars' },
      { label: '😄 이모지 수', key: 'emojis' },
      { label: '🎯 CTA 버튼 수', key: 'cta' },
      { label: '📬 실제 오픈율', key: 'open', isMetric: true, color: 'var(--accent-blue)' },
      { label: '🎯 실제 전환율', key: 'convert', isMetric: true, color: 'var(--accent-emerald)' }
    ];

    const tableHtml = dims.map(d => {
      const curText = fVal(c, d.key);
      const bestText = fVal(bestCampaign, d.key);
      const simText = fVal(similarCampaign, d.key);
      let styleTd = 'padding:12px 14px;font-size:13px;border-bottom:1px solid var(--border-glass);';
      if (d.isMetric) styleTd += `font-weight:800;color:${d.color};background:rgba(255,255,255,0.02);`;
      return `<tr>
        <td style="text-align:left;font-weight:700;padding:12px 14px;border-bottom:1px solid var(--border-glass);">${d.label}</td>
        <td style="${styleTd}font-weight:700;color:var(--text-primary);">${curText}</td>
        <td style="${styleTd}">${bestText}</td>
        <td style="${styleTd}">${simText}</td>
      </tr>`;
    }).join('');
    document.getElementById('featureComparisonBody').innerHTML = tableHtml;
  } else {
    document.getElementById('featureSimulatorSection').style.display = 'none';
  }

  // 2D Positioning Matrix Board
  const matrixContainer = document.getElementById('matrixDotsContainer');
  if (matrixContainer) {
    document.getElementById('positioningMatrixSection').style.display = 'block';
    matrixContainer.innerHTML = '';
    const allCamps = loadCampaigns();
    
    allCamps.forEach(camp => {
      const hasCampAi = camp.aiScores && Object.keys(camp.aiScores).length > 0;
      if (!hasCampAi) return;

      let oSum = 0, oCount = 0;
      openIds.forEach(fid => { if (typeof camp.aiScores[fid] === 'number') { oSum += camp.aiScores[fid]; oCount++; } });
      const oIdx = oCount > 0 ? (oSum / oCount) : 5;

      let cSum = 0, cCount = 0;
      convertIds.forEach(fid => { if (typeof camp.aiScores[fid] === 'number') { cSum += camp.aiScores[fid]; cCount++; } });
      const cIdx = cCount > 0 ? (cSum / cCount) : 5;

      // Constrain position between 4% and 96%
      const xPct = 4 + (oIdx / 10) * 92;
      const yPct = 4 + (cIdx / 10) * 92;
      const isCurrent = String(camp.id) === String(idVal);

      const dot = document.createElement('div');
      dot.style.position = 'absolute';
      dot.style.left = `${xPct}%`;
      dot.style.bottom = `${yPct}%`;
      dot.style.transform = 'translate(-50%, 50%)';

      if (isCurrent) {
        dot.className = 'matrix-star-active';
        dot.style.width = '16px';
        dot.style.height = '16px';
        dot.style.background = 'var(--accent-purple)';
        dot.style.borderRadius = '50%';
        dot.style.boxShadow = '0 0 12px var(--accent-purple)';
        dot.title = `[현재] ${camp.name} (오픈지수: ${oIdx.toFixed(1)}, 전환지수: ${cIdx.toFixed(1)})`;
      } else {
        dot.className = 'matrix-dot-past';
        dot.style.width = '9px';
        dot.style.height = '9px';
        dot.style.background = 'rgba(255, 255, 255, 0.45)';
        dot.style.borderRadius = '50%';
        dot.style.border = '1px solid rgba(255,255,255,0.3)';
        dot.title = `${camp.name} (오픈지수: ${oIdx.toFixed(1)}, 전환지수: ${cIdx.toFixed(1)})`;
        dot.addEventListener('click', () => {
          document.getElementById('resultCampaignSelect').value = camp.id;
          loadCampaignResult();
        });
      }
      matrixContainer.appendChild(dot);
    });

    const insightEl = document.getElementById('quadrantInsightCard');
    if (insightEl) {
      if (openIndex >= 7.5 && convertIndex >= 7.5) {
        insightEl.innerHTML = `<strong style="color:var(--accent-purple);">🌟 스타 (CRM Star) 영역 포지셔닝 완료</strong><br>
          이번 캠페인은 높은 오프닝 후킹력과 최적의 CTA 설계가 양립된 최정상급 메시지입니다. A/B 테스트 시 본문의 사소한 타이밍 변수만 추가 조정하며 성과를 고도화하세요.`;
      } else if (openIndex >= 7.5 && convertIndex < 7.5) {
        insightEl.innerHTML = `<strong style="color:var(--accent-blue);">📬 트래픽 캐쳐 (Traffic Catcher) 영역 포지셔닝 완료</strong><br>
          첫 줄 후킹과 타이밍 최적화로 많은 후원자의 관심을 끄는 데는 성공할 것으로 보이나, CTA 설계(${convertIndex.toFixed(1)}점)가 취약합니다. <strong>CTA 버튼의 직관성을 보완</strong>하여 클릭 전환 이탈률을 방지하세요.`;
      } else if (openIndex < 7.5 && convertIndex >= 7.5) {
        insightEl.innerHTML = `<strong style="color:var(--accent-emerald);">🎯 클로저 (Closer) 영역 포지셔닝 완료</strong><br>
          CTA 설계 및 가치 집중도가 매끄러워 메시지를 읽은 고객의 전환 효율은 높을 것으로 보이나, 오프닝 프리뷰(${openIndex.toFixed(1)}점)가 따분합니다. <strong>첫 줄에 호기심 질문이나 파격적인 수치</strong>를 명시하여 오프닝 레이트를 수혈하세요.`;
      } else {
        insightEl.innerHTML = `<strong style="color:var(--accent-rose);">⚠️ 리빌딩 대상 (Rebuilding Target) 영역 포지셔닝 완료</strong><br>
          오프닝 후킹력과 CTA 전환 설계가 모두 평균(7.5점) 미만으로 리빌딩이 권장되는 슬럼프 상태입니다. <strong>초록우산 AI 문안 생성기</strong> 탭을 활용해 최적화된 시안을 즉시 보충 수수해 보세요.`;
      }
    }
  }


}

// ===== Modal =====
function openModal(type) {
  const c = selectedCampaignCache;
  if (!c) { showToast('⚠️ 캠페인을 먼저 선택해 주세요.'); return; }
  const overlay = document.getElementById('modalOverlay');
  const title = document.getElementById('modalTitle');
  const body = document.getElementById('modalBody');

  if (type === 'ai') {
    const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
    const aiImps = c.aiImprovements || {};
    title.textContent = '🤖 AI 평가 세부 내용 (10개 항목)';
    if (!hasAi) {
      body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">AI 평가가 실행되지 않았습니다.</p>';
    } else {
      const aiPct = calculateTpi(c.aiScores);
      // Clean the saved report from any JSON/code artifacts
      let cleanReport = '';
      if (c.aiReport) {
        cleanReport = c.aiReport
          .replace(/```[\w]*[\s\S]*?```/g, '')
          .replace(/\{"subject"[\s\S]*?\}/g, '')
          .replace(/\["[^"]*"(?:,"[^"]*")*\]/g, '')
          .replace(/\*\*첫 번째 JSON 블록\*\*[^<]*/g, '')
          .replace(/\*\*두 번째 JSON 블록\*\*[^<]*/g, '')
          .replace(/\*\*세 번째 JSON 블록\*\*[^<]*/g, '')
          .replace(/<code[^>]*>\s*\{[^<]*\}\s*<\/code>/g, '')
          .replace(/(<br\s*\/?>){4,}/g, '<br><br>')
          .replace(/(<\/div>\s*<div[^>]*>){3,}/g, '</div><div style="margin:8px 0;">')
          .trim();
      }
      body.innerHTML = `
        <h4 style="margin-bottom:12px;">📊 AI 종합 점수: <span style="color:var(--accent-purple)">${aiPct}점</span> / 100점</h4>
        <table class="result-table"><thead><tr><th>No.</th><th>항목</th><th>AI 점수</th><th>등급</th><th>AI 개선사항</th></tr></thead><tbody>
          ${aiEvalItems.map((it, i) => {
        const ai = c.aiScores[it.id] || '-';
        const g = typeof ai === 'number' ? (ai >= 8 ? 'high' : ai >= 5 ? 'mid' : 'low') : 'mid';
        const improvement = aiImps[it.id] || it.rec;
        return `<tr><td>${i + 1}</td><td>${it.icon} ${it.title}</td>
              <td style="color:var(--accent-purple);font-weight:700;">${ai}</td>
              <td><span class="score-badge ${g}">${typeof ai === 'number' ? (ai >= 8 ? '우수' : ai >= 5 ? '보통' : '개선 필요') : '-'}</span></td>
              <td style="font-size:12px;color:var(--text-secondary);max-width:200px;">${improvement}</td></tr>`;
      }).join('')}
        </tbody></table>
        ${cleanReport ? `<div style="margin-top:20px;padding:16px;background:rgba(15,23,42,0.5);border-radius:var(--radius-md);border:1px solid var(--border-glass);">
          <h4 style="margin-bottom:8px;">📋 AI 분석 리포트 전문</h4>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">${cleanReport}</div></div>` : ''}`;
    }
  } else if (type === 'feedback') {
    const fb = c.feedback; title.textContent = '⭐ 고객 피드백 세부 내용';
    if (!fb || !fb.rating) { body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">피드백 미입력</p>'; }
    else {
      const fbPct = Math.round(((fb.rating * 2) + fb.relevance + fb.willingness) / 30 * 100);
      body.innerHTML = `
        <h4 style="margin-bottom:16px;">📊 피드백 종합: <span style="color:var(--accent-amber)">${fbPct}점</span> / 100점</h4>
        <div class="stats-row" style="margin-bottom:20px;">
          <div class="stat-card"><div class="stat-value amber">${'★'.repeat(fb.rating)}${'☆'.repeat(5 - fb.rating)}</div><div class="stat-label">별점 (${fb.rating}/5)</div></div>
          <div class="stat-card"><div class="stat-value blue">${fb.relevance}/10</div><div class="stat-label">관련성</div></div>
          <div class="stat-card"><div class="stat-value emerald">${fb.willingness}/10</div><div class="stat-label">재수신 의향</div></div>
          <div class="stat-card"><div class="stat-value purple">${fb.count || '미입력'}</div><div class="stat-label">수집 건수</div></div>
        </div>
        ${fb.comment ? `<div style="padding:16px;background:rgba(15,23,42,0.5);border-radius:var(--radius-md);border:1px solid var(--border-glass);">
          <h4 style="margin-bottom:8px;">💬 주요 고객 의견</h4><p style="font-size:14px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">${fb.comment}</p></div>` : ''}`;
    }
  } else if (type === 'msgBody') {
    title.textContent = '✉️ 메시지 본문 및 CTA 링크';
    const ctaLinks = c.ctaLinks || [];
    body.innerHTML = `
      <h4 style="margin-bottom:12px;">📄 메시지 전문</h4>
      <div style="padding:16px;background:rgba(15,23,42,0.5);border-radius:var(--radius-md);border:1px solid var(--border-glass);margin-bottom:20px;">
        <p style="font-size:14px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">${c.msgBody || '메시지 본문 없음'}</p>
      </div>
      ${ctaLinks.length > 0 ? `
        <h4 style="margin-bottom:12px;">🔗 CTA 링크 (${ctaLinks.length}개)</h4>
        ${ctaLinks.map((link, i) => `
          <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:rgba(15,23,42,0.5);border-radius:var(--radius-md);border:1px solid var(--border-glass);margin-bottom:8px;">
            <span style="font-size:14px;color:var(--accent-purple);font-weight:700;">${['①','②','③','④'][i] || (i+1)}</span>
            <div>
              <div style="font-weight:600;color:var(--text-primary);font-size:14px;">${link.name || '(미입력)'}</div>
              <a href="${link.url}" target="_blank" style="font-size:13px;color:var(--accent-blue);word-break:break-all;">${link.url || '(미입력)'}</a>
            </div>
          </div>
        `).join('')}
      ` : '<p style="color:var(--text-muted);">CTA 링크 없음</p>'}`;
  }
  overlay.classList.add('show');
}

function closeModal(e) { if (e && e.target !== e.currentTarget) return; document.getElementById('modalOverlay').classList.remove('show'); }

async function deleteCampaign() {
  const idVal = document.getElementById('resultCampaignSelect').value;
  if (!idVal) { showToast('⚠️ 삭제할 캠페인을 먼저 선택해 주세요.'); return; }
  if (!confirm('삭제하시겠습니까?')) return;
  await deleteCampaignFromFirestore(idVal);
  clearCampaignResult();
  refreshResultSelector();
  showToast('삭제되었습니다.');
}

// ===== Overview =====
// Globals for Dashboard Overview
let ovChartInstance = null;
let overviewCurrentPage = 1;
const overviewPageSize = 10;

function refreshOverview(preservePage = false) {
  if (!preservePage) {
    overviewCurrentPage = 1;
  }

  const campaigns = loadCampaigns();
  const n = campaigns.length;

  // Update total campaign count in the card regardless of filters
  const totalCountEl = document.getElementById('ovTotalCampaignCount');
  if (totalCountEl) totalCountEl.textContent = `전체: ${n}건`;

  if (n === 0) {
    document.getElementById('ovCampaignCount').textContent = '0';
    ['ovAvgOpen', 'ovAvgConvert', 'ovAvgScore', 'ovAvgStar', 'ovAvgRelevance', 'ovAvgWilling'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    document.getElementById('ovFbCount').textContent = '0';
    document.getElementById('overviewBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">평가 없음</td></tr>';
    
    // Clear deltas
    ['ovAvgOpenDelta', 'ovAvgConvertDelta', 'ovAvgScoreDelta'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    // Clear chart
    if (ovChartInstance) {
      ovChartInstance.destroy();
      ovChartInstance = null;
    }

    // Clear insights
    document.getElementById('ovBestInsight').innerHTML = '저장된 캠페인이 없습니다.';
    document.getElementById('ovWorstInsight').innerHTML = '저장된 캠페인이 없습니다.';
    return;
  }

  // 1. Get filter inputs
  const searchInput = document.getElementById('ovSearchInput');
  const periodFilter = document.getElementById('ovPeriodFilter');
  const typeFilter = document.getElementById('ovTypeFilter');
  const groupByFilter = document.getElementById('ovGroupByFilter');

  const queryText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const period = periodFilter ? periodFilter.value : 'all';
  const type = typeFilter ? typeFilter.value : 'all';
  const groupBy = groupByFilter ? groupByFilter.value : 'campaign';

  // 2. Filter campaigns
  let filtered = campaigns.filter(c => {
    // Search filter
    if (queryText && !c.name.toLowerCase().includes(queryText)) return false;

    // Type filter
    if (type !== 'all' && c.campaignType !== type) return false;

    // Period filter
    if (period !== 'all' && c.sendDate) {
      const sendDateObj = new Date(c.sendDate);
      if (!isNaN(sendDateObj.getTime())) {
        const now = new Date();
        const diffMonths = (now.getFullYear() - sendDateObj.getFullYear()) * 12 + (now.getMonth() - sendDateObj.getMonth());
        if (period === '3m' && diffMonths > 3) return false;
        if (period === '6m' && diffMonths > 6) return false;
        if (period === '12m' && diffMonths > 12) return false;
      }
    }
    return true;
  });

  // Sort filtered campaigns by sendDate descending for table
  filtered.sort((a, b) => {
    const da = a.sendDate || '';
    const db = b.sendDate || '';
    return db.localeCompare(da); // Descending (latest first)
  });

  const m = filtered.length;
  document.getElementById('ovCampaignCount').textContent = m;

  // 3. Calculate and display core average metrics
  if (m === 0) {
    ['ovAvgOpen', 'ovAvgConvert', 'ovAvgScore', 'ovAvgStar', 'ovAvgRelevance', 'ovAvgWilling'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
    document.getElementById('ovFbCount').textContent = '0';
    document.getElementById('overviewBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">필터 조건에 맞는 결과가 없습니다.</td></tr>';
    
    // Clear deltas
    ['ovAvgOpenDelta', 'ovAvgConvertDelta', 'ovAvgScoreDelta'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '';
    });

    if (ovChartInstance) {
      ovChartInstance.destroy();
      ovChartInstance = null;
    }
    document.getElementById('ovBestInsight').innerHTML = '필터된 캠페인이 없습니다.';
    document.getElementById('ovWorstInsight').innerHTML = '필터된 캠페인이 없습니다.';
    return;
  }

  // Filtered Averages
  const filteredAvgOpen = filtered.reduce((a, c) => a + (c.openRate || 0), 0) / m;
  const filteredAvgConvert = filtered.reduce((a, c) => a + (c.convertRate || 0), 0) / m;

  const aiFiltered = filtered.filter(c => c.aiScores && Object.keys(c.aiScores).length > 0);
  const filteredAvgScore = aiFiltered.length ? (aiFiltered.reduce((a, c) => a + calculateTpi(c.aiScores), 0) / aiFiltered.length) : null;

  document.getElementById('ovAvgOpen').textContent = filteredAvgOpen.toFixed(1) + '%';
  document.getElementById('ovAvgConvert').textContent = filteredAvgConvert.toFixed(1) + '%';
  document.getElementById('ovAvgScore').textContent = filteredAvgScore !== null ? Math.round(filteredAvgScore) + '점' : '—';

  // Overall Lifetime Averages (for delta calculation)
  const totalAvgOpen = campaigns.reduce((a, c) => a + (c.openRate || 0), 0) / n;
  const totalAvgConvert = campaigns.reduce((a, c) => a + (c.convertRate || 0), 0) / n;
  const aiAll = campaigns.filter(c => c.aiScores && Object.keys(c.aiScores).length > 0);
  const totalAvgScore = aiAll.length ? (aiAll.reduce((a, c) => a + calculateTpi(c.aiScores), 0) / aiAll.length) : null;

  // Render deltas
  renderDeltaBadge('ovAvgOpenDelta', filteredAvgOpen, totalAvgOpen, '%');
  renderDeltaBadge('ovAvgConvertDelta', filteredAvgConvert, totalAvgConvert, '%');
  if (filteredAvgScore !== null && totalAvgScore !== null) {
    renderDeltaBadge('ovAvgScoreDelta', filteredAvgScore, totalAvgScore, '점');
  } else {
    const el = document.getElementById('ovAvgScoreDelta');
    if (el) el.innerHTML = '';
  }

  // Feedback stats
  const fbFiltered = filtered.filter(c => c.feedback && c.feedback.rating > 0);
  document.getElementById('ovFbCount').textContent = fbFiltered.length;
  if (fbFiltered.length) {
    document.getElementById('ovAvgStar').textContent = (fbFiltered.reduce((a, c) => a + c.feedback.rating, 0) / fbFiltered.length).toFixed(1);
    document.getElementById('ovAvgRelevance').textContent = (fbFiltered.reduce((a, c) => a + c.feedback.relevance, 0) / fbFiltered.length).toFixed(1) + '/10';
    document.getElementById('ovAvgWilling').textContent = (fbFiltered.reduce((a, c) => a + c.feedback.willingness, 0) / fbFiltered.length).toFixed(1) + '/10';
  } else {
    ['ovAvgStar', 'ovAvgRelevance', 'ovAvgWilling'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }

  // 4. Render Insights (Best vs Worst)
  updateOverviewInsights(filtered);

  // 5. Render Chart.js
  renderOverviewChart(filtered, groupBy);

  // 6. Pagination & Render Table
  renderOverviewTable(filtered);
}

function renderDeltaBadge(elementId, filteredVal, totalVal, unit) {
  const el = document.getElementById(elementId);
  if (!el) return;

  const diff = filteredVal - totalVal;
  if (Math.abs(diff) < 0.05) {
    el.innerHTML = `<span class="trend-badge flat">전체 평균 수준</span>`;
  } else if (diff > 0) {
    el.innerHTML = `<span class="trend-badge up">▲ ${diff.toFixed(1)}${unit} (평균 대비)</span>`;
  } else {
    el.innerHTML = `<span class="trend-badge down">▼ ${Math.abs(diff).toFixed(1)}${unit} (평균 대비)</span>`;
  }
}

function updateOverviewInsights(filtered) {
  const bestEl = document.getElementById('ovBestInsight');
  const worstEl = document.getElementById('ovWorstInsight');
  if (!bestEl || !worstEl) return;

  // Calculate total composite score for each campaign in the filtered list
  const scoredCampaigns = filtered.map(c => {
    const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
    const aiPct = hasAi ? calculateTpi(c.aiScores) : 0;
    const fb = c.feedback;
    const hasFb = fb && fb.rating > 0;

    let totalPct = 0;
    if (hasAi && hasFb) {
      totalPct = Math.round(aiPct * 0.7 + ((fb.rating * 2 + fb.relevance + fb.willingness) / 30 * 100) * 0.3);
    } else if (hasAi) {
      totalPct = aiPct;
    } else if (hasFb) {
      totalPct = Math.round((fb.rating * 2 + fb.relevance + fb.willingness) / 30 * 100);
    } else {
      // Fallback: estimate from open/convert rates
      totalPct = Math.round(c.openRate * 2 + c.convertRate * 10);
    }
    return { campaign: c, totalPct };
  });

  // Sort by totalPct descending
  scoredCampaigns.sort((a, b) => b.totalPct - a.totalPct);

  const best = scoredCampaigns[0];
  const worst = scoredCampaigns[scoredCampaigns.length - 1];

  if (best) {
    const typeStr = best.campaign.campaignType === 'feedback' ? '피드백/결과보고' : best.campaign.campaignType === 'benefit' ? '혜택/참여활동' : '기타';
    bestEl.innerHTML = `
      <strong>${best.campaign.name}</strong><br>
      <span style="font-size:11px;color:var(--text-secondary);">발송일: ${best.campaign.sendDate || '—'} | 유형: ${typeStr}</span><br>
      📊 성과: 오픈율 <strong>${best.campaign.openRate}%</strong>, 전환율 <strong>${best.campaign.convertRate}%</strong><br>
      ✨ 종합 성과 지수: <strong style="color:var(--accent-cyan); font-size: 14px;">${best.totalPct}점</strong>
    `;
  } else {
    bestEl.innerHTML = '데이터 없음';
  }

  if (worst && scoredCampaigns.length > 1) {
    const typeStr = worst.campaign.campaignType === 'feedback' ? '피드백/결과보고' : worst.campaign.campaignType === 'benefit' ? '혜택/참여활동' : '기타';
    worstEl.innerHTML = `
      <strong>${worst.campaign.name}</strong><br>
      <span style="font-size:11px;color:var(--text-secondary);">발송일: ${worst.campaign.sendDate || '—'} | 유형: ${typeStr}</span><br>
      📊 성과: 오픈율 <strong>${worst.campaign.openRate}%</strong>, 전환율 <strong>${worst.campaign.convertRate}%</strong><br>
      ✨ 종합 성과 지수: <strong style="color:var(--accent-rose); font-size: 14px;">${worst.totalPct}점</strong>
    `;
  } else {
    worstEl.innerHTML = '비교할 대상이 부족하거나 데이터가 없습니다.';
  }
}

function renderOverviewChart(filtered, groupBy) {
  const ctx = document.getElementById('ovChart');
  if (!ctx) return;

  // Destroy existing chart to prevent overlay issues
  if (ovChartInstance) {
    ovChartInstance.destroy();
    ovChartInstance = null;
  }

  let labels = [];
  let openRates = [];
  let convertRates = [];
  let tpiScores = [];
  let sendCounts = [];

  if (groupBy === 'month') {
    // 1. Group by month
    const monthlyData = {};
    filtered.forEach(c => {
      if (!c.sendDate) return;
      const month = c.sendDate.slice(0, 7); // YYYY-MM
      if (!monthlyData[month]) {
        monthlyData[month] = {
          sendCountSum: 0,
          openCountSum: 0,
          convertCountSum: 0,
          tpiSum: 0,
          tpiCount: 0
        };
      }
      const data = monthlyData[month];
      data.sendCountSum += (c.sendCount || 0);
      data.openCountSum += (c.openCount || 0);
      data.convertCountSum += (c.convertCount || 0);

      const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
      if (hasAi) {
        data.tpiSum += calculateTpi(c.aiScores);
        data.tpiCount++;
      }
    });

    // Sort months ascending
    const sortedMonths = Object.keys(monthlyData).sort((a, b) => a.localeCompare(b));
    labels = sortedMonths;
    sortedMonths.forEach(m => {
      const data = monthlyData[m];
      const openRate = data.sendCountSum > 0 ? (data.openCountSum / data.sendCountSum * 100) : 0;
      const convertRate = data.openCountSum > 0 ? (data.convertCountSum / data.openCountSum * 100) : 0;
      const avgTpi = data.tpiCount > 0 ? (data.tpiSum / data.tpiCount) : 0;

      openRates.push(parseFloat(openRate.toFixed(1)));
      convertRates.push(parseFloat(convertRate.toFixed(1)));
      tpiScores.push(Math.round(avgTpi));
      sendCounts.push(data.sendCountSum);
    });
  } else {
    // 2. Individual Campaigns chronologically (ascending date)
    const chrono = [...filtered].sort((a, b) => {
      const da = a.sendDate || '';
      const db = b.sendDate || '';
      return da.localeCompare(db);
    });

    // Limit to latest 15 to keep it readable, but let them know it scales
    const displayed = chrono.slice(-15);

    labels = displayed.map(c => {
      const name = c.name;
      return name.length > 8 ? name.slice(0, 8) + '..' : name;
    });

    openRates = displayed.map(c => c.openRate || 0);
    convertRates = displayed.map(c => c.convertRate || 0);
    tpiScores = displayed.map(c => {
      const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
      return hasAi ? calculateTpi(c.aiScores) : 0;
    });
    sendCounts = displayed.map(c => c.sendCount || 0);
  }

  // Render Chart.js Dual Y-axis
  ovChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: '발송수 (건)',
          data: sendCounts,
          type: 'bar',
          yAxisID: 'yVolume',
          backgroundColor: 'rgba(148, 163, 184, 0.08)',
          borderColor: 'rgba(148, 163, 184, 0.15)',
          borderWidth: 1,
          barThickness: groupBy === 'month' ? 40 : 20,
          order: 4
        },
        {
          label: '오픈율 (%)',
          data: openRates,
          type: 'line',
          yAxisID: 'yPercentage',
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: '#3b82f6',
          pointRadius: 4,
          order: 1
        },
        {
          label: '전환율 (%)',
          data: convertRates,
          type: 'line',
          yAxisID: 'yPercentage',
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 3,
          tension: 0.3,
          pointBackgroundColor: '#10b981',
          pointRadius: 4,
          order: 2
        },
        {
          label: '종합 지수 (TPI)',
          data: tpiScores,
          type: 'line',
          yAxisID: 'yPercentage',
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          tension: 0.3,
          pointBackgroundColor: '#8b5cf6',
          pointRadius: 3,
          order: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: {
              family: 'Spoqa Han Sans Neo',
              size: 11
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          titleFont: { family: 'Spoqa Han Sans Neo', size: 12, weight: 'bold' },
          bodyFont: { family: 'Spoqa Han Sans Neo', size: 11 }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            font: { family: 'Spoqa Han Sans Neo', size: 10 }
          }
        },
        yPercentage: {
          type: 'linear',
          position: 'left',
          min: 0,
          max: 100,
          grid: {
            color: 'rgba(255, 255, 255, 0.04)'
          },
          ticks: {
            color: '#3b82f6',
            callback: function(value) { return value + '%'; },
            font: { family: 'Spoqa Han Sans Neo', size: 10 }
          }
        },
        yVolume: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          ticks: {
            color: '#94a3b8',
            callback: function(value) { return value.toLocaleString() + '건'; },
            font: { family: 'Spoqa Han Sans Neo', size: 10 }
          }
        }
      }
    }
  });
}

function renderOverviewTable(filtered) {
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / overviewPageSize));

  if (overviewCurrentPage > totalPages) {
    overviewCurrentPage = totalPages;
  }
  if (overviewCurrentPage < 1) {
    overviewCurrentPage = 1;
  }

  const startIdx = (overviewCurrentPage - 1) * overviewPageSize;
  const endIdx = startIdx + overviewPageSize;
  const pageItems = filtered.slice(startIdx, endIdx);

  const prevBtn = document.getElementById('ovPrevPageBtn');
  const nextBtn = document.getElementById('ovNextPageBtn');
  const indicator = document.getElementById('ovPageIndicator');

  if (indicator) {
    indicator.textContent = `Page ${overviewCurrentPage} of ${totalPages}`;
  }

  if (prevBtn) {
    prevBtn.disabled = overviewCurrentPage === 1;
    prevBtn.style.opacity = overviewCurrentPage === 1 ? '0.5' : '1';
    prevBtn.style.cursor = overviewCurrentPage === 1 ? 'not-allowed' : 'pointer';
  }

  if (nextBtn) {
    nextBtn.disabled = overviewCurrentPage === totalPages;
    nextBtn.style.opacity = overviewCurrentPage === totalPages ? '0.5' : '1';
    nextBtn.style.cursor = overviewCurrentPage === totalPages ? 'not-allowed' : 'pointer';
  }

  const tbody = document.getElementById('overviewBody');
  if (!tbody) return;

  tbody.innerHTML = pageItems.map(c => {
    const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
    const aiPct = hasAi ? calculateTpi(c.aiScores) : null;
    const fb = c.feedback;
    const hasFb = fb && fb.rating > 0;

    let totalPct = 0;
    if (hasAi && hasFb) {
      totalPct = Math.round(aiPct * 0.7 + ((fb.rating * 2 + fb.relevance + fb.willingness) / 30 * 100) * 0.3);
    } else if (hasAi) {
      totalPct = aiPct;
    } else if (hasFb) {
      totalPct = Math.round((fb.rating * 2 + fb.relevance + fb.willingness) / 30 * 100);
    }

    const typeLabel = c.campaignType === 'feedback' ? '📋 피드백' : c.campaignType === 'benefit' ? '🎁 혜택' : c.campaignType === 'other' ? '💬 기타' : '—';

    return `<tr>
      <td><strong>${c.name}</strong></td>
      <td>${c.sendDate || '—'}</td>
      <td>${typeLabel}</td>
      <td style="color:var(--accent-blue)">${c.openRate}%</td>
      <td style="color:var(--accent-emerald)">${c.convertRate}%</td>
      <td>${hasAi ? `<span class="score-badge ${aiPct >= 75 ? 'high' : aiPct >= 50 ? 'mid' : 'low'}">${aiPct}</span>` : '—'}</td>
      <td>${hasFb ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : '—'}</td>
      <td><strong>${totalPct || '—'}</strong></td>
    </tr>`;
  }).join('');
}

function changeOverviewPage(dir) {
  overviewCurrentPage += dir;
  refreshOverview(true);
}

function exportOverviewToCsv() {
  const campaigns = loadCampaigns();
  if (campaigns.length === 0) {
    showToast('⚠️ 내보낼 캠페인 데이터가 없습니다.');
    return;
  }

  const searchInput = document.getElementById('ovSearchInput');
  const periodFilter = document.getElementById('ovPeriodFilter');
  const typeFilter = document.getElementById('ovTypeFilter');

  const queryText = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const period = periodFilter ? periodFilter.value : 'all';
  const type = typeFilter ? typeFilter.value : 'all';

  let filtered = campaigns.filter(c => {
    if (queryText && !c.name.toLowerCase().includes(queryText)) return false;
    if (type !== 'all' && c.campaignType !== type) return false;
    if (period !== 'all' && c.sendDate) {
      const sendDateObj = new Date(c.sendDate);
      if (!isNaN(sendDateObj.getTime())) {
        const now = new Date();
        const diffMonths = (now.getFullYear() - sendDateObj.getFullYear()) * 12 + (now.getMonth() - sendDateObj.getMonth());
        if (period === '3m' && diffMonths > 3) return false;
        if (period === '6m' && diffMonths > 6) return false;
        if (period === '12m' && diffMonths > 12) return false;
      }
    }
    return true;
  });

  if (filtered.length === 0) {
    showToast('⚠️ 현재 필터 조건에 부합하는 데이터가 없습니다.');
    return;
  }

  const headers = ['캠페인명', '발송일자', '발송유형', '발송수', '오픈수', '후원신청수', '오픈율(%)', '전환율(%)', 'AI평가점수', '별점'];
  const rows = filtered.map(c => {
    const typeStr = c.campaignType === 'feedback' ? '피드백/결과보고' : c.campaignType === 'benefit' ? '혜택/참여활동' : '기타';
    const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
    const aiPct = hasAi ? calculateTpi(c.aiScores) : '';
    const fbRating = c.feedback && c.feedback.rating > 0 ? c.feedback.rating : '';

    return [
      `"${c.name.replace(/"/g, '""')}"`,
      c.sendDate || '',
      typeStr,
      c.sendCount || 0,
      c.openCount || 0,
      c.convertCount || 0,
      c.openRate,
      c.convertRate,
      aiPct,
      fbRating
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `message_eval_overview_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('📥 CSV 파일이 내보내기 되었습니다.');
}

// ===== Utility =====
function startNewEval() { currentCampaignId = null; aiScores = {}; aiImprovements = {}; aiRecommendations = []; selectedCampaignCache = null; aiCompleted = false; resetAll(); switchTab('campaign'); }
function resetAll() {
  ['campaignName', 'campaignType', 'sendDate', 'sendCount', 'openCount', 'convertCount', 'aiMsgBody'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('calculatedOpenRate').value = '—';
  document.getElementById('calculatedConvertRate').value = '—';
  document.getElementById('sendTime').value = '09:00';
  feedbackRating = 0; setStars(0); document.getElementById('starLabel').textContent = '별점을 선택해 주세요';
  ['fbRelevance', 'fbWillingness'].forEach(id => { document.getElementById(id).value = 5; });
  ['fbRelVal', 'fbWillVal'].forEach(id => { document.getElementById(id).textContent = '5'; });
  ['fbCount', 'fbComment'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  removeAiImage();
  document.getElementById('aiResultSection').style.display = 'none';
  document.getElementById('aiLoadingContainer').style.display = 'none';
  // Reset filters
  const dateFilter = document.getElementById('filterCampaignDate');
  const typeFilter = document.getElementById('filterCampaignType');
  if (dateFilter) dateFilter.value = '';
  if (typeFilter) typeFilter.value = '';
  // Reset CTA links to default 1 row
  document.getElementById('ctaLinksContainer').innerHTML = '';
  addCtaLink();
  toggleFeedback(false);
}

function toggleFeedback(enabled) {
  feedbackEnabled = enabled;
  const fields = document.getElementById('feedbackFields');
  const yesBtn = document.getElementById('fbToggleYes');
  const noBtn = document.getElementById('fbToggleNo');
  if (enabled) {
    fields.style.display = 'block';
    yesBtn.style.background = 'rgba(139,92,246,0.15)'; yesBtn.style.borderColor = 'var(--accent-purple)'; yesBtn.style.color = 'var(--accent-purple)';
    noBtn.style.background = ''; noBtn.style.borderColor = ''; noBtn.style.color = '';
  } else {
    fields.style.display = 'none';
    noBtn.style.background = 'rgba(139,92,246,0.15)'; noBtn.style.borderColor = 'var(--accent-purple)'; noBtn.style.color = 'var(--accent-purple)';
    yesBtn.style.background = ''; yesBtn.style.borderColor = ''; yesBtn.style.color = '';
  }
}


function exportReport() {
  const idVal = document.getElementById('resultCampaignSelect').value; if (!idVal) { showToast('⚠️ 캠페인을 먼저 선택해 주세요.'); return; }
  const c = loadCampaigns().find(x => String(x.id) === String(idVal)); if (!c) return;
  const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0; const fb = c.feedback; const hasFb = fb && fb.rating > 0;
  const typeLabel = c.campaignType === 'feedback' ? '📋 피드백/결과보고' : c.campaignType === 'benefit' ? '🎁 혜택/참여활동' : c.campaignType === 'other' ? '💬 기타' : '—';
  
  let r = `메시지 성과 평가 리포트\n${'='.repeat(40)}\n캠페인: ${c.name}\n발송 유형: ${typeLabel}\n발송일: ${c.sendDate || '미입력'}\n발송시간: ${c.sendTime || '미입력'}\n`;
  if (c.sendCount !== undefined) {
    r += `발송수: ${c.sendCount.toLocaleString()}건 | 오픈수: ${c.openCount.toLocaleString()}건 | 후원신청수: ${c.convertCount.toLocaleString()}건\n`;
  }
  r += `오픈율: ${c.openRate}% | 전환율: ${c.convertRate}%\n`;
  
  if (hasAi) { r += `\n[AI 평가 10항목]\n${'-'.repeat(40)}\n`; aiEvalItems.forEach((it, i) => { r += `${i + 1}. ${it.title}: ${c.aiScores[it.id] || '-'}/10\n`; }); }
  if (hasFb) r += `\n[고객 피드백]\n${'-'.repeat(40)}\n별점: ${fb.rating}/5\n관련성: ${fb.relevance}/10\n재수신: ${fb.willingness}/10\n의견: ${fb.comment || '없음'}\n`;
  const blob = new Blob([r], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `eval_${c.name}_${new Date().toISOString().slice(0, 10)}.txt`; a.click(); showToast('리포트 다운로드 완료!');
}

function showToast(msg) { const t = document.getElementById('toast'); document.getElementById('toastMsg').textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }

// ===== GEMINI AI (10 Items) =====
// API Key: 사용자가 직접 입력 → localStorage에만 저장 (소스코드에 절대 포함하지 않음)
const API_KEY_STORAGE = 'gemini_api_key_v4';

function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

async function fetchGemini(model, contents, generationConfig = {}) {
  const apiKey = getApiKey();
  let url, body, headers;

  if (apiKey) {
    // 1. 로컬 API 키가 존재하는 경우: Google API로 직접 호출 (클라이언트 측)
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({ contents, generationConfig });
  } else {
    // 2. 로컬 API 키가 비어있는 경우: Vercel serverless 프록시 호출 (CORS 지원)
    const isVercelHost = window.location.hostname.includes('vercel.app');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    url = (isVercelHost || isLocalhost)
      ? '/api/gemini-proxy'
      : 'https://messageevalfin.vercel.app/api/gemini-proxy';
      
    headers = { 'Content-Type': 'application/json' };
    body = JSON.stringify({ model, contents, generationConfig });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body
    });
    return res;
  } catch (netErr) {
    throw new Error(`네트워크 연결 오류: ${netErr.message}. Vercel 서버와 통신할 수 없는 상태이거나 API 호출이 거부되었습니다.`);
  }
}

function handleAiImageUpload(event) { const file = event.target.files[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { showToast('⚠️ 10MB 이하만'); return; } aiImageMimeType = file.type; const reader = new FileReader(); reader.onload = e => { aiImageBase64 = e.target.result.split(',')[1]; document.getElementById('aiPreviewImg').src = e.target.result; document.getElementById('aiUploadPlaceholder').style.display = 'none'; document.getElementById('aiPreviewContainer').style.display = 'block'; document.getElementById('aiUploadArea').classList.add('has-image'); }; reader.readAsDataURL(file); }
function removeAiImage() {
  aiImageBase64 = null;
  aiImageMimeType = null;
  const fileInput = document.getElementById('aiFileInput');
  if (fileInput) fileInput.value = '';
  const placeholder = document.getElementById('aiUploadPlaceholder');
  if (placeholder) placeholder.style.display = 'block';
  const preview = document.getElementById('aiPreviewContainer');
  if (preview) preview.style.display = 'none';
  const uploadArea = document.getElementById('aiUploadArea');
  if (uploadArea) uploadArea.classList.remove('has-image');
}
function initDragDrop() { const area = document.getElementById('aiUploadArea'); if (!area) return; area.addEventListener('dragover', e => { e.preventDefault(); area.style.borderColor = '#8b5cf6'; }); area.addEventListener('dragleave', () => { area.style.borderColor = ''; }); area.addEventListener('drop', e => { e.preventDefault(); area.style.borderColor = ''; const f = e.dataTransfer.files[0]; if (f && f.type.startsWith('image/')) { const dt = new DataTransfer(); dt.items.add(f); document.getElementById('aiFileInput').files = dt.files; handleAiImageUpload({ target: { files: [f] } }); } }); }

// ===== CTA Links =====
const ctaCircles = ['①', '②', '③', '④'];
function getCtaCount() { return document.querySelectorAll('.cta-link-row').length; }

function updateCtaUI() {
  const count = getCtaCount();
  document.getElementById('ctaCountLabel').textContent = `${count} / 4`;
  document.getElementById('addCtaBtn').disabled = count >= 4;
  document.getElementById('addCtaBtn').style.opacity = count >= 4 ? '0.4' : '1';
  document.getElementById('removeCtaBtn').disabled = count <= 0;
  document.getElementById('removeCtaBtn').style.opacity = count <= 0 ? '0.4' : '1';
}

function addCtaLink() {
  const container = document.getElementById('ctaLinksContainer');
  const count = getCtaCount();
  if (count >= 4) return;
  const row = document.createElement('div');
  row.className = 'cta-link-row';
  row.dataset.index = count;
  row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
  row.innerHTML = `<span style="font-size:12px;color:var(--accent-purple);font-weight:700;min-width:20px;">${ctaCircles[count]}</span>
    <input class="form-input cta-btn-name" placeholder="버튼명 (예: 자세히 보기)" style="flex:1;font-size:13px;">
    <input class="form-input cta-link-url" placeholder="링크 URL (예: https://...)" style="flex:2;font-size:13px;">`;
  container.appendChild(row);
  updateCtaUI();
}

function removeCtaLink() {
  const container = document.getElementById('ctaLinksContainer');
  const rows = container.querySelectorAll('.cta-link-row');
  if (rows.length <= 0) return;
  container.removeChild(rows[rows.length - 1]);
  updateCtaUI();
}

function getCtaLinks() {
  const links = [];
  document.querySelectorAll('.cta-link-row').forEach(row => {
    const name = row.querySelector('.cta-btn-name').value.trim();
    const url = row.querySelector('.cta-link-url').value.trim();
    if (name || url) links.push({ name: name || '(미입력)', url: url || '(미입력)' });
  });
  return links;
}

function setCtaLinks(links) {
  const container = document.getElementById('ctaLinksContainer');
  container.innerHTML = '';
  if (!links || links.length === 0) {
    addCtaLink();
    return;
  }
  links.forEach((link, i) => {
    const row = document.createElement('div');
    row.className = 'cta-link-row';
    row.dataset.index = i;
    row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';
    row.innerHTML = `<span style="font-size:12px;color:var(--accent-purple);font-weight:700;min-width:20px;">${ctaCircles[i]}</span>
      <input class="form-input cta-btn-name" value="${link.name || ''}" placeholder="버튼명" style="flex:1;font-size:13px;">
      <input class="form-input cta-link-url" value="${link.url || ''}" placeholder="링크 URL" style="flex:2;font-size:13px;">`;
    container.appendChild(row);
  });
  updateCtaUI();
}

function calculateMsgStats(body) {
  if (!body) return { charCount: 0, charCountNoSpaces: 0, lineCount: 0, emojiCount: 0, emojiList: [], personalizationCount: 0, personalizationList: [], urlCount: 0 };
  const charCount = body.length;
  const charCountNoSpaces = body.replace(/\s/g, '').length;
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/gu;
  const emojiMatches = body.match(emojiRegex) || [];
  const emojiList = [...new Set(emojiMatches)];
  const personalizationRegex = /\[.*?\]|\{.*?\}|#{.*?}|\$\{.*?\}|%%.*?%%|@.*?@|고객명|회원님|○○|OO|님의/g;
  const personalizationMatches = body.match(personalizationRegex) || [];
  const lineCount = body.split('\n').filter(l => l.trim()).length;
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  const urlsInBody = body.match(urlRegex) || [];
  return {
    charCount, charCountNoSpaces, lineCount,
    emojiCount: emojiMatches.length, emojiList,
    personalizationCount: personalizationMatches.length,
    personalizationList: personalizationMatches,
    urlCount: urlsInBody.length
  };
}

function getDayOfWeek(dateStr) {
  if (!dateStr) return '';
  const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? '' : days[d.getDay()];
}

function findMostSimilarCampaign(currentCampaign, pastCampaigns) {
  if (pastCampaigns.length === 0) return null;
  let bestSimilar = null;
  let bestScore = -1;
  const currentDays = getDayOfWeek(currentCampaign.sendDate);
  const currentChars = currentCampaign.msgStats ? currentCampaign.msgStats.charCount : 0;
  
  pastCampaigns.forEach(c => {
    let score = 0;
    // 요일 동일성
    if (getDayOfWeek(c.sendDate) === currentDays) score += 3;
    // 글자 수 인접성
    const cChars = c.msgStats ? c.msgStats.charCount : 0;
    const charDiff = Math.abs(cChars - currentChars);
    if (charDiff < 50) score += 3;
    else if (charDiff < 150) score += 2;
    else if (charDiff < 300) score += 1;
    
    // 시간대 일치성 (시 단위)
    const currentHour = currentCampaign.sendTime ? currentCampaign.sendTime.split(':')[0] : '';
    const cHour = c.sendTime ? c.sendTime.split(':')[0] : '';
    if (currentHour && currentHour === cHour) score += 2;
    
    if (score > bestScore) {
      bestScore = score;
      bestSimilar = c;
    }
  });
  return bestSimilar || pastCampaigns[pastCampaigns.length - 1];
}

function buildAiPrompt() {
  const body = document.getElementById('aiMsgBody').value.trim();
  const sendDate = document.getElementById('sendDate').value;
  const sendTime = document.getElementById('sendTime').value;
  const sendRecipients = '';
  
  const sendCountVal = document.getElementById('sendCount').value;
  const openCountVal = document.getElementById('openCount').value;
  const convertCountVal = document.getElementById('convertCount').value;
  
  const sendCount = parseFloat(sendCountVal) || 0;
  const openCount = parseFloat(openCountVal) || 0;
  const convertCount = parseFloat(convertCountVal) || 0;
  
  const openRate = sendCount > 0 ? ((openCount / sendCount) * 100).toFixed(1) : 0;
  const convertRate = openCount > 0 ? ((convertCount / openCount) * 100).toFixed(1) : 0;
  const campaignType = document.getElementById('campaignType').value;
  const segment = '';
  const campaignName = document.getElementById('campaignName').value.trim();

  // Collect feedback info
  const fbRating = feedbackEnabled ? feedbackRating : 0;
  const fbRelevance = document.getElementById('fbRelevance').value;
  const fbWillingness = document.getElementById('fbWillingness').value;
  const fbComment = document.getElementById('fbComment').value.trim();

  // 1. 이번 캠페인 통계 자동 계산
  const stats = calculateMsgStats(body);
  const ctaLinks = getCtaLinks();
  const currentWeekday = getDayOfWeek(sendDate);

  const currentCampaignData = {
    name: campaignName || '미지정',
    campaignType,
    sendDate,
    sendTime,
    openRate: parseFloat(openRate) || 0,
    convertRate: parseFloat(convertRate) || 0,
    msgStats: stats,
    ctaLinks
  };

  const urgencyPrompt = campaignType === 'feedback'
    ? `- '피드백/결과보고' 유형의 메시지이므로, 마케팅 호객용의 무리한 긴급성(마감 시간)을 강요하지 않습니다. 대신 **'후원자 감동/감사 및 정서적 보람 표현의 깊이, 변화 수혜 결과 보고의 충실함'**을 기준으로 점수를 측정하고 피드백을 주십시오.`
    : `- 즉각적인 상세보기 행동 촉구력 평가. 시간적 마감선이나 긴박감이 전혀 없어 "나중에 봐야지" 하고 지나치게 방치되는 정적인 문구인 경우 **3~5점** 감점. "오늘 밤 12시 마감", "🚨 현재 대기 중인 아동을 위한 긴급 소식" 등 시간/대상 한정성 및 즉시성 명분이 유려하게 가미된 경우 **8~10점**.`;

  const timingPrompt = `### 05. 요일/시간 타이밍 매칭 (timing_optimization)
- 메시지 성격과 라이프사이클 궁합 평가.
- **중요 Fallback 룰**: 이번 캠페인 정보에 발송일시나 발송요일이 미입력되었거나 누락된 상태인 경우, AI는 절대로 임의 감점을 하지 말고 **기본 6점**을 부여한 뒤, 권장 발송 요일/시간대에 대해 설명해 주십시오.
- 감성/기부 후기: 주중 밤이나 여유로운 목/금 저녁 발송 시 **9~10점**, 바쁜 월/화 아침 발송 시 **3~5점** 감점.
- 혜택/참여 안내: 주중 화~목 오전 10-11시 또는 오후 14-16시 발송 시 **9~10점**, 심야(22시 이후) 발송 시 **1~2점** 패널티.`;

  const personalizationPrompt = `### 03. 개인화 정밀성 & 밀도 (personalization_density)
- 동적 치환 변수의 자연스러운 결합도 평가.
- 개인화 요소가 전무하거나 기계적 타이틀에만 구색용으로 쓰인 경우 **1~4점** 감점.
- 메시지 첫 머리(호칭)와 본문 핵심 맥락 내에 최소 2개 이상의 고객 변수("OOO 후원자님", "[후원일자]", 또는 "OO", "OOO" 같은 마스킹 형태의 이름 치환 변수 표기)가 유기적으로 녹아들어 진심 어린 손편지 느낌을 주면 **8~10점**.`;

  // 2. 과거 캠페인 데이터 분석 및 대조군 매칭
  const pastCampaigns = loadCampaigns().filter(c => c.aiScores && Object.keys(c.aiScores).length > 0);
  let historySection = '';
  
  if (pastCampaigns.length > 0) {
    const recent = pastCampaigns.slice(-10); // 최근 최대 10건
    const avgOpen = (recent.reduce((a, c) => a + (c.openRate || 0), 0) / recent.length).toFixed(1);
    const avgConvert = (recent.reduce((a, c) => a + (c.convertRate || 0), 0) / recent.length).toFixed(1);
    
    // 과거 최고 오픈율 캠페인
    const sortedByOpen = [...recent].sort((a, b) => (b.openRate || 0) - (a.openRate || 0));
    const best = sortedByOpen[0];
    
    // 가장 조건이 유사한 캠페인 매칭
    const similar = findMostSimilarCampaign(currentCampaignData, recent);

    historySection = `\n## 📊 과거 발송 캠페인 이력 & 1:1 다차원 피처 대조 데이터
**반드시 아래 대조군 데이터를 분석하여 이번 캠페인과의 "요일, 시간, 자수, 이모지 수, CTA 수, 실제 성과" 격차의 원인을 설명하세요.**

- **[과거 최근 10건 성과 평균]**
  - 평균 오픈율: ${avgOpen}% | 평균 전환율: ${avgConvert}%

- **[대조군 A: 과거 최고 성과 캠페인]**
  - 캠페인명: "${best.name}" (실제 오픈율: ${best.openRate}%, 전환율: ${best.convertRate}%)
  - 발송 조건: ${best.sendDate ? getDayOfWeek(best.sendDate) : '미지정'} ${best.sendTime || ''} 발송
  - 메시지 피처: 글자 수 ${best.msgStats ? best.msgStats.charCount : 0}자 | 이모지 ${best.msgStats ? best.msgStats.emojiCount : 0}개 | CTA 버튼 ${best.ctaLinks ? best.ctaLinks.length : 0}개
  - 메시지 본문 요약: ${(best.msgBody || '').slice(0, 50)}${(best.msgBody || '').length > 50 ? '...' : ''}

- **[대조군 B: 조건이 가장 유사한 캠페인]**
  - 캠페인명: "${similar.name}" (실제 오픈율: ${similar.openRate}%, 전환율: ${similar.convertRate}%)
  - 발송 조건: ${similar.sendDate ? getDayOfWeek(similar.sendDate) : '미지정'} ${similar.sendTime || ''} 발송
  - 메시지 피처: 글자 수 ${similar.msgStats ? similar.msgStats.charCount : 0}자 | 이모지 ${similar.msgStats ? similar.msgStats.emojiCount : 0}개 | CTA 버튼 ${similar.ctaLinks ? similar.ctaLinks.length : 0}개
  - 메시지 본문 요약: ${(similar.msgBody || '').slice(0, 50)}${(similar.msgBody || '').length > 50 ? '...' : ''}

**과거 대조군과의 인과관계 비교 피드백 가이드:**
1. **요일/시간 격차**: 이번 발송 요일(${currentWeekday || '미지정'}) 및 시간대(${sendTime || '미지정'})와 대조군의 발송 조건을 비교하여 오픈율 성과 차이에 미쳤을 행동심리학적 영향을 분석하세요.
2. **구조적 피처 격차**: 이번 메시지의 글자 수(${stats.charCount}자), 이모지 수(${stats.emojiCount}개), CTA 개수(${ctaLinks.length}개)와 과거 우수작의 피처 차이를 비교하여 가치가 사전 노출되었는지, 인지 피로가 심했는지 요인을 직접 짚어내세요.
`;
  }

  let p = `# 역할 및 분석 원칙

당신은 10년 이상 경력의 CRM 마케팅 메시지 전문 전략 컨설턴트입니다. 
당신은 아동복지전문기관 초록우산의 알림톡과 메시지 성과를 극대화하는 임무를 맡고 있습니다.

## ⚠️ 핵심 분석 원칙 (반드시 엄격 준수)
1. **절대 일반론 금지**: "제목을 후킹하게 쓰세요", "이모지를 적당히 활용하세요" 같은 교과서적인 조언은 금지합니다. 반드시 **이 메시지의 실제 문구를 직접 인용**하여 첨삭하세요.
2. **원문 인용 필수**: 각 여정 단계 평가 시 메시지 본문에서 관련된 실제 표현을 따옴표("...")로 인용하고 강점과 약점을 꼬집어내세요.
3. **구체적 대안 제시**: 개선 권장 시 "~로 고치면 좋습니다"가 아닌, **실제 즉시 교체하여 발송 가능한 완성도 높은 대안 메시지 문구를 직접 작성**해 주어야 합니다.
4. **고객 여정(User Journey) 중심**: 10가지 지표는 오픈/전환의 딱딱한 경계를 넘어 고객이 메시지를 수신하여 클릭하는 행동 흐름에 자연스럽게 녹아드는 단일한 여정 체계입니다.
${pastCampaigns.length > 0 ? '5. **과거 피처 1:1 대조**: 아래에 나열된 과거 최고 성과/유사 조건 대조군 캠페인과 이번 캠페인의 피처 격차를 과학적으로 대조 설명하세요.\n' : ''}

## 📋 이번 캠페인 정보
`;

  const campaignTypeLabel = campaignType === 'feedback' ? '📋 피드백/결과보고' : campaignType === 'benefit' ? '🎁 혜택/참여활동' : campaignType === 'other' ? '💬 기타' : '미지정';
  if (campaignName) p += `- 캠페인명: ${campaignName}\n`;
  if (campaignType) p += `- 발송 유형: ${campaignTypeLabel}\n`;
  if (sendDate) p += `- 발송 요일: ${currentWeekday} (${sendDate})\n`;
  if (sendTime) p += `- 발송 시간: ${sendTime}\n`;
  if (sendCountVal) p += `- 발송수: ${parseFloat(sendCountVal).toLocaleString()}건\n`;
  if (openCountVal) p += `- 오픈수: ${parseFloat(openCountVal).toLocaleString()}건\n`;
  if (convertCountVal) p += `- 후원신청수: ${parseFloat(convertCountVal).toLocaleString()}건\n`;
  if (openRate) p += `- 실제 오픈율: ${openRate}%\n`;
  if (convertRate) p += `- 실제 전환율: ${convertRate}%\n`;

  // Feedback
  if (fbRating > 0) {
    p += `\n## ⭐ 고객 피드백 데이터\n`;
    p += `- 고객 별점: ${fbRating}/5\n`;
    p += `- 콘텐츠 관련성: ${fbRelevance}/10\n`;
    p += `- 재수신 의향: ${fbWillingness}/10\n`;
    if (fbComment) p += `- 고객 의견: ${fbComment}\n`;
  }

  // Historical data
  p += historySection;

  // Message content
  p += `\n## ✉️ 분석 대상 메시지 본문\n`;
  p += `\`\`\`\n${body}\n\`\`\`\n`;
  if (aiImageBase64) p += `\n(첨부된 카드뉴스/이미지도 마케팅 맥락에 맞게 함께 평가해 주세요)\n`;

  // CTA Links
  if (ctaLinks.length > 0) {
    p += `\n## 🔗 CTA 버튼/링크 정보 (${ctaLinks.length}개)\n`;
    ctaLinks.forEach((link, i) => {
      p += `${i + 1}. 버튼명: "${link.name}" → 연결 URL: ${link.url}\n`;
    });
  } else {
    p += `\n**참고:** 입력된 CTA 버튼이 없습니다. 본문 내에 삽입된 행동 촉구 문구가 있는지 분석하세요.\n`;
  }

  // 📐 메시지 정량 분석 (자동 계산)
  p += `\n## 📐 메시지 정량 분석 데이터
- 총 글자 수: ${stats.charCount}자 (공백 제외 ${stats.charCountNoSpaces}자)
- 줄 수: ${stats.lineCount}줄
- 이모지 사용 수: ${stats.emojiCount}개 (사용됨: ${stats.emojiList.length > 0 ? stats.emojiList.join(' ') : '없음'})
- 개인화 변수 수: ${stats.personalizationCount}개 (탐지됨: ${stats.personalizationMatches && stats.personalizationMatches.length > 0 ? stats.personalizationMatches.join(', ') : '없음'})
- 본문 내 URL 수: ${stats.urlCount}개
- CTA 버튼 수: ${ctaLinks.length}개

### 📐 정량 피처 요약 분석
| 평가지표 | 이번 메시지 수치 | 마케팅 성과 영향 요약 |
|---|---|---|
| 📝 총 글자 수 | ${stats.charCount}자 | (분량 적정성 분석) |
| 😄 이모지 개수 | ${stats.emojiCount}개 | (비주얼 밀도 분석) |
| 🧩 개인화 변수 | ${stats.personalizationCount}개 | (개인 맞춤 수준 분석) |
| 🎯 CTA 버튼 수 | ${ctaLinks.length}개 | (주의 산만 유무 판정) |
`;

  // Analysis framework
  p += `
## 🔬 10대 고객 여정 평가 항목별 채점 규칙

각 항목에 대해 아래 기준에 따라 **이 메시지에 특화**하여 1점~10점 척도로 정밀 채점하세요.

### 01. 첫 줄 및 프리뷰 후킹력 (first_line_attraction)
- 프리뷰 영역(첫 30자 이내) 평가.
- 안녕하세요 OOO입니다 같은 상투적이고 뻔한 인사말로 서두를 낭비하면 **3~5점 이하** 엄격 감점.
- 첫 문장에 마음을 끄는 질문형("올봄, 한 아이의 세상을 바꾼 편지 한 장을 받아보시겠어요?")이나 구체적인 수치 제시형("지난달 모인 12,000개의 마음이 만든 기적") 배치 시 **8~10점** 가점.

### 02. 비주얼 후킹 및 이모지 조화 (visual_emoji_harmony)
- 이모지 비율의 황금 조화 평가.
- 이모지가 8개 이상 무질서하게 도배되어 스팸 느낌을 주면 **3~4점** 감점.
- 텍스트로만 가득해 시각적 쉼표가 전혀 없는 무미건조한 줄글 상태이면 **4~5점** 감점.
- 텍스트 100자당 1~2개 비율로, 첫 머리와 문단 핵심 앵커 포인트에 이모지가 우아하게 배치된 경우 **9~10점**.


${personalizationPrompt}

### 04. 오프닝 맥락 간결성 (opening_conciseness)
- 본론 직행 속도 평가.
- "날씨가 많이 추워졌네요..." 등의 상투적인 계절 안부나 장황한 서두로 본론 진입을 3줄 이상 지연시키면 **3~5점** 감점.
- 첫 1~2문장 내에 메시지 발송 목적과 가치 요약("후원자님의 기부금이 아동에게 전달되어 나타난 변화를 보고해 드립니다")을 두괄식으로 간결하게 타격한 경우 **8~10점**.

${timingPrompt}

### 06. 긴급성 및 즉각적 유도 (urgency_trigger)
${urgencyPrompt}


### 07. 인지 명확성 및 가독 구조 (cognitive_readability)
- 정보 인지 속도와 줄바꿈/가독 배치 평가.
- 한눈에 이해하기 쉬운 쉬운 어휘와 짧은 단문 위주로 작성되어 있으며, 텍스트 가독성 배치가 우수하면 **8~10점**.
- 만연체 문장으로 너무 길게 늘어지거나 단락 구분 없이 뭉쳐 있어서 한눈에 파악하기 어렵고 전문 용어를 오용할 때 **3~5점** 감점.

### 08. 혜택 가치 사전 노출도 (value_pre_exposure)
- 클릭 유도를 위한 보상 선제 노출도 평가.
- "자세한 내용은 아래 링크에서 보세요"라며 가치를 숨긴 채 클릭만 낚시성으로 유도하면 **2~4점** 감점.
- 링크 클릭 전에 알림톡 본문 자체에서 후원자로서 얻는 자부심, 감동, 감사 편지 일부, 성과 요약 등을 매력적인 가치 단어로 선행 노출한 경우 **8~10점**.

### 09. 문장 완결성 및 카피라이팅 퀄리티 (copywriting_quality)
- 스토리 유기성 및 문장 구조의 올바름 평가.
- 메시지의 논리적 연동이 자연스럽고 후원 아동의 이야기와 팩트 전달의 균형이 뛰어나며 비문/오탈자가 없을 때 **8~10점**.
- 주술 호응이 안 맞아 비문이 발견되거나, 앞뒤 맥락이 급격히 튀고 지나치게 어색한 기계적 어투가 사용되어 신뢰감을 떨어뜨릴 때 **3~5점** 감점.

### 10. CTA 액션 문구 직관성 (cta_actionability)
- 행동 지향적 버튼 텍스트의 직관성 평가.
- 가장 흔하고 심심한 버튼명("자세히 보기", "확인", "바로가기") 사용 시 **4~6점**에 머무름.
- 클릭 후 보람과 구체적 행동이 우아하게 결합된 문구("💌 아이의 감사 편지 읽어보기", "🌻 나의 후원 성과 확인") 사용 시 **9~10점** 가점.

---

## 📄 출력 규격 (반드시 아래 구조만 엄격하게 생성해 주세요)

**첫 번째 JSON 블록** - 10개 항목의 정밀 채점 점수 (1~10점 사이의 정수):
\`\`\`json
{"first_line_attraction":7,"visual_emoji_harmony":6,"personalization_density":8,"opening_conciseness":5,"timing_optimization":6,"urgency_trigger":7,"cognitive_readability":10,"value_pre_exposure":8,"copywriting_quality":7,"cta_actionability":5}
\`\`\`

**두 번째 JSON 블록** - 각 지표별 **평가 근거와 메시지 원문 인용 첨삭이 포함된 구체적 개선안**을 아래와 같은 중첩 JSON 구조로 반드시 생성해 주세요:
\`\`\`json
{
  "first_line_attraction": {
    "reason": "평가 근거 및 원문 인용 첨삭 내용",
    "improvement": "즉시 복사/발송 가능한 완성도 높은 개선 문구"
  },
  "visual_emoji_harmony": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "personalization_density": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "opening_conciseness": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "timing_optimization": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "urgency_trigger": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "cognitive_readability": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "value_pre_exposure": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "copywriting_quality": {
    "reason": "평가 근거",
    "improvement": "개선안"
  },
  "cta_actionability": {
    "reason": "평가 근거",
    "improvement": "개선안"
  }
}
\`\`\`

## 📝 상세 분석 리포트 (JSON 블록 이후 작성)
**※ 모든 분석문은 빽빽한 줄글 형태의 긴 서술을 철저히 배제하고, 핵심만 바로 파악할 수 있도록 볼드와 기호(🎯, 🔎, 📌, 🌟)로 구획을 나누어 도식화하여 가독성을 극대화해 출력해 주세요.**

### 📈 평가 지표와 성과(오픈율·전환율) 간의 상관관계 분석
- **오픈 요인 상관관계 (1~8단계)**
  - 🎯 **[핵심 결론]**: (오픈율과 1~8단계 지표 간의 가장 핵심적인 인과 관계 결론 1문장)
  - 🔎 **[세부 분석]**: (첫 줄 후킹력, 비주얼 조화, 타이밍 등 1~8단계 중 오픈율에 결정적인 영향을 미친 지표의 구체적 이유를 2문장 내외로 명확히 분석)
- **전환 요인 상관관계 (9~10단계)**
  - 🎯 **[핵심 결론]**: (전환율과 9~10단계 지표 간의 가장 핵심적인 인과 관계 결론 1문장)
  - 🔎 **[세부 분석]**: (가독 구조, 문장 완결성, CTA 버튼 문구 직관성 등이 클릭 장벽을 해소하고 전환을 이끌어낸 인과적 영향을 2문장 내외로 명확히 분석)
- **대조군 비교 상관 추이**
  - 🎯 **[핵심 결론]**: (과거 우수 대조군 대비 이번 캠페인의 종합 성과 변화 요약 1문장)
  - 🔎 **[세부 분석]**: (대조군들 대비 지표 점수의 상승/하락이 실제(또는 예상) 오픈율/전환율 변동과 어떻게 연동되는지 2문장 내외로 명확히 비교 분석)

### 🔍 1:1 다차원 성과 인과관계 분석 (Causal Ablation Analysis)
${openRate || convertRate ? `
- 🌟 **[분석 대상 대조군]**: 과거 대조군 A 및 대조군 B (과거 최고 성과 및 유사 성격 캠페인)
- 📌 **오픈율 성과 차이 요인**
  - **요일/시간 격차**: (요일/시간 조건 차이가 발송 대상의 수신 심리에 미친 영향을 핵심 요약형 2문장으로 비교)
  - **수신 피처 격차**: (글자 수, 이모지 수 등 외형 피처 차이에 따른 수신 피로도 및 오픈 유도 인과관계를 2문장으로 기술)
- 📌 **전환율 성과 차이 요인**
  - **CTA/메시지 피처 격차**: (CTA 구성 및 여정 9~10단계 지표 완성도 차이가 클릭 전환에 미친 상세 원인을 2문장으로 비교)
` : `
- 🌟 **[분석 대상 대조군]**: 과거 대조군 A 및 대조군 B (과거 최고 성과 및 유사 성격 캠페인)
- 📌 **예상 성과 시뮬레이션**
  - **예상 오픈율 범위**: **XX% ~ XX%** (그 근거를 대조군 발송 환경 및 여정 1~8단계 점수 비교를 기반으로 2문장 기술)
  - **예상 전환율 범위**: **XX% ~ XX%** (그 근거를 대조군 CTA 및 여정 9~10단계 점수 비교를 기반으로 2문장 기술)
`}
`;
  return p;
}

function parseJsonRobustly(content) {
  if (!content) return null;
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    console.warn('Standard JSON.parse failed, attempting repair...', e);
  }

  // Fallback 1: Truncation Repair (close unclosed quotes, braces, brackets)
  let repaired = trimmed;
  
  // Count non-escaped double quotes
  let quoteCount = 0;
  for (let i = 0; i < repaired.length; i++) {
    if (repaired[i] === '"' && (i === 0 || repaired[i-1] !== '\\')) {
      quoteCount++;
    }
  }
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  // Count braces & brackets
  let openBraces = (repaired.match(/\{/g) || []).length;
  let closeBraces = (repaired.match(/\}/g) || []).length;
  let openBrackets = (repaired.match(/\[/g) || []).length;
  let closeBrackets = (repaired.match(/\]/g) || []).length;

  while (openBraces > closeBraces) {
    repaired += '}';
    closeBraces++;
  }
  while (openBrackets > closeBrackets) {
    repaired += ']';
    closeBrackets++;
  }

  try {
    return JSON.parse(repaired);
  } catch (e) {
    console.warn('Repaired JSON.parse failed, trying regex extractor...', e);
  }

  // Fallback 2: Regex-based Key-Value Extractor for Objects
  const data = {};
  const stringMatches = [...repaired.matchAll(/"([^"]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g)];
  stringMatches.forEach(m => {
    data[m[1]] = m[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
  });

  const numMatches = [...repaired.matchAll(/"([^"]+)"\s*:\s*(\d+)/g)];
  numMatches.forEach(m => {
    data[m[1]] = parseInt(m[2]);
  });

  if (Object.keys(data).length > 0) {
    return data;
  }

  // Fallback 3: Regex-based Array item extractor (for Recommendations)
  const arrayMatches = [...repaired.matchAll(/"([^"]+)"/g)];
  if (arrayMatches.length > 0 && (trimmed.startsWith('[') || trimmed.includes(','))) {
    return arrayMatches.map(m => m[1]);
  }

  throw new Error('All JSON parsing fallbacks failed');
}

function extractJsonBlocks(str) {
  const sanitized = str.split('\n').map(line => line.replace(/^\s*>\s*/, '')).join('\n');
  const blocks = [];
  
  // 1. Try matching with markdown code blocks (even unclosed ones at the end)
  const mdMatches = [...sanitized.matchAll(/```json\s*\n?([\s\S]*?)(?:\n?\s*```|$)/g)];
  mdMatches.forEach(m => {
    const content = m[1].trim();
    if (content) blocks.push(content);
  });
  
  // 2. If no markdown blocks found, fallback to curly/square bracket boundaries
  if (blocks.length === 0) {
    const braceMatches = [...sanitized.matchAll(/(\{[\s\S]*?\})/g)];
    braceMatches.forEach(m => blocks.push(m[1].trim()));
    
    const bracketMatches = [...sanitized.matchAll(/(\[[\s\S]*?\])/g)];
    bracketMatches.forEach(m => blocks.push(m[1].trim()));
  }
  
  return blocks;
}

function parseDetailedJourneyReport(text) {
  if (!text) return null;
  const headerKeyword = '10단계 고객 행동 여정 상세 리포트';
  const journeyHeaderIndex = text.indexOf(headerKeyword);
  if (journeyHeaderIndex === -1) return null;
  
  const afterHeader = text.slice(journeyHeaderIndex);
  const nextHeadingMatch = afterHeader.slice(50).match(/\n###?\s+|\n##\s+/);
  const journeyBlock = nextHeadingMatch ? afterHeader.slice(0, nextHeadingMatch.index + 50) : afterHeader;
  
  const steps = [];
  for (let i = 1; i <= 10; i++) {
    const currentRegex = new RegExp(`(?:^|\\n)${i}\\.\\s+\\*\\*(.+?)\\*\\*(?:\\s*:\\s*|\\s+)?(\\d+점/10|\\d+/10|\\d+점|\\d+)?\\s*\\n?([\\s\\S]*?)(?=\\n(?:${i+1})\\.\\s+|\\n###?\\s+|\\n##\\s+|$)`);
    const match = journeyBlock.match(currentRegex);
    if (match) {
      steps.push({
        num: i,
        title: match[1].trim(),
        scoreText: match[2] ? match[2].trim() : '',
        content: match[3].trim()
      });
    }
  }
  return steps;
}

function formatDetailedCardContent(text) {
  if (!text) return '';
  let formatted = text;
  
  // Escape HTML entities
  formatted = formatted.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Bold: **text** -> <strong>text</strong>
  formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  
  // Italic: *text* -> <em>text</em>
  formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
  
  // Quotes: "text" -> <span style="color:var(--accent-blue);font-weight:600;">"text"</span>
  formatted = formatted.replace(/"([^"]{2,150})"/g, '<span style="color:var(--accent-blue);font-weight:600;">"$1"</span>');
  
  // Inline Code: `code` -> <code style="...">code</code>
  formatted = formatted.replace(/`(.+?)`/g, '<code style="background:rgba(139,92,246,0.12);padding:2px 6px;border-radius:4px;font-family:monospace;font-size:11px;color:var(--accent-purple);border:1px solid rgba(139,92,246,0.15);">$1</code>');
  
  // Convert list items and paragraphs
  formatted = formatted.split('\n').map(line => {
    let trimmed = line.trim();
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      return `<div style="margin-left:8px;text-indent:-8px;line-height:1.5;margin-bottom:4px;color:var(--text-secondary);">• ${trimmed.slice(1).trim()}</div>`;
    }
    return trimmed ? `<div style="margin-bottom:6px;line-height:1.5;">${trimmed}</div>` : '';
  }).join('');

  return formatted;
}

async function runAiEvaluation() {
  aiRecommendations = [];
  const msgBody = document.getElementById('aiMsgBody').value.trim();
  if (!msgBody) { showToast('⚠️ 메시지 본문 필요'); return; }
  const btn = document.getElementById('aiRunBtn'); btn.disabled = true; btn.textContent = '⏳ 분석 중...';
  document.getElementById('aiLoadingContainer').style.display = 'block';
  document.getElementById('aiLoadingText').textContent = 'AI가 메시지를 분석하고 있습니다...';
  const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];
  try {
    const parts = [{ text: buildAiPrompt() }]; if (aiImageBase64) parts.push({ inline_data: { mime_type: aiImageMimeType, data: aiImageBase64 } });
    let text = null, usedModel = '';
    let lastError = null;
    for (const model of models) {
      try {
        document.getElementById('aiLoadingText').textContent = `${model} 모델로 분석 중...`;
        const res = await fetchGemini(model, [{ parts }], {
          temperature: 0.7,
          maxOutputTokens: 8192,
          thinkingConfig: {
            thinkingBudget: 0
          }
        });
        if (res.ok) { 
          const data = await res.json(); 
          text = data.candidates?.[0]?.content?.parts?.[0]?.text; 
          if (text) { usedModel = model; break; } 
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`${model} failed:`, errData.error || res.status);
          const errMsg = errData.error?.message || errData.error || `API 오류 (${res.status})`;
          if (res.status === 401 || res.status === 403) { 
            throw new Error('API 키가 유효하지 않습니다. 올바른 Gemini API 키를 입력해 주세요.'); 
          }
          if (res.status === 404) {
            throw new Error('서버 프록시 경로(/api/gemini-proxy)를 찾을 수 없습니다. 로컬 단독 테스트 시에는 API 키를 직접 입력해 주세요.');
          }
          if (res.status === 500 && errMsg.includes('GEMINI_API_KEY')) {
            throw new Error('서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. API 키를 직접 입력해 주세요.');
          }
          throw new Error(errMsg);
        }
      } catch (modelErr) {
        lastError = modelErr;
        if (modelErr.message && (
          modelErr.message.includes('API 키') || 
          modelErr.message.includes('401') || 
          modelErr.message.includes('403') ||
          modelErr.message.includes('환경변수') ||
          modelErr.message.includes('로컬 파일') ||
          modelErr.message.includes('프록시 경로')
        )) {
          throw modelErr;
        }
        console.warn(`${model} 실패, 다음 모델 시도... 요인:`, modelErr.message);
      }
    }
    if (!text) {
      throw new Error(`AI 분석 호출에 실패했습니다. (마지막 오류: ${lastError ? lastError.message : '알 수 없음'})`);
    }
    text = text.split('\n').map(line => line.replace(/^\s*>\s*/, '')).join('\n');
    const jsonBlocks = extractJsonBlocks(text);
    if (jsonBlocks.length >= 1) { 
      try { 
        const parsed = parseJsonRobustly(jsonBlocks[0]); 
        if (parsed) {
          aiScores = {}; 
          aiEvalItems.forEach(item => { 
            aiScores[item.id] = Math.max(1, Math.min(10, parseInt(parsed[item.id]) || 5)); 
          }); 
          renderAiScoreGrid(); 
          document.getElementById('aiScoreSummary').style.display = 'block'; 
        }
      } catch (e) { 
        console.warn('score parse fail', e); 
      } 
    }
    if (jsonBlocks.length >= 2) { 
      try { 
        const parsedImps = parseJsonRobustly(jsonBlocks[1]); 
        if (parsedImps) {
          aiImprovements = {}; 
          aiEvalItems.forEach(item => { 
            const val = parsedImps[item.id];
            if (val) {
              if (typeof val === 'object' && val !== null) {
                // 중첩 JSON 구조인 경우 조립
                aiImprovements[item.id] = `**[평가 근거]** ${val.reason || ''}\n\n**[개선 카피]** ${val.improvement || ''}`;
              } else {
                // 기존 단층 문자열 구조인 경우 호환성 보존
                aiImprovements[item.id] = String(val);
              }
            }
          }); 
        }
      } catch (e) { 
        console.warn('improvements parse fail', e); 
      } 
    }
    document.getElementById('aiLoadingContainer').style.display = 'none';
    lastUsedModel = usedModel;
    document.getElementById('aiResultTime').textContent = new Date().toLocaleString('ko-KR') + ' · ' + usedModel;
    const reportHtml = renderAiReportContent(text);
    document.getElementById('aiResultContent').innerHTML = reportHtml;
    // Auto-save after AI evaluation
    await saveCampaignData();
    aiCompleted = true;
    showToast('🤖 AI 평가 완료 및 자동 저장되었습니다.');
    switchTab('results');
    if (currentCampaignId) {
      document.getElementById('resultCampaignSelect').value = currentCampaignId;
      loadCampaignResult();
    }
  } catch (error) {
    document.getElementById('aiLoadingContainer').style.display = 'none';
    alert('⚠️ AI 분석 중 오류가 발생했습니다:\n' + error.message);
  } finally { btn.disabled = false; btn.textContent = '🤖 AI 분석 실행 및 저장'; }
}

function renderAiReportContent(rawText) {
  // Check if the response has an unclosed code block (odd number of triple backticks)
  const matches = rawText.match(/```/g);
  let isTruncated = matches ? (matches.length % 2 !== 0) : false;

  // Double check to prevent false positives: if the final section is present, it completed successfully
  if (isTruncated) {
    const completedKeywords = ['상관관계 분석', '핵심 결론', '세부 분석'];
    const hasFinalSection = completedKeywords.some(kw => rawText.includes(kw));
    if (hasFinalSection) {
      isTruncated = false; // False positive due to formatting/backtick typo
    }
  }

  let cleanText = rawText;

  // Remove TPI block if it exists (for compatibility with older saved evaluations or template leakages)
  cleanText = cleanText.replace(/^###? 🏆 종합 성과 지수.*$/gm, '');
  cleanText = cleanText.replace(/^\*계산 산식:.*$/gm, '');
  cleanText = cleanText.replace(/^\(과거 최근.*$/gm, '');

  // Remove "종합 추천 수정 문구" block if it exists (for compatibility with older saved evaluations)
  const recommendKeyword = '종합 추천 수정 문구';
  const recommendHeaderIndex = cleanText.indexOf(recommendKeyword);
  if (recommendHeaderIndex !== -1) {
    const headerStart = cleanText.lastIndexOf('###', recommendHeaderIndex);
    const sliceIndex = headerStart !== -1 ? headerStart : recommendHeaderIndex;
    const afterHeader = cleanText.slice(recommendHeaderIndex);
    const nextHeadingMatch = afterHeader.slice(30).match(/\n###?\s+|\n##\s+/);
    const blockLength = nextHeadingMatch ? nextHeadingMatch.index + 30 : afterHeader.length;
    cleanText = cleanText.slice(0, sliceIndex) + cleanText.slice(recommendHeaderIndex + blockLength);
  }

  // 1. Remove ALL code blocks (even unclosed ones at the very end)
  cleanText = cleanText.replace(/```[\w]*\s*\n?[\s\S]*?(?:\n?\s*```|$)/g, '');

  // 2. Remove stray JSON objects/arrays that might remain
  cleanText = cleanText.replace(/^\s*\{["\w:,\s\d{}\[\].-]+\}\s*$/gm, '');
  cleanText = cleanText.replace(/^\s*\[["'\w,\s.가-힣]+\]\s*$/gm, '');

  // 3. Remove prompt leakage patterns
  cleanText = cleanText.replace(/^\*\*첫 번째 JSON 블록\*\*.*$/gm, '');
  cleanText = cleanText.replace(/^\*\*두 번째 JSON 블록\*\*.*$/gm, '');
  cleanText = cleanText.replace(/^\*\*세 번째 JSON 블록\*\*.*$/gm, '');
  cleanText = cleanText.replace(/^## 출력 형식.*[\s\S]*?(?=^##\s|$)/gm, '');

  // 4. Remove excessive blank lines
  cleanText = cleanText.replace(/\n{4,}/g, '\n\n\n');

  // Pre-parse the 10-step Customer Journey Detailed Report (for backward compatibility with old campaign formats)
  const steps = parseDetailedJourneyReport(cleanText);
  let journeyHtml = '';
  if (steps && steps.length >= 8) {
    // Remove the raw journey block from cleanText so it is not rendered twice as raw markdown
    const headerKeyword = '10단계 고객 행동 여정 상세 리포트';
    const journeyHeaderIndex = cleanText.indexOf(headerKeyword);
    if (journeyHeaderIndex !== -1) {
      const afterHeader = cleanText.slice(journeyHeaderIndex);
      const nextHeadingMatch = afterHeader.slice(50).match(/\n###?\s+|\n##\s+/);
      const journeyBlockLength = nextHeadingMatch ? nextHeadingMatch.index + 50 : afterHeader.length;
      cleanText = cleanText.slice(0, journeyHeaderIndex) + cleanText.slice(journeyHeaderIndex + journeyBlockLength);
    }

    // Generate the styled card grid HTML from parsed steps
    journeyHtml += `<div style="margin-bottom:24px;padding:20px;background:rgba(139,92,246,0.03);border:1px solid rgba(139,92,246,0.12);border-radius:var(--radius-md);">`;
    journeyHtml += `<h3 style="margin:0 0 16px 0;font-size:16px;color:var(--accent-purple);display:flex;align-items:center;gap:8px;">📋 10단계 고객 행동 여정 상세 리포트</h3>`;
    journeyHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">`;
    
    steps.forEach((step) => {
      const itemConfig = aiEvalItems[step.num - 1] || {};
      const icon = itemConfig.icon || '📍';
      
      let scoreVal = 5;
      if (step.scoreText) {
        const scoreMatch = step.scoreText.match(/(\d+)/);
        if (scoreMatch) scoreVal = parseInt(scoreMatch[1]);
      } else if (aiScores[itemConfig.id]) {
        scoreVal = aiScores[itemConfig.id];
      }
      
      const color = scoreVal >= 8 ? 'var(--accent-emerald)' : scoreVal >= 5 ? 'var(--accent-amber)' : 'var(--accent-rose)';
      const grade = scoreVal >= 8 ? '우수' : scoreVal >= 5 ? '보통' : '개선 필요';
      
      const formattedContent = formatDetailedCardContent(step.content);
      
      journeyHtml += `<div style="padding:14px 18px;background:rgba(15,23,42,0.45);border-radius:10px;border:1px solid var(--border-glass);display:flex;flex-direction:column;justify-content:space-between;">`;
      journeyHtml += `  <div>`;
      journeyHtml += `    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:12px;">`;
      journeyHtml += `      <span style="font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.4;">${step.num}. ${icon} ${step.title}</span>`;
      journeyHtml += `      <span style="color:${color};font-weight:800;font-size:15px;white-space:nowrap;padding:2px 8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:6px;">${scoreVal}<span style="font-size:10px;color:var(--text-muted);font-weight:400;">/10</span></span>`;
      journeyHtml += `    </div>`;
      journeyHtml += `    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">평가 등급: <span style="color:${color};font-weight:700;">${grade}</span></div>`;
      journeyHtml += `    <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;margin-top:6px;word-break:keep-all;">${formattedContent}</div>`;
      journeyHtml += `  </div>`;
      journeyHtml += `</div>`;
    });
    
    journeyHtml += `</div></div>`;
  } else {
    // Generate the styled card grid HTML directly from JSON keys (for new optimized compact reports)
    journeyHtml += `<div style="margin-bottom:24px;padding:20px;background:rgba(139,92,246,0.03);border:1px solid rgba(139,92,246,0.12);border-radius:var(--radius-md);">`;
    journeyHtml += `<h3 style="margin:0 0 16px 0;font-size:16px;color:var(--accent-purple);display:flex;align-items:center;gap:8px;">📋 10단계 고객 행동 여정 상세 리포트</h3>`;
    journeyHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;">`;
    
    aiEvalItems.forEach((item, index) => {
      const num = index + 1;
      const icon = item.icon || '📍';
      const scoreVal = aiScores[item.id] || 5;
      const content = aiImprovements[item.id] || item.rec;
      
      const color = scoreVal >= 8 ? 'var(--accent-emerald)' : scoreVal >= 5 ? 'var(--accent-amber)' : 'var(--accent-rose)';
      const grade = scoreVal >= 8 ? '우수' : scoreVal >= 5 ? '보통' : '개선 필요';
      
      const formattedContent = formatDetailedCardContent(content);
      
      journeyHtml += `<div style="padding:14px 18px;background:rgba(15,23,42,0.45);border-radius:10px;border:1px solid var(--border-glass);display:flex;flex-direction:column;justify-content:space-between;">`;
      journeyHtml += `  <div>`;
      journeyHtml += `    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;gap:12px;">`;
      journeyHtml += `      <span style="font-size:14px;font-weight:700;color:var(--text-primary);line-height:1.4;">${num}. ${icon} ${item.title}</span>`;
      journeyHtml += `      <span style="color:${color};font-weight:800;font-size:15px;white-space:nowrap;padding:2px 8px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.05);border-radius:6px;">${scoreVal}<span style="font-size:10px;color:var(--text-muted);font-weight:400;">/10</span></span>`;
      journeyHtml += `    </div>`;
      journeyHtml += `    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;">평가 등급: <span style="color:${color};font-weight:700;">${grade}</span></div>`;
      journeyHtml += `    <div style="font-size:12.5px;color:var(--text-secondary);line-height:1.6;margin-top:6px;word-break:keep-all;">${formattedContent}</div>`;
      journeyHtml += `  </div>`;
      journeyHtml += `</div>`;
    });
    
    journeyHtml += `</div></div>`;
  }

  // 5. Convert cleanText to HTML
  let html = markdownToHtml(cleanText);

  // Prepend journey card grid if parsed successfully
  if (journeyHtml) {
    html = journeyHtml + html;
  }

  if (isTruncated) {
    html += `<div style="margin-top:24px;padding:12px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius-md);font-size:12px;color:var(--accent-rose);text-align:center;line-height:1.5;">💡 생성 용량 한계로 인해 AI 상세 리포트가 중간에 요약 또는 생략되었습니다. 상단의 상세 여정 카드 정보를 참고해 주세요.</div>`;
  }

  return html;
}

function renderAiScoreGrid() {
  const aiPct = calculateTpi(aiScores);
  document.getElementById('aiScoreGrid').innerHTML = aiEvalItems.map(item => {
    const s = aiScores[item.id] || 5;
    const color = s >= 8 ? 'var(--accent-emerald)' : s >= 5 ? 'var(--accent-amber)' : 'var(--accent-rose)';
    const improvement = aiImprovements[item.id] || item.rec;
    return `<div class="ai-score-item" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="score-num" style="color:${color}">${s}</div>
        <div class="score-info"><div class="score-name">${item.icon} ${item.title}</div>
          <div class="score-bar"><div class="score-bar-fill" style="width:${s * 10}%;background:${color};"></div></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;padding-left:48px;line-height:1.5;">💡 ${improvement}</div>
    </div>`;
  }).join('') + `<div class="ai-score-item" style="border-color:rgba(139,92,246,0.3);background:rgba(139,92,246,0.06);"><div class="score-num" style="font-size:28px;color:var(--accent-purple);">${aiPct}</div><div class="score-info"><div class="score-name" style="font-size:14px;font-weight:700;">종합 /100</div></div></div>`;
}

function markdownToHtml(md) {
  let html = md;

  // 1. Extract and protect tables BEFORE any escaping
  const tables = [];
  html = html.replace(/(?:^(\|.+\|)\s*\n(\|[-| :]+\|)\s*\n((?:\|.+\|\s*\n?)+))/gm, function (match, header, separator, bodyRows) {
    const headerCells = header.split('|').filter(c => c.trim()).map(c =>
      `<th style="padding:10px 14px;text-align:left;font-size:13px;font-weight:700;color:var(--text-primary);background:rgba(139,92,246,0.08);border-bottom:2px solid rgba(139,92,246,0.2);">${c.trim()}</th>`
    ).join('');
    const rows = bodyRows.trim().split('\n').map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => {
        const val = c.trim();
        // Highlight evaluation words
        let styled = val.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--accent-purple);">$1</strong>');
        return `<td style="padding:8px 14px;font-size:13px;color:var(--text-secondary);border-bottom:1px solid var(--border-glass);">${styled}</td>`;
      }).join('');
      return `<tr style="transition:background 0.2s;">${cells}</tr>`;
    }).join('');
    const tableHtml = `<table style="width:100%;border-collapse:collapse;margin:16px 0;background:rgba(15,23,42,0.4);border-radius:var(--radius-md);overflow:hidden;border:1px solid var(--border-glass);"><thead><tr>${headerCells}</tr></thead><tbody>${rows}</tbody></table>`;
    const placeholder = `%%TABLE_${tables.length}%%`;
    tables.push(tableHtml);
    return placeholder;
  });

  // 2. Escape HTML entities
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // 3. Headers
  html = html.replace(/^#### (.+)$/gm, '<h5 style="margin:14px 0 6px;font-size:14px;color:var(--text-primary);">$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4 style="margin:20px 0 10px;font-size:15px;color:var(--text-primary);border-bottom:1px solid var(--border-glass);padding-bottom:8px;">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 style="margin:24px 0 12px;font-size:17px;color:var(--accent-purple);">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h3 style="margin:24px 0 12px;font-size:18px;color:var(--accent-purple);">$1</h3>');

  // 4. Bold and italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // 5. Inline code
  html = html.replace(/`(.+?)`/g, '<code style="background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;font-size:12px;">$1</code>');

  // Protect HTML tags before quote highlighting to prevent attribute corruption
  const htmlTags = [];
  html = html.replace(/<[^>]+>/g, function (match) {
    const placeholder = `%%HTML_TAG_${htmlTags.length}%%`;
    htmlTags.push(match);
    return placeholder;
  });

  // 6. Quoted text highlight
  html = html.replace(/"([^"]{2,80})"/g, '<span style="color:var(--accent-blue);font-weight:600;">"$1"</span>');

  // Restore HTML tags after quote highlighting
  htmlTags.forEach((tag, i) => {
    html = html.split(`%%HTML_TAG_${i}%%`).join(tag);
  });

  // 7. Numbered lists
  html = html.replace(/^(\d+)\.\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:4px 0;padding:4px 0;"><span style="color:var(--accent-purple);font-weight:700;min-width:20px;">$1.</span><span>$2</span></div>');
  // Bullet lists
  html = html.replace(/^\s{2,}[-•]\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:2px 0;padding-left:24px;"><span style="color:var(--text-muted);">◦</span><span style="font-size:12px;">$1</span></div>');
  html = html.replace(/^[-•]\s+(.+)$/gm, '<div style="display:flex;gap:8px;margin:3px 0;padding-left:8px;"><span style="color:var(--accent-purple);">•</span><span>$1</span></div>');

  // 8. Paragraph breaks
  html = html.replace(/\n\n+/g, '</div><div style="margin:8px 0;">');
  html = html.replace(/\n/g, '<br>');

  // 9. Wrap in container
  html = '<div style="margin:8px 0;">' + html + '</div>';

  // 10. Re-insert protected tables
  tables.forEach((tableHtml, i) => {
    html = html.replace(`%%TABLE_${i}%%`, tableHtml);
  });

  // 11. Clean empty divs
  html = html.replace(/<div style="margin:8px 0;">\s*<\/div>/g, '');

  return html;
}

// ===== MESSAGE GENERATION (카카오톡 알림톡 문안 생성) =====
let generatedMessages = []; // Store generated messages for copy

function initGenServiceType() {
  const select = document.getElementById('genServiceType');
  if (!select) return;
  select.addEventListener('change', () => {
    const val = select.value;
    const descEl = document.getElementById('genServiceDesc');
    const infoEl = document.getElementById('genServiceInfo');
    if (!val) {
      descEl.style.display = 'none';
      return;
    }
    descEl.style.display = 'block';
    if (val === 'feedback') {
      infoEl.innerHTML = `
        <strong style="color:var(--text-primary);">📋 피드백/결과보고</strong><br>
        후원자님께 아이들이나 어려운 사람들을 지원한 결과를 보고하는 메시지입니다.<br>
        <span style="font-size:12px;color:var(--text-muted);">예: 자립준비 청년 멘토링 성과, 아동 교육 지원 결과, 긴급구호 지원 현황 등</span>
        <div class="gen-type-list">
          <span class="gen-type-tag info">📊 정보제공중심형</span>
          <span class="gen-type-tag emotion">💗 감정터치중심형</span>
          <span class="gen-type-tag action">🎯 행동강조중심형</span>
        </div>`;
    } else {
      infoEl.innerHTML = `
        <strong style="color:var(--text-primary);">🎁 혜택/참여활동</strong><br>
        후원자님께 문화공연, 전시회 등 참여혜택을 안내하고 참여를 독려하는 메시지입니다.<br>
        <span style="font-size:12px;color:var(--text-muted);">예: 후원자 전용 공연 예매, 전시 초대, 체험 프로그램 등</span>
        <div class="gen-type-list">
          <span class="gen-type-tag scarcity">🚨 희소성강조형</span>
          <span class="gen-type-tag private">👑 우대프라이빗형</span>
          <span class="gen-type-tag buzz">✨ 화제가치강조형</span>
        </div>`;
    }
  });
}

function buildGeneratePrompt(serviceType, content, msgLength = 'long') {
  const lengthRule = msgLength === 'short'
    ? `2. 각 문안은 오프닝, 실제 내용 및 제안, 행동 촉구의 세 영역을 모두 합한 총 글자 수(공백 포함)가 **반드시 140자 이상, 200자 이하**가 되도록 매우 간결하고 짜임새 있게 작성하세요. 140자 미만이거나 200자를 초과해서는 절대로 안 됩니다. 핵심 정보만 명확히 담으세요.`
    : `2. 각 문안은 오프닝, 실제 내용 및 제안, 행동 촉구의 세 영역을 모두 합한 총 글자 수(공백 포함)가 **반드시 210자 이상, 400자 이하**가 되도록 풍부하고 상세하게 작성하세요. 210자 미만이거나 400자를 초과해서는 안 됩니다. 구체적인 성과와 따뜻한 감동 문구를 충분히 활용해 주세요.`;

  const referenceNotice = msgLength === 'short'
    ? `* 주의: 아래 '참고 예시'는 분량이 긴 편(장문)이자 구버전의 4단계 구조이므로, 단문 형태를 작성할 때는 예시의 '따뜻한 톤'만 참고하되 구조를 3단계로 합치고 분량을 대폭 축소하여 반드시 140자 이상, 200자 이하가 되도록 하세요.`
    : `* 주의: 아래 '참고 예시'는 구버전의 4단계 구조입니다. 이를 오프닝에서 화제 제기가 자연스럽게 녹아들도록 부드럽게 변환하여 3단계 구조로 재구성하고, 구체적이고 풍성한 내용(210자 ~ 400자 범위 내)으로 작성해 주세요.`;

  const commonContext = `# 역할
당신은 초록우산 어린이재단(www.chorogusan.or.kr)의 카카오톡 알림톡 메시지 카피라이터입니다.
초록우산은 아이들과 어려운 사람들을 돕는 아동복지 전문기관이며, 후원자분들에게 정기적으로 메시지를 발송합니다.

# 핵심 규칙
1. 모든 문안은 반드시 아래 **3단계 구조**를 엄격히 준수하여 유지하세요:
   - 1) 오프닝 (opening): 후원자 호칭("OOO 후원자님")으로 시작하되, 각 유형의 고유 콘셉트와 개성을 극대화하여 시작부터 서로 완전히 다른 스타일의 강렬하고 매력적인 첫 문장으로 작성하세요. 획일적이거나 뻔하고 평이한 안부 인사는 일절 배제하세요. (아래의 '유형별 오프닝 작성법'을 완벽하게 따라야 합니다.)
   - 2) 실제 내용 및 제안 (content): 후원의 성과(수치, 통계 등 구체적 변화) 또는 안내하고자 하는 혜택/참여 일정을 신뢰성 있게 기술하세요.
   - 3) 행동 촉구 (cta): 링크 접속, 참여 독려 등 구체적인 실천 행동을 자연스러운 문구로 유도하세요.
${lengthRule}
3. 초록우산의 따뜻하고 진정성 있는 톤을 유지하세요.
4. 이모지를 자연스럽게 활용하되 과하지 않게 사용하세요.
5. 각 문안은 서로 확실히 다른 스타일과 접근법을 사용하세요.
${referenceNotice}
`;

  let typePrompt = '';

  if (serviceType === 'feedback') {
    typePrompt = `
# 서비스 종류: 피드백/결과보고
후원자님께 아이들이나 어려운 사람들을 지원한 결과를 보고하는 메시지입니다.

# 3가지 유형 정의

## 유형 1: 정보제공중심형
- 핵심: 수치, 데이터, 통계를 중심으로 후원 결과를 객관적이고 신뢰감 있게 전달
- 특징: "3,086명", "90% 이상", "전년 대비 15% 증가" 등 구체적 숫자 강조
- 톤: 신뢰감 있고 담백하며 팩트 중심
- **유형별 오프닝 작성법**: 후원자 호칭 뒤에 **곧바로 핵심을 관통하는 통계 수치나 비율, 전년 대비 변화 등에 관한 예리하고 지적인 질문**을 던지며 주의를 환기하여 시작하세요. (예: "OOO 후원자님, 홀로서기를 시작한 청년들의 진짜 자립 성공률을 알고 계시나요?")
- **매우 중요 수치 규칙**: 만약 사용자가 작성한 '보내고자 하는 내용'에 구체적인 숫자가 없거나 부족하여 AI가 자체적으로 새로운 수치적 정보(통계, 데이터 등)를 지어내거나 추가하여 문안을 작성할 경우, 해당 숫자는 절대로 구체적인 숫자로 표기하지 말고 반드시 '**XX**'(예: **XX명**, **XX%**, **전년 대비 XX% 증가**, **지원금 XX원** 등)으로 표시하여 출력하세요. 사용자가 입력한 내용에 이미 명시되어 있는 숫자는 그대로 노출해야 합니다. 지어낸 임의의 숫자를 구체적으로 적지 마세요.

## 유형 2: 감정터치중심형
- 핵심: 수혜 아동/청년의 실제 이야기나 감정을 생생하게 전달하여 공감 유도
- 특징: 직접 인용("포기하지 않고 해냈어요"), 스토리텔링, 감정적 묘사
- 톤: 따뜻하고 감성적이며 진심이 느껴지는
- **유형별 오프닝 작성법**: 안부 멘트를 완전히 생략하고 **수혜아동의 생생하고 순수한 한마디 인용구, 깊은 감성을 자극하는 편지 구절이나 동화 같은 아동의 모습 묘사**로 아늑하고 뭉클하게 시작하세요. (예: "OOO 후원자님, '이제는 추운 겨울에도 내 방에서 발 뻗고 잘 수 있어요!'라며 수줍게 웃던 민우의 편지가 도착했습니다.")

## 유형 3: 행동강조중심형  
- 핵심: 후원의 실제 변화를 보여주고, 메시지 받는 사람(후원자)이 확인해야 하는 핵심 행동(결과 피드백 확인 등)을 주제에 알맞게 극대화하여 유도
- 특징: 단순히 "아래 링크를 확인하세요" 같은 기계적인 유도 대신, 해당 메시지의 고유한 핵심 테마/주제와 연계하여 궁금증을 불러일으키고 적극적으로 반응하고 싶게 만드는 테마 밀착형 행동 촉구 문장(예: "매일매일 성장하고 있는 아이들의 이야기 확인해보시겠어요?", "기적이 시작된 그날의 감동을 지금 직접 만나보세요!" 등)을 반드시 활용
- 톤: 적극적이고 행동 지향적이며 독자의 마음을 움직이는
- **유형별 오프닝 작성법**: 질문이나 인사 대신 **후원자님의 기여로 만들어낸 기적적인 변화, 성취의 순간을 강렬하고 선언적인 문장**으로 선포하여 후원자의 효능감과 호기심을 극대화하며 시작하세요. (예: "OOO 후원자님, 후원자님의 크신 사랑이 마침내 절망뿐이던 한 아이의 세상을 완전히 바꾸어 놓았습니다!")
- **매우 중요 행동강조 CTA 규칙**: 3) 행동 촉구(cta) 영역을 작성할 때, 평이하거나 기계적인 안내 문구를 전면 배제하고, 작성하는 피드백/결과보고의 고유 주제와 후원자가 취해야 할 확인 행동이 감동적으로 결합된 주제 특화형 CTA 문장으로 작성하세요.

# 참고 예시 (피드백/결과보고 실제 발송 메시지)
OOO 후원자님, 홀로서기를 시작한 청년들의 자립 성공률을 알고 계시나요?

지난해 초록우산은 3,086명의 자립준비 청년에게 멘토링 및 동기부여 프로그램을 지원했습니다.
그 결과, 참여 청년의 90% 이상이 "포기하지 않고, 끝까지 해냈어요"라며 자립에 대한 강한 의지를 보여주었습니다.

하지만 여전히 많은 스무 살 청년들이 당장의 월세 30만 원, 생활비 부족으로 인해 사회 진출의 출발선에서 좌절하고 있습니다.

숫자가 증명하는 후원의 힘. 지금 청년들의 진짜 자립이야기를 들어보세요!
`;
  } else {
    typePrompt = `
# 서비스 종류: 혜택/참여활동
후원자님께 문화공연, 전시회 등 참여혜택을 안내하고 참여를 독려하는 메시지입니다.

# 3가지 유형 정의

## 유형 1: 희소성강조형
- 핵심: 한정 수량, 기간 마감, 선착순 등 긴급성과 희소성으로 빠른 행동 유도
- 특징: "서둘러주세요!", "곧 마감", "한정 수량", "🚨" 등 긴급 표현
- 톤: 긴박하고 에너지 넘치며 FOMO(놓칠까 봐 두려운) 자극
- **유형별 오프닝 작성법**: 안부나 인사치레 없이 **🚨 경고 이모지와 함께 즉시 마감 임박 상태나 극도의 희소성을 알리는 다급한 선언문**으로 강렬하게 주의를 집중하며 시작하세요. (예: "OOO 후원자님, 서둘러주세요! 3월 한정 특별 문화 혜택 예매가 곧 조기 마감될 예정입니다.")

## 유형 2: 우대프라이빗형
- 핵심: 후원자만의 특별한 자격/혜택임을 강조하여 VIP 감성 자극
- 특징: "후원자님만을 위한", "특별 초대", "우선 예매", "감사의 마음을 담아"
- 톤: 품격 있고 프라이빗하며 감사와 존중이 느껴지는
- **유형별 오프닝 작성법**: 오직 **후원자님만을 위해 특별하게 마련된 명예롭고 우대받는 혜택/초청임을 단아하고 정중한 첫 한마디**로 전하며 귀빈(VIP) 대접을 받는 느낌이 들도록 정성껏 문을 여세요. (예: "OOO 후원자님, 늘 따뜻한 동행으로 함께해 주시는 후원자님만을 위한 아주 특별한 문화공연 초청장을 전해 드립니다.")

## 유형 3: 화제가치강조형
- 핵심: 콘텐츠 자체의 트렌드, 화제성, 흥미를 강조하여 자연스러운 관심 유도
- 특징: "요즘 가장 핫한", "SNS에서 화제인", "꼭 봐야 할" 등 화제성 강조
- 톤: 트렌디하고 흥미롭고 호기심 자극
- **유형별 오프닝 작성법**: 호칭 뒤에 **요즘 SNS나 문화계에서 폭발적으로 화제를 모으고 있는 작품/트렌드에 대한 트렌디하고 강렬한 호기심 유발형 질문**을 던지며 신선하고 생동감 있게 시작하세요. (예: "OOO 후원자님, 오픈 전부터 SNS를 뜨겁게 달구며 연일 티켓 매진 사례를 빚고 있는 바로 그 독창적인 전시를 알고 계시나요?")

# 참고 예시 (혜택/참여활동 실제 발송 메시지)
OOO 후원자님, 서둘러주세요! 3월 특별 문화 혜택 예매가 곧 마감될 수 있습니다.
망설이는 순간 원하시는 공연이 마감될 수 있으니, 지금 바로 아래 링크를 통해 선점하세요!
🚨 한정 수량 예매 라인업
💚 서울
▪️뮤지컬 〈센과 치히로의 행방불명〉https://bit.ly/4rrOy0C 
▪️연극 〈노인의 꿈〉https://bit.ly/4tP6ljW 
▪️전시 〈렘브란트에서 고야까지〉https://bit.ly/3ML8rR6 
▪️뮤지컬 〈담배가게 아가씨〉https://bit.ly/4qMkITj 
▪️연극 〈보물찾기〉https://bit.ly/4tPy3No
💚 충남 당진
 ▪️쇼뮤지컬 〈프린세스 캐치! 티니핑〉https://bit.ly/4cbiRE8
서둘러 혜택을 확인해 보세요
`;
  }

  const outputFormat = `
# 출력 형식 (반드시 정확히 지켜주세요)

API 응답 출력 형태가 application/json으로 강제되어 있으므로, 마크다운 코드 블록(예: \`\`\`json ... \`\`\`)을 절대로 사용하지 마시고 오직 순수한 JSON 배열 구조만 반환하세요.

* 매우 중요: JSON 문법이 절대로 깨지지 않도록, 모든 문자열 값 내에서 대화나 직접 인용구를 표현할 때는 절대로 쌍따옴표(")를 중첩해서 사용하지 마시고 반드시 홑따옴표(')를 사용하세요.

정확히 아래 스키마의 JSON 배열 구조로 3개의 문안을 출력하세요:

[
  {
    "typeName": "유형 이름",
    "opening": "1) 오프닝 텍스트 (유형별 오프닝 작법에 맞춘 문장)",
    "content": "2) 실제 내용 및 제안 텍스트 (성과 수치, 사업 팩트, 구체적 일정 등)",
    "cta": "3) 행동 촉구 텍스트 (활동 참여, 링크 접속 유도 등)",
    "description": "문안 생성 시 중점을 둔 핵심 사항(타겟 소구점, 카피라이팅 기법 등)에 대한 간략한 설명 (1~2문장)"
  },
  {
    "typeName": "유형 이름",
    "opening": "오프닝 텍스트",
    "content": "실제 내용 및 제안 텍스트",
    "cta": "행동 촉구 텍스트",
    "description": "생성 시 중점을 둔 점 설명"
  },
  {
    "typeName": "유형 이름",
    "opening": "오프닝 텍스트",
    "content": "실제 내용 및 제안 텍스트",
    "cta": "행동 촉구 텍스트",
    "description": "생성 시 중점을 둔 점 설명"
  }
]

# 사용자가 보내고자 하는 내용
\`\`\`
${content}
\`\`\`

위 내용을 바탕으로 3가지 유형의 카카오톡 알림톡 문안을 생성하세요.
각 문안은 해당 유형의 특성을 극대화하되, 사용자가 제공한 핵심 내용은 반드시 포함하세요.
`;

  // Build reference from best-performing past campaigns (by open rate)
  let bestCampaignRef = '';
  const pastCampaigns = loadCampaigns().filter(c => c.msgBody && c.openRate > 0);
  if (pastCampaigns.length > 0) {
    const sorted = [...pastCampaigns].sort((a, b) => (b.openRate || 0) - (a.openRate || 0));
    const best = sorted[0];
    const top3 = sorted.slice(0, 3);

    bestCampaignRef = `
# 📊 과거 성과 기반 레퍼런스 (반드시 참고하세요!)

## 🏆 오픈율 1위 캠페인 (가장 성과가 좋았던 메시지)
- 캠페인명: "${best.name}"
- 오픈율: ${best.openRate}% | 전환율: ${best.convertRate}%
- 발송일: ${best.sendDate || '미입력'}
- 메시지 본문:
\`\`\`
${best.msgBody}
\`\`\`
${(best.ctaLinks && best.ctaLinks.length > 0) ? `- CTA 버튼: ${best.ctaLinks.map(l => `"${l.name}"`).join(', ')}` : ''}

**이 메시지가 높은 오픈율을 달성한 요인을 분석하고, 새 문안 작성 시 다음을 반영하세요:**
- 오프닝 문구의 구조와 호기심 유도 패턴
- 본문의 길이, 이모지 사용 빈도, 문장 구조
- CTA 문구의 행동 유도 방식
- 전체적인 톤앤매너와 감정적 어필 방식

${top3.length > 1 ? `## 📈 오픈율 상위 캠페인 요약 (Top ${top3.length})
${top3.map((c, i) => `${i + 1}. "${c.name}" — 오픈율 ${c.openRate}%, 전환율 ${c.convertRate}%
   첫 줄: ${(c.msgBody || '').split('\\n')[0].slice(0, 80)}`).join('\\n')}

**위 성과 데이터에서 발견되는 공통 성공 패턴을 새 문안에 적극 반영하세요.**` : ''}
`;
  }

  return commonContext + typePrompt + bestCampaignRef + outputFormat;
}

async function generateMessage() {
  const serviceType = document.getElementById('genServiceType').value;
  const content = document.getElementById('genContent').value.trim();

  if (!serviceType) { showToast('⚠️ 서비스 종류를 선택해 주세요.'); return; }
  if (!content) { showToast('⚠️ 보내고자 하는 내용을 입력해 주세요.'); return; }

  const btn = document.getElementById('genRunBtn');
  btn.disabled = true;
  btn.textContent = '⏳ AI가 문안을 생성 중...';

  const resultSection = document.getElementById('genResultSection');
  resultSection.style.display = 'block';
  document.getElementById('genLoading').style.display = 'flex';
  document.getElementById('genResultCards').innerHTML = '';

  const msgLength = document.getElementById('genMsgLength').value || 'long';
  const prompt = buildGeneratePrompt(serviceType, content, msgLength);
  

  const models = ['gemini-2.5-pro', 'gemini-2.5-flash'];

  try {
    let text = null, usedModel = '';
    let lastError = null;
    for (const model of models) {
      try {
        document.querySelector('#genLoading .ai-loading-text').textContent = `${model} 모델로 생성 중...`;
        const res = await fetchGemini(
          model, 
          [{ parts: [{ text: prompt }] }], 
          { 
            temperature: 0.9, 
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            thinkingConfig: {
              thinkingBudget: 0
            }
          }
        );
        if (res.ok) {
          const data = await res.json();
          text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) { usedModel = model; break; }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`${model} failed:`, errData.error || res.status);
          const errMsg = errData.error?.message || errData.error || `API 오류 (${res.status})`;
          if (res.status === 401 || res.status === 403) {
            throw new Error('API 키가 유효하지 않습니다. 올바른 Gemini API 키를 입력해 주세요.');
          }
          if (res.status === 404) {
            throw new Error('서버 프록시 경로(/api/gemini-proxy)를 찾을 수 없습니다. 로컬 단독 테스트 시에는 API 키를 직접 입력해 주세요.');
          }
          if (res.status === 500 && errMsg.includes('GEMINI_API_KEY')) {
            throw new Error('서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. API 키를 직접 입력해 주세요.');
          }
          throw new Error(errMsg);
        }
      } catch (modelErr) {
        lastError = modelErr;
        if (modelErr.message && (
          modelErr.message.includes('API 키') || 
          modelErr.message.includes('401') || 
          modelErr.message.includes('403') ||
          modelErr.message.includes('환경변수') ||
          modelErr.message.includes('로컬 파일') ||
          modelErr.message.includes('프록시 경로')
        )) {
          throw modelErr;
        }
        console.warn(`${model} 실패, 다음 모델 시도... 요인:`, modelErr.message);
      }
    }
    if (!text) {
      throw new Error(`AI 문안 생성 호출에 실패했습니다. (마지막 오류: ${lastError ? lastError.message : '알 수 없음'})`);
    }

    // Parse JSON from response robustly
    let messages = null;
    const trimmedText = text.trim();
    
    try {
      messages = JSON.parse(trimmedText);
    } catch (e) {
      // Fallback 1: Extract from markdown code blocks
      const jsonMatch = trimmedText.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/i);
      if (jsonMatch) {
        try {
          messages = JSON.parse(jsonMatch[1].trim());
        } catch (e2) {
          console.warn("Markdown block JSON parse failed:", e2);
        }
      }
      
      // Fallback 2: Extract using bracket indices
      if (!messages) {
        const firstBracket = trimmedText.indexOf('[');
        const lastBracket = trimmedText.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          try {
            messages = JSON.parse(trimmedText.slice(firstBracket, lastBracket + 1));
          } catch (e3) {
            console.warn("Bracket index JSON parse failed:", e3);
          }
        }
      }
    }

    // Auto-unpack wrapper object to array
    if (messages && !Array.isArray(messages) && typeof messages === 'object') {
      const possibleArray = Object.values(messages).find(val => Array.isArray(val) && val.length >= 3);
      if (possibleArray) {
        messages = possibleArray;
      } else {
        const keys = Object.keys(messages);
        if (keys.length >= 3) {
          messages = keys.map(k => messages[k]);
        }
      }
    }

    if (!messages) throw new Error('AI 응답에서 문안을 파싱할 수 없습니다. 다시 시도해 주세요.');
    if (!Array.isArray(messages) || messages.length < 3) throw new Error('3가지 문안이 모두 생성되지 않았습니다. 다시 시도해 주세요.');

    generatedMessages = messages;
    document.getElementById('genLoading').style.display = 'none';
    document.getElementById('genResultBadge').textContent = `${usedModel} · ${new Date().toLocaleTimeString('ko-KR')}`;
    renderGenerateResults(messages, serviceType);
    showToast('✨ 3가지 유형의 문안이 생성되었습니다!');

  } catch (error) {
    document.getElementById('genLoading').style.display = 'none';
    document.getElementById('genResultCards').innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--accent-rose);">
        <p style="font-size:18px;margin-bottom:8px;">⚠️ 오류</p>
        <p style="font-size:14px;">${error.message}</p>
        ${error.message.includes('API 키') ? '<p style="margin-top:12px;font-size:13px;color:var(--text-muted);">💡 캠페인 정보 탭에서 유효한 API 키를 입력하세요.</p>' : ''}
      </div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = '✨ AI 문안 생성하기';
  }
}

function renderGenerateResults(messages, serviceType) {
  const typeConfigs = {
    feedback: [
      { icon: '📊', tagClass: 'info', color: 'var(--accent-blue)' },
      { icon: '💗', tagClass: 'emotion', color: 'var(--accent-rose)' },
      { icon: '🎯', tagClass: 'action', color: 'var(--accent-amber)' }
    ],
    benefit: [
      { icon: '🚨', tagClass: 'scarcity', color: 'var(--accent-rose)' },
      { icon: '👑', tagClass: 'private', color: 'var(--accent-purple)' },
      { icon: '✨', tagClass: 'buzz', color: 'var(--accent-cyan)' }
    ]
  };

  const configs = typeConfigs[serviceType] || typeConfigs.feedback;
  const container = document.getElementById('genResultCards');

  container.innerHTML = messages.slice(0, 3).map((msg, i) => {
    const cfg = configs[i] || configs[0];
    const fullText = [msg.opening, msg.content, msg.cta].filter(Boolean).join('\n\n');
    const charCount = fullText.length;
    return `
      <div class="gen-result-card" style="border-top:3px solid ${cfg.color};">
        <div class="gen-card-header">
          <h4>
            <span class="gen-card-number">${i + 1}</span>
            ${cfg.icon} ${msg.typeName || `유형 ${i + 1}`}
          </h4>
          <span class="gen-type-tag ${cfg.tagClass}">${msg.typeName || `유형 ${i + 1}`} (${charCount}자)</span>
        </div>
        <div class="gen-card-body">
          <div class="gen-msg-section">
            <div class="gen-section-label opening">1) 오프닝 (화제 제기 결합)</div>
            <div class="gen-msg-text">${escapeHtml(msg.opening || '')}</div>
          </div>
          <div class="gen-msg-section">
            <div class="gen-section-label content">2) 실제 내용 및 제안</div>
            <div class="gen-msg-text">${escapeHtml(msg.content || '')}</div>
          </div>
          <div class="gen-msg-section">
            <div class="gen-section-label cta">3) 행동 촉구</div>
            <div class="gen-msg-text">${escapeHtml(msg.cta || '')}</div>
          </div>
          ${msg.description ? `
          <div class="gen-msg-desc-section" style="margin-top:16px; padding-top:12px; border-top:1px dashed rgba(255,255,255,0.08);">
            <div class="gen-section-label" style="color:var(--accent-purple); font-size:11px; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
              💡 작성 주안점 및 코멘트
            </div>
            <div style="font-size:12px; color:var(--text-secondary); line-height:1.5;">${escapeHtml(msg.description)}</div>
          </div>` : ''}
        </div>
        <div class="gen-card-footer">
          <button class="gen-copy-btn" onclick="copyGeneratedMessage(${i})" id="genCopyBtn${i}">
            📋 메시지 복사
          </button>
        </div>
      </div>`;
  }).join('');
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

function copyGeneratedMessage(index) {
  if (!generatedMessages[index]) return;
  const msg = generatedMessages[index];
  const fullText = [msg.opening, msg.content, msg.cta].filter(Boolean).join('\n\n');

  navigator.clipboard.writeText(fullText).then(() => {
    const btn = document.getElementById(`genCopyBtn${index}`);
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = '✅ 복사됨!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '📋 메시지 복사';
      }, 2000);
    }
    showToast('📋 문안이 클립보드에 복사되었습니다!');
  }).catch(() => {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = fullText;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 문안이 클립보드에 복사되었습니다!');
  });
}

function copyLastPrompt(event) {
  if (event) event.stopPropagation();
  if (!lastGeneratedPrompt) {
    showToast('⚠️ 아직 생성된 문안이 없습니다.');
    return;
  }
  navigator.clipboard.writeText(lastGeneratedPrompt).then(() => {
    const btn = event.target;
    if (btn) {
      const originalText = btn.textContent;
      btn.textContent = '✅ 복사됨!';
      btn.style.background = 'var(--accent-emerald)';
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
      }, 2000);
    }
    showToast('📋 적용된 AI 프롬프트가 클립보드에 복사되었습니다!');
  }).catch(() => {
    // Fallback copy
    const ta = document.createElement('textarea');
    ta.value = lastGeneratedPrompt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('📋 적용된 AI 프롬프트가 클립보드에 복사되었습니다!');
  });
}

// ===== ALIMTOK IMAGE GENERATOR =====
let imgGenImageData = null; // Base64 data URL of uploaded image
let imgGenImageEl = null;   // HTMLImageElement for canvas drawing
let imgGenSizeMode = 'small'; // Always 'small' (230x230)
let imgGenGenerated = false;

// Load font for canvas
const CANVAS_FONT_FAMILY = '"Spoqa Han Sans Neo", "Noto Sans KR", "Malgun Gothic", sans-serif';

function initImgGenTextInput() {
  const input = document.getElementById('imgGenText');
  if (!input) return;
  
  input.addEventListener('input', () => {
    const lines = input.value.split('\n');
    const errorEl = document.getElementById('imgTextError');
    let hasError = false;
    
    // Enforce max 3 lines
    if (lines.length > 3) {
      input.value = lines.slice(0, 3).join('\n');
    }
    
    // Enforce max 20 chars per line
    const currentLines = input.value.split('\n');
    let corrected = false;
    const fixedLines = currentLines.map(line => {
      if (line.length > 20) {
        corrected = true;
        return line.slice(0, 20);
      }
      return line;
    });
    if (corrected) {
      const cursorPos = input.selectionStart;
      input.value = fixedLines.join('\n');
      input.setSelectionRange(Math.min(cursorPos, input.value.length), Math.min(cursorPos, input.value.length));
    }
    
    // Update character count (longest line)
    const updatedLines = input.value.split('\n');
    const maxLineLen = Math.max(...updatedLines.map(l => l.length));
    document.getElementById('imgTextCount').textContent = `${updatedLines.length}줄 · 최대 ${maxLineLen}자`;
    
    // Validation
    const totalLen = input.value.replace(/\n/g, '').length;
    if (totalLen > 0 && totalLen < 2) {
      errorEl.style.display = 'block';
      errorEl.textContent = '⚠️ 최소 2자 이상 입력해 주세요.';
      hasError = true;
    } else {
      errorEl.style.display = 'none';
    }
    
    // Live preview update
    if (totalLen >= 2) {
      renderAlimtokCanvas();
    }
  });
  
  // Prevent more than 3 lines via keydown
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const lines = input.value.split('\n');
      if (lines.length >= 3) {
        e.preventDefault();
      }
    }
  });
}

function initImgGenDragDrop() {
  const area = document.getElementById('imgGenUploadArea');
  if (!area) return;
  area.addEventListener('dragover', e => {
    e.preventDefault();
    e.stopPropagation();
    area.style.borderColor = '#8b5cf6';
    area.style.background = 'rgba(139, 92, 246, 0.06)';
  });
  area.addEventListener('dragleave', e => {
    e.preventDefault();
    e.stopPropagation();
    area.style.borderColor = '';
    area.style.background = '';
  });
  area.addEventListener('drop', e => {
    e.preventDefault();
    e.stopPropagation();
    area.style.borderColor = '';
    area.style.background = '';
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('image/')) {
      const dt = new DataTransfer();
      dt.items.add(f);
      document.getElementById('imgGenFileInput').files = dt.files;
      handleImgGenUpload({ target: { files: [f] } });
    }
  });
}

function handleImgGenUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showToast('⚠️ 10MB 이하 이미지만 업로드 가능합니다.');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = e => {
    imgGenImageData = e.target.result;
    
    // Create image element for canvas
    const img = new Image();
    img.onload = () => {
      imgGenImageEl = img;
      // Show preview
      document.getElementById('imgGenPreviewImg').src = imgGenImageData;
      document.getElementById('imgGenUploadPlaceholder').style.display = 'none';
      document.getElementById('imgGenPreviewContainer').style.display = 'block';
      document.getElementById('imgGenUploadArea').classList.add('has-image');
      // Update canvas preview
      renderAlimtokCanvas();
    };
    img.src = imgGenImageData;
  };
  reader.readAsDataURL(file);
}

function removeImgGenImage() {
  imgGenImageData = null;
  imgGenImageEl = null;
  document.getElementById('imgGenFileInput').value = '';
  document.getElementById('imgGenUploadPlaceholder').style.display = 'block';
  document.getElementById('imgGenPreviewContainer').style.display = 'none';
  document.getElementById('imgGenUploadArea').classList.remove('has-image');
  renderAlimtokCanvas();
}

function renderAlimtokCanvas() {
  const canvas = document.getElementById('imgGenCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Clear and fill background
  ctx.clearRect(0, 0, 800, 400);
  ctx.fillStyle = '#F9F9F9';
  ctx.fillRect(0, 0, 800, 400);
  
  // Draw text (top-left with 36px left, 42px top margin) — Photoshop 기준
  const text = document.getElementById('imgGenText')?.value || '';
  if (text.length >= 1) {
    ctx.fillStyle = '#333333';
    ctx.font = `bold 54px ${CANVAS_FONT_FAMILY}`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.letterSpacing = '0px';
    
    // Text position: 36px left, 42px top (Photoshop 기준, Canvas 보정값 +6px)
    const textX = 35;
    const textY = 47;
    const lineHeight = 74;
    
    // Text width limit: full canvas width minus left/right margins (36px each)
    // Text is always rendered exactly as the user typed it.
    // Auto-wrap only occurs when a single line exceeds this width limit.
    const maxTextWidth = 520; // 좌측 여백 36px 제외한 텍스트 영역 제한
    const inputLines = text.split('\n').slice(0, 3); // Max 3 lines
    let drawLineIdx = 0;
    
    inputLines.forEach((inputLine) => {
      if (inputLine.length === 0) {
        drawLineIdx++;
        return;
      }
      const wrappedLines = wrapText(ctx, inputLine, maxTextWidth);
      wrappedLines.forEach((line) => {
        ctx.fillText(line, textX, textY + (drawLineIdx * lineHeight));
        drawLineIdx++;
      });
    });
  }
  
  // Draw uploaded image (bottom-right with 20px right, 16px bottom margin) — Photoshop 기준
  if (imgGenImageEl) {
    const maxW = 200;
    const maxH = 200;
    
    // Calculate fitted dimensions maintaining aspect ratio
    let drawW = imgGenImageEl.naturalWidth;
    let drawH = imgGenImageEl.naturalHeight;
    
    const scaleW = maxW / drawW;
    const scaleH = maxH / drawH;
    const scale = Math.min(scaleW, scaleH, 1); // Don't upscale beyond natural size
    
    drawW = Math.round(drawW * scale);
    drawH = Math.round(drawH * scale);
    
    // Position at bottom-right with 20px right margin, 30px bottom margin (Photoshop 기준)
    const imgX = 800 - drawW - 20;
    const imgY = 400 - drawH - 28;
    
    ctx.drawImage(imgGenImageEl, imgX, imgY, drawW, drawH);
  }
}

function wrapText(ctx, text, maxWidth) {
  const lines = [];
  let currentLine = '';
  
  for (let i = 0; i < text.length; i++) {
    const testLine = currentLine + text[i];
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = text[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  
  return lines;
}

function generateAlimtokImage() {
  const text = document.getElementById('imgGenText')?.value || '';
  
  // Validate text
  const totalLen = text.replace(/\n/g, '').length;
  if (totalLen < 2) {
    showToast('⚠️ 문구를 최소 2자 이상 입력해 주세요.');
    document.getElementById('imgGenText')?.focus();
    return;
  }
  const lines = text.split('\n');
  if (lines.length > 3) {
    showToast('⚠️ 문구는 최대 3줄까지만 입력 가능합니다.');
    return;
  }
  
  // Render final image
  renderAlimtokCanvas();
  
  imgGenGenerated = true;
  
  // Show download button
  document.getElementById('imgDownloadBtn').style.display = 'flex';
  
  showToast('🖼️ 알림톡 이미지가 생성되었습니다!');
  
  // Scroll to canvas
  document.getElementById('imgGenCanvasWrap').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function downloadAlimtokImage() {
  if (!imgGenGenerated) {
    showToast('⚠️ 먼저 이미지를 생성해 주세요.');
    return;
  }
  
  const canvas = document.getElementById('imgGenCanvas');
  const dataUrl = canvas.toDataURL('image/png');
  
  const link = document.createElement('a');
  link.download = `alimtok_image_${new Date().toISOString().slice(0, 10)}_${Date.now()}.png`;
  link.href = dataUrl;
  link.click();
  
  showToast('📥 PNG 이미지가 다운로드되었습니다!');
}

// Initialize image generator on DOMContentLoaded
function initImgGen() {
  initImgGenTextInput();
  initImgGenDragDrop();
  
  // Preload font for canvas rendering
  if (document.fonts) {
    document.fonts.load('bold 54px "Spoqa Han Sans Neo"').then(() => {
      renderAlimtokCanvas();
    }).catch(() => {
      renderAlimtokCanvas();
    });
  } else {
    // Fallback: render after a small delay
    setTimeout(() => renderAlimtokCanvas(), 500);
  }
}

// ===== Window bindings for HTML onclick handlers =====
Object.assign(window, {
  switchTab, saveAndShowResult, runAiAndSave, loadCampaignResult,
  deleteCampaign, openModal, closeModal, exportReport, startNewEval,
  toggleFeedback, handleAiImageUpload,
  removeAiImage, addCtaLink, removeCtaLink, runAiEvaluation,
  generateMessage, copyGeneratedMessage, copyLastPrompt,
  handleImgGenUpload, removeImgGenImage,
  generateAlimtokImage, downloadAlimtokImage,
  refreshResultSelector, clearCampaignResult,
  refreshOverview, changeOverviewPage, exportOverviewToCsv
});

// ===== Start execution =====
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}


