// ===== Firebase Imports =====
import { db, collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy } from './firebase-config.js';

// ===== 10 AI Evaluation Items (Full Analysis) =====
const aiEvalItems = [
  {
    id: 'subject', title: '첫 줄 매력도', category: '콘텐츠', icon: '✍️',
    tip: '첫 줄은 15자 이내, 핵심 혜택/호기심 선두 배치', rec: '첫 줄에 핵심 혜택을 배치하고 15자 이내로 압축하세요'
  },
  {
    id: 'body', title: '본문 콘텐츠 품질', category: '콘텐츠', icon: '📄',
    tip: '핵심 메시지는 첫 2줄 이내, 이미지 비율 40% 이하', rec: '본문 길이를 100자 이내로 줄이고 이미지 비율을 조정하세요'
  },
  {
    id: 'cta', title: 'CTA(행동유도) 효과성', category: '콘텐츠', icon: '🎯',
    tip: 'CTA는 1개로 집중, 구체적 혜택 명시', rec: 'CTA를 1개로 통일하고 구체적 혜택을 명시하세요'
  },
  {
    id: 'timing', title: '발송 시간 적합성', category: '발송 전략', icon: '⏰',
    tip: '평일 오전 10-11시, 점심 12-13시가 최적', rec: '오전 10-11시 또는 점심 12-13시 발송을 테스트하세요'
  },
  {
    id: 'frequency', title: '발송 빈도 적절성', category: '발송 전략', icon: '📅',
    tip: '주 1-2회가 적정, 수신거부율 0.5% 이하 유지', rec: '발송 빈도를 주 1-2회로 조정하세요'
  },
  {
    id: 'segment', title: '타겟 세그먼트 정확도', category: '타겟팅', icon: '👥',
    tip: 'RFM 분석 기반 세그먼트 최소 5개 이상 구분', rec: 'RFM 분석을 활용한 세분화를 강화하세요'
  },
  {
    id: 'personalization', title: '개인화 수준', category: '타겟팅', icon: '🧩',
    tip: '이름 + 최근 관심 상품 조합이 가장 효과적', rec: '고객명 + 관심 상품 기반 개인화를 적용하세요'
  },
  {
    id: 'offer', title: '혜택/리워드 매력도', category: '프로모션', icon: '🎁',
    tip: '실물 선물/포인트/쿠폰 등 실질 리워드가 핵심', rec: '구체적인 혜택(선물, 포인트, 쿠폰 등)을 명시하세요'
  },
  {
    id: 'channel', title: '채널 적합성', category: '발송 전략', icon: '📱',
    tip: '긴급→SMS/푸시, 상세→이메일, 리치→카카오', rec: '메시지 목적에 맞는 채널을 재검토하세요'
  },
  {
    id: 'landing', title: '랜딩 페이지 연결성', category: '콘텐츠', icon: '🔗',
    tip: '메시지-랜딩 간 일치, 3클릭 이내 전환', rec: '랜딩 페이지와 메시지 간 일관성을 강화하세요'
  }
];

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
let feedbackRating = 0;
let feedbackEnabled = false;
let aiCompleted = false;
let currentCampaignId = null;
let aiImageBase64 = null;
let aiImageMimeType = null;
let selectedCampaignCache = null;

// ===== Init =====
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initFeedbackStars();
  initDragDrop();
  initApiKeyField();
  initFirestore(); // Start real-time sync with Firestore
  updateBadge();
  initGenServiceType();
});

// ===== Window bindings for HTML onclick handlers =====
Object.assign(window, {
  switchTab, saveAndShowResult, runAiAndSave, loadCampaignResult,
  deleteCampaign, openModal, closeModal, exportReport, startNewEval,
  toggleFeedback, toggleLocalKeyVisibility, handleAiImageUpload,
  removeAiImage, addCtaLink, removeCtaLink, runAiEvaluation,
  generateMessage, copyGeneratedMessage
});

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
  const campaign = {
    id: currentCampaignId || Date.now(), name,
    sendDate: document.getElementById('sendDate').value,
    sendTime: document.getElementById('sendTime').value,
    sendRecipients: parseInt(document.getElementById('sendRecipients').value) || 0,
    channel: '',
    segment: document.getElementById('targetSegment').value,
    openRate: parseFloat(document.getElementById('actualOpenRate').value) || 0,
    convertRate: parseFloat(document.getElementById('actualConvertRate').value) || 0,
    msgTitle: '',
    msgBody: document.getElementById('aiMsgBody').value.trim(),
    ctaLinks: getCtaLinks(),
    msgStats: calculateMsgStats(document.getElementById('aiMsgBody').value.trim()),
    aiScores: { ...aiScores },
    aiImprovements: { ...aiImprovements },
    aiRecommendations: [...aiRecommendations],
    aiReport: document.getElementById('aiResultContent')?.innerHTML || '',
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
function refreshResultSelector() {
  const sel = document.getElementById('resultCampaignSelect');
  const campaigns = loadCampaigns(); const curVal = sel.value;
  sel.innerHTML = '<option value="">캠페인을 선택하세요</option>' +
    campaigns.map(c => `<option value="${c.id}">${c.name} (${c.sendDate || c.createdAt})</option>`).join('');
  if (curVal) sel.value = curVal;
}

function loadCampaignResult() {
  const id = parseInt(document.getElementById('resultCampaignSelect').value);
  if (!id) return;
  const c = loadCampaigns().find(x => x.id === id);
  if (!c) return;
  selectedCampaignCache = c;

  // Calculate scores
  const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
  let aiPct = 0;
  if (hasAi) aiPct = Math.round(Object.values(c.aiScores).reduce((a, b) => a + b, 0) / (aiEvalItems.length * 10) * 100);
  const hasFb = c.feedback && c.feedback.rating > 0;
  let fbPct = 0;
  if (hasFb) fbPct = Math.round(((c.feedback.rating * 2) + c.feedback.relevance + c.feedback.willingness) / 30 * 100);

  let totalPct, breakdown;
  if (hasAi && hasFb) { totalPct = Math.round(aiPct * 0.7 + fbPct * 0.3); breakdown = `AI ${aiPct}×70% + 피드백 ${fbPct}×30%`; }
  else if (hasAi) { totalPct = aiPct; breakdown = `AI 평가 점수`; }
  else if (hasFb) { totalPct = fbPct; breakdown = `피드백 점수만 반영`; }
  else { totalPct = 0; breakdown = '아직 평가되지 않음'; }

  // Score circle
  const ring = document.getElementById('scoreRing');
  ring.style.strokeDashoffset = '283';
  setTimeout(() => { ring.style.strokeDashoffset = 283 - (283 * totalPct / 100); }, 100);
  document.getElementById('scoreNum').textContent = totalPct;
  document.getElementById('scoreGrade').textContent = totalPct >= 75 ? '🏆 우수' : totalPct >= 50 ? '📈 보통' : totalPct > 0 ? '⚠️ 개선 필요' : '—';
  document.getElementById('scoreComment').innerHTML = (totalPct >= 75 ? '매우 우수한 캠페인입니다!' : totalPct >= 50 ? '양호하나 일부 개선이 필요합니다.' : totalPct > 0 ? '여러 항목에서 개선이 필요합니다.' : 'AI 분석을 실행해 주세요.') + `<br><span style="font-size:12px;color:var(--text-muted);">가중치: ${breakdown}</span>`;

  // Summary cards
  document.getElementById('resultSummarySection').style.display = 'block';

  // Campaign info
  document.getElementById('resultCampaignSummary').innerHTML = `
    <strong>캠페인명:</strong> ${c.name}<br>
    <strong>발송일:</strong> ${c.sendDate || '미입력'}<br>
    <strong>발송시간:</strong> ${c.sendTime || '미입력'}<br>
    <strong>발송 인원:</strong> ${c.sendRecipients ? c.sendRecipients.toLocaleString() + '명' : '미입력'}<br>
    <strong>채널:</strong> ${c.channel || '미입력'}<br>
    <strong>세그먼트:</strong> ${c.segment || '미입력'}<br>
    <strong>오픈율:</strong> <span style="color:var(--accent-blue)">${c.openRate}%</span> · 
    <strong>전환율:</strong> <span style="color:var(--accent-emerald)">${c.convertRate}%</span>`;

  // AI summary
  if (hasAi) {
    document.getElementById('resultAiSummary').innerHTML = `
      <strong>AI 종합:</strong> <span style="color:var(--accent-purple)">${aiPct}점</span>/100<br>
      ${aiEvalItems.map(it => `${it.icon} ${it.title}: <strong>${c.aiScores[it.id] || '-'}</strong>`).join('<br>')}`;
  } else {
    document.getElementById('resultAiSummary').innerHTML = '<span style="color:var(--text-muted)">AI 평가 미실행</span>';
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

  // Result table (AI 10 items)
  const aiImps = c.aiImprovements || {};
  const rows = aiEvalItems.map((item, i) => {
    const aiScore = hasAi ? (c.aiScores[item.id] || '-') : '-';
    const scoreForGrade = typeof aiScore === 'number' ? aiScore : 5;
    const grade = scoreForGrade >= 8 ? 'high' : scoreForGrade >= 5 ? 'mid' : 'low';
    const gradeLabel = scoreForGrade >= 8 ? '우수' : scoreForGrade >= 5 ? '보통' : '개선 필요';
    const improvement = aiImps[item.id] || (scoreForGrade < 7 ? item.rec : '현 수준 유지');
    return `<tr><td>${i + 1}</td><td><strong>${item.icon} ${item.title}</strong></td>
      <td style="color:var(--accent-purple);font-weight:700;">${aiScore}</td>
      <td><span class="score-badge ${grade}">${gradeLabel}</span></td>
      <td style="font-size:12px;color:var(--text-secondary)">${improvement}</td></tr>`;
  });
  document.getElementById('resultBody').innerHTML = rows.join('');

  // Recommendations
  const savedRecs = c.aiRecommendations || [];
  const allItems = aiEvalItems.map(it => {
    const aiS = hasAi ? c.aiScores[it.id] : null;
    const best = typeof aiS === 'number' ? aiS : 5;
    return { ...it, bestScore: best, aiRec: aiImps[it.id] || it.rec };
  });
  const lowItems = allItems.filter(it => it.bestScore < 7);
  const rd = document.getElementById('recommendations');

  if (savedRecs.length > 0) {
    rd.innerHTML = `<div class="comparison-grid">${savedRecs.map((rec, i) => `<div class="comparison-card"><h4>💡 권장사항 ${i + 1}</h4><p>${rec}</p></div>`).join('')}</div>`;
    if (lowItems.length > 0) {
      rd.innerHTML += `<div style="margin-top:16px;"><h4 style="margin-bottom:12px;font-size:14px;color:var(--text-primary);">⚠️ 개선 필요 항목 (점수 7점 미만)</h4><div class="comparison-grid">${lowItems.slice(0, 6).map(it => `<div class="comparison-card"><h4>${it.icon} ${it.title} <span class="score-badge low" style="font-size:11px;margin-left:8px;">${it.bestScore}점</span></h4><p>${it.aiRec}</p></div>`).join('')}</div></div>`;
    }
  } else if (!lowItems.length) {
    rd.innerHTML = '<div class="comparison-card"><h4>🎉 모든 항목 양호</h4><p>A/B 테스트로 지속 최적화하세요.</p></div>';
  } else {
    rd.innerHTML = `<div class="comparison-grid">${lowItems.slice(0, 6).map(it => `<div class="comparison-card"><h4>${it.icon} ${it.title} <span class="score-badge low" style="font-size:11px;margin-left:8px;">${it.bestScore}점</span></h4><p>${it.aiRec}</p></div>`).join('')}</div>`;
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
      const aiPct = Math.round(Object.values(c.aiScores).reduce((a, b) => a + b, 0) / (aiEvalItems.length * 10) * 100);
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
  const id = parseInt(document.getElementById('resultCampaignSelect').value);
  if (!id) { showToast('⚠️ 삭제할 캠페인 선택'); return; }
  if (!confirm('삭제하시겠습니까?')) return;
  await deleteCampaignFromFirestore(id);
  selectedCampaignCache = null;
  document.getElementById('scoreRing').style.strokeDashoffset = '283';
  document.getElementById('scoreNum').textContent = '—';
  document.getElementById('scoreGrade').textContent = '캠페인을 선택해 주세요';
  document.getElementById('scoreComment').textContent = '';
  document.getElementById('resultSummarySection').style.display = 'none';
  document.getElementById('resultBody').innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">캠페인을 선택해 주세요.</td></tr>';
  showToast('삭제되었습니다.');
}

// ===== Overview =====
function refreshOverview() {
  const campaigns = loadCampaigns(); const n = campaigns.length;
  document.getElementById('ovCampaignCount').textContent = n;
  if (n === 0) {
    ['ovAvgOpen', 'ovAvgConvert', 'ovAvgScore', 'ovAvgStar', 'ovAvgRelevance', 'ovAvgWilling'].forEach(id => document.getElementById(id).textContent = '—');
    document.getElementById('ovFbCount').textContent = '0';
    document.getElementById('barChart').innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:60px 0;">저장된 평가가 없습니다.</p>';
    document.getElementById('overviewBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">평가 없음</td></tr>';
    return;
  }
  document.getElementById('ovAvgOpen').textContent = (campaigns.reduce((a, c) => a + c.openRate, 0) / n).toFixed(1) + '%';
  document.getElementById('ovAvgConvert').textContent = (campaigns.reduce((a, c) => a + c.convertRate, 0) / n).toFixed(1) + '%';
  // Average AI score
  const aiCampaigns = campaigns.filter(c => c.aiScores && Object.keys(c.aiScores).length > 0);
  if (aiCampaigns.length) {
    const avgAi = Math.round(aiCampaigns.reduce((a, c) => a + Math.round(Object.values(c.aiScores).reduce((x, y) => x + y, 0) / (aiEvalItems.length * 10) * 100), 0) / aiCampaigns.length);
    document.getElementById('ovAvgScore').textContent = avgAi + '점';
  } else document.getElementById('ovAvgScore').textContent = '—';

  const fbC = campaigns.filter(c => c.feedback && c.feedback.rating > 0);
  document.getElementById('ovFbCount').textContent = fbC.length;
  if (fbC.length) {
    document.getElementById('ovAvgStar').textContent = (fbC.reduce((a, c) => a + c.feedback.rating, 0) / fbC.length).toFixed(1);
    document.getElementById('ovAvgRelevance').textContent = (fbC.reduce((a, c) => a + c.feedback.relevance, 0) / fbC.length).toFixed(1) + '/10';
    document.getElementById('ovAvgWilling').textContent = (fbC.reduce((a, c) => a + c.feedback.willingness, 0) / fbC.length).toFixed(1) + '/10';
  } else['ovAvgStar', 'ovAvgRelevance', 'ovAvgWilling'].forEach(id => document.getElementById(id).textContent = '—');

  document.getElementById('barChart').innerHTML = campaigns.slice(-8).map(c => `<div class="bar-group"><div class="bar-value">${c.openRate}%</div><div class="bar open" style="height:${Math.max(c.openRate * 3, 8)}px;"></div><div class="bar convert" style="height:${Math.max(c.convertRate * 6, 8)}px;"></div><div class="bar-value">${c.convertRate}%</div><div class="bar-label">${c.name.length > 6 ? c.name.slice(0, 6) + '..' : c.name}</div></div>`).join('');

  document.getElementById('overviewBody').innerHTML = campaigns.map(c => {
    const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0;
    const aiPct = hasAi ? Math.round(Object.values(c.aiScores).reduce((a, b) => a + b, 0) / (aiEvalItems.length * 10) * 100) : null;
    const fb = c.feedback; const hasFb = fb && fb.rating > 0;
    let totalPct = 0;
    if (hasAi && hasFb) totalPct = Math.round(aiPct * 0.7 + ((fb.rating * 2 + fb.relevance + fb.willingness) / 30 * 100) * 0.3);
    else if (hasAi) totalPct = aiPct;
    else if (hasFb) totalPct = Math.round((fb.rating * 2 + fb.relevance + fb.willingness) / 30 * 100);
    return `<tr><td><strong>${c.name}</strong></td><td>${c.sendDate || '—'}</td><td>${c.channel || '—'}</td>
      <td style="color:var(--accent-blue)">${c.openRate}%</td><td style="color:var(--accent-emerald)">${c.convertRate}%</td>
      <td>${hasAi ? `<span class="score-badge ${aiPct >= 75 ? 'high' : aiPct >= 50 ? 'mid' : 'low'}">${aiPct}</span>` : '—'}</td>
      <td>${hasFb ? '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating) : '—'}</td>
      <td><strong>${totalPct || '—'}</strong></td></tr>`;
  }).join('');
}

// ===== Utility =====
function startNewEval() { currentCampaignId = null; aiScores = {}; aiImprovements = {}; aiRecommendations = []; selectedCampaignCache = null; aiCompleted = false; resetAll(); switchTab('campaign'); }
function resetAll() {
  ['campaignName', 'sendDate', 'sendTime', 'sendRecipients', 'targetSegment', 'actualOpenRate', 'actualConvertRate', 'aiMsgBody'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  feedbackRating = 0; setStars(0); document.getElementById('starLabel').textContent = '별점을 선택해 주세요';
  ['fbRelevance', 'fbWillingness'].forEach(id => { document.getElementById(id).value = 5; });
  ['fbRelVal', 'fbWillVal'].forEach(id => { document.getElementById(id).textContent = '5'; });
  ['fbCount', 'fbComment'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  removeAiImage(); document.getElementById('aiResultSection').style.display = 'none';
  // Reset CTA links to default 1 row
  document.getElementById('ctaLinksContainer').innerHTML = '';
  addCtaLink();
  toggleFeedback(false);
  // Disable result button
  const resultBtn = document.getElementById('showResultBtn'); if (resultBtn) { resultBtn.disabled = true; resultBtn.style.opacity = '0.5'; resultBtn.style.cursor = 'not-allowed'; }
  const hint = document.getElementById('resultBtnHint'); if (hint) hint.style.display = 'block';
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

function enableResultButton() {
  aiCompleted = true;
  const btn = document.getElementById('showResultBtn');
  if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.cursor = 'pointer'; }
  const hint = document.getElementById('resultBtnHint');
  if (hint) hint.style.display = 'none';
}
function exportReport() {
  const id = parseInt(document.getElementById('resultCampaignSelect').value); if (!id) { showToast('⚠️ 캠페인 선택'); return; }
  const c = loadCampaigns().find(x => x.id === id); if (!c) return;
  const hasAi = c.aiScores && Object.keys(c.aiScores).length > 0; const fb = c.feedback; const hasFb = fb && fb.rating > 0;
  let r = `메시지 성과 평가 리포트\n${'='.repeat(40)}\n캠페인: ${c.name}\n발송일: ${c.sendDate || '미입력'}\n발송시간: ${c.sendTime || '미입력'}\n발송 인원: ${c.sendRecipients ? c.sendRecipients.toLocaleString() + '명' : '미입력'}\n채널: ${c.channel || '미입력'}\n세그먼트: ${c.segment || '미입력'}\n오픈율: ${c.openRate}% | 전환율: ${c.convertRate}%\n`;
  if (hasAi) { r += `\n[AI 평가 10항목]\n${'-'.repeat(40)}\n`; aiEvalItems.forEach((it, i) => { r += `${i + 1}. ${it.title}: ${c.aiScores[it.id] || '-'}/10\n`; }); }
  if (hasFb) r += `\n[고객 피드백]\n${'-'.repeat(40)}\n별점: ${fb.rating}/5\n관련성: ${fb.relevance}/10\n재수신: ${fb.willingness}/10\n의견: ${fb.comment || '없음'}\n`;
  const blob = new Blob([r], { type: 'text/plain;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `eval_${c.name}_${new Date().toISOString().slice(0, 10)}.txt`; a.click(); showToast('리포트 다운로드 완료!');
}

function showToast(msg) { const t = document.getElementById('toast'); document.getElementById('toastMsg').textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000); }

// ===== GEMINI AI (10 Items) =====
// API Key: 사용자가 직접 입력 → localStorage에만 저장 (소스코드에 절대 포함하지 않음)
const API_KEY_STORAGE = 'gemini_api_key_v4';

function getApiKey() {
  const inputEl = document.getElementById('localApiKey');
  const key = inputEl ? inputEl.value.trim() : '';
  if (key) { localStorage.setItem(API_KEY_STORAGE, key); return key; }
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function initApiKeyField() {
  const saved = localStorage.getItem(API_KEY_STORAGE) || '';
  const inputEl = document.getElementById('localApiKey');
  const statusEl = document.getElementById('apiKeyStatus');
  if (inputEl && saved) {
    inputEl.value = saved;
    if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent-emerald);">✅ 저장된 키 로드됨</span>';
  }
  if (inputEl) {
    inputEl.addEventListener('change', () => {
      const v = inputEl.value.trim();
      if (v) { localStorage.setItem(API_KEY_STORAGE, v); if (statusEl) statusEl.innerHTML = '<span style="color:var(--accent-emerald);">✅ 키 저장됨</span>'; }
      else { localStorage.removeItem(API_KEY_STORAGE); if (statusEl) statusEl.innerHTML = ''; }
    });
  }
}

function toggleLocalKeyVisibility() {
  const inp = document.getElementById('localApiKey');
  const btn = document.getElementById('toggleKeyBtn');
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈 숨기기'; }
  else { inp.type = 'password'; btn.textContent = '👁 보기'; }
}

function handleAiImageUpload(event) { const file = event.target.files[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { showToast('⚠️ 10MB 이하만'); return; } aiImageMimeType = file.type; const reader = new FileReader(); reader.onload = e => { aiImageBase64 = e.target.result.split(',')[1]; document.getElementById('aiPreviewImg').src = e.target.result; document.getElementById('aiUploadPlaceholder').style.display = 'none'; document.getElementById('aiPreviewContainer').style.display = 'block'; document.getElementById('aiUploadArea').classList.add('has-image'); }; reader.readAsDataURL(file); }
function removeAiImage() { aiImageBase64 = null; aiImageMimeType = null; document.getElementById('aiFileInput').value = ''; document.getElementById('aiUploadPlaceholder').style.display = 'block'; document.getElementById('aiPreviewContainer').style.display = 'none'; document.getElementById('aiUploadArea').classList.remove('has-image'); }
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
    // Default: 1 empty row
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

function buildAiPrompt() {
  const body = document.getElementById('aiMsgBody').value.trim();
  const sendDate = document.getElementById('sendDate').value;
  const sendTime = document.getElementById('sendTime').value;
  const sendRecipients = document.getElementById('sendRecipients').value;
  const openRate = document.getElementById('actualOpenRate').value;
  const convertRate = document.getElementById('actualConvertRate').value;
  const segment = document.getElementById('targetSegment').value;
  const campaignName = document.getElementById('campaignName').value.trim();

  // Collect feedback info
  const fbRating = feedbackEnabled ? feedbackRating : 0;
  const fbRelevance = document.getElementById('fbRelevance').value;
  const fbWillingness = document.getElementById('fbWillingness').value;
  const fbComment = document.getElementById('fbComment').value.trim();

  // Build historical campaign data for comparison
  const pastCampaigns = loadCampaigns().filter(c => c.aiScores && Object.keys(c.aiScores).length > 0);
  let historySection = '';
  if (pastCampaigns.length > 0) {
    const recent = pastCampaigns.slice(-10); // last 10 campaigns
    const avgOpen = (recent.reduce((a, c) => a + (c.openRate || 0), 0) / recent.length).toFixed(1);
    const avgConvert = (recent.reduce((a, c) => a + (c.convertRate || 0), 0) / recent.length).toFixed(1);
    const avgAiTotal = Math.round(recent.reduce((a, c) => {
      const total = Object.values(c.aiScores).reduce((x, y) => x + y, 0);
      return a + Math.round(total / (aiEvalItems.length * 10) * 100);
    }, 0) / recent.length);

    // Per-item averages
    const itemAvgs = {};
    aiEvalItems.forEach(item => {
      const scores = recent.map(c => c.aiScores[item.id]).filter(s => typeof s === 'number');
      itemAvgs[item.id] = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
    });

    // Best & worst campaigns
    const sorted = [...recent].sort((a, b) => (b.openRate || 0) - (a.openRate || 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    historySection = `\n## 📊 과거 캠페인 누적 데이터 (최근 ${recent.length}건 기준)
**반드시 이 데이터와 비교하여 이번 캠페인의 상대적 위치를 평가하세요.**
- 평균 오픈율: ${avgOpen}% | 평균 전환율: ${avgConvert}%
- 평균 AI 종합 점수: ${avgAiTotal}점/100
- 항목별 평균 점수:
${aiEvalItems.map(it => `  - ${it.icon} ${it.title}: ${itemAvgs[it.id]}점`).join('\n')}
- 가장 높은 오픈율 캠페인: "${best.name}" (오픈율 ${best.openRate}%, 전환율 ${best.convertRate}%)
  - 메시지 요약: ${(best.msgBody || '').slice(0, 80)}${(best.msgBody || '').length > 80 ? '...' : ''}
- 가장 낮은 오픈율 캠페인: "${worst.name}" (오픈율 ${worst.openRate}%, 전환율 ${worst.convertRate}%)
  - 메시지 요약: ${(worst.msgBody || '').slice(0, 80)}${(worst.msgBody || '').length > 80 ? '...' : ''}

**과거 캠페인과의 비교 분석 시 반드시 포함할 사항:**
- 이번 캠페인의 오픈율/전환율이 평균 대비 높은지/낮은지 구체적 수치로 비교
- 성과가 좋았던 캠페인과 이번 캠페인 메시지의 차이점 분석
- 성과가 낮았던 캠페인과 유사한 패턴이 있는지 경고
- 항목별로 과거 평균 대비 이번 캠페인의 강약점 비교
`;
  }

  let p = `# 역할 및 분석 원칙

당신은 10년 이상 경력의 CRM 마케팅 메시지 전문 분석가입니다.

## ⚠️ 핵심 분석 원칙 (반드시 준수)
1. **절대 일반론 금지**: "제목을 줄이세요", "CTA를 명확히 하세요" 같은 누구나 할 수 있는 일반적 조언은 금지합니다. 반드시 **이 메시지의 실제 문구를 인용**하며 구체적으로 분석하세요.
2. **원문 인용 필수**: 각 항목 분석 시 메시지 본문에서 관련 문구를 직접 따옴표로 인용하고, 그 문구의 강점/약점을 분석하세요.
3. **대안 제시 필수**: 개선 제안 시 "~하세요"가 아니라, 실제 대체 문구/표현을 구체적으로 작성하세요. 예: "현재 '전 제품 할인'을 '스킨케어 베스트 3종 40% OFF'로 변경"
4. **데이터 근거 필수**: 오픈율/전환율 데이터가 있으면 반드시 수치를 인용하며 인과관계를 추론하세요.
${pastCampaigns.length > 0 ? '5. **과거 비교 필수**: 아래 과거 캠페인 데이터와 반드시 비교 분석하세요. 평균 대비 각 항목의 수준을 구체적 수치로 제시하세요.\n' : ''}
## 📋 이번 캠페인 정보
`;

  if (campaignName) p += `- 캠페인명: ${campaignName}\n`;
  if (sendDate) p += `- 발송 일자: ${sendDate}\n`;
  if (sendTime) p += `- 발송 시간: ${sendTime}\n`;
  if (sendRecipients) p += `- 발송 인원: ${parseInt(sendRecipients).toLocaleString()}명\n`;
  if (segment) p += `- 타겟 세그먼트: ${segment}\n`;
  if (openRate) p += `- 실제 오픈율: ${openRate}%\n`;
  if (convertRate) p += `- 실제 전환율: ${convertRate}%\n`;

  // Feedback
  if (fbRating > 0) {
    p += `\n## ⭐ 고객 피드백 데이터\n`;
    p += `- 고객 별점: ${fbRating}/5\n`;
    p += `- 콘텐츠 관련성: ${fbRelevance}/10\n`;
    p += `- 재수신 의향: ${fbWillingness}/10\n`;
    if (fbComment) p += `- 고객 의견: ${fbComment}\n`;
    p += `\n**피드백 분석 지침:** 고객 별점과 오픈율/전환율 간의 상관관계를 분석하세요. 관련성 점수가 낮다면 타겟팅 미스매치일 가능성을, 재수신 의향이 낮다면 콘텐츠 피로도를 추론하세요.\n`;
  }

  // Historical data
  p += historySection;

  // Message content
  p += `\n## ✉️ 분석 대상 메시지 본문\n`;
  p += `\`\`\`\n${body}\n\`\`\`\n`;
  if (aiImageBase64) p += `\n(첨부 이미지도 함께 분석해 주세요)\n`;

  // CTA Links
  const ctaLinks = getCtaLinks();
  if (ctaLinks.length > 0) {
    p += `\n## 🔗 CTA 버튼/링크 정보 (${ctaLinks.length}개)\n`;
    ctaLinks.forEach((link, i) => {
      p += `${i + 1}. 버튼명: "${link.name}" → URL: ${link.url}\n`;
    });
    p += `\n**CTA 분석 지침:**
- 각 CTA 버튼명의 행동 유도 효과를 분석하세요 (동사 사용, 긴급성, 혜택 명시 여부)
- 다중 CTA(${ctaLinks.length}개)가 사용자의 클릭 결정에 미치는 영향(선택 장애 vs 다양한 옵션)을 평가하세요
- 버튼명과 연결 URL의 일관성(약속과 도착지 일치 여부)을 분석하세요
- 랜딩 페이지 연결성 항목 평가 시 이 CTA/URL 정보를 반드시 활용하세요\n`;
  } else {
    p += `\n**참고:** CTA 버튼/링크가 입력되지 않았습니다. 메시지 본문에서 행동 유도 요소를 직접 찾아 분석하세요.\n`;
  }

  // ===== 메시지 통계 자동 계산 =====
  const charCount = body.length;
  const charCountNoSpaces = body.replace(/\s/g, '').length;
  const emojiRegex = /(?:\p{Emoji_Presentation}|\p{Extended_Pictographic}|[\u2600-\u27BF]|[\uFE00-\uFE0F]|[\u200D]|[\uD83C-\uDBFF][\uDC00-\uDFFF])/gu;
  const emojiMatches = body.match(emojiRegex) || [];
  const emojiCount = emojiMatches.length;
  const emojiList = [...new Set(emojiMatches)];
  const personalizationRegex = /\[.*?\]|\{.*?\}|#{.*?}|\$\{.*?\}|%%.*?%%|@.*?@|고객명|회원님|○○|OO|님의/g;
  const personalizationMatches = body.match(personalizationRegex) || [];
  const personalizationCount = personalizationMatches.length;
  const lineCount = body.split('\n').filter(l => l.trim()).length;
  const urlRegex = /https?:\/\/[^\s<>"']+/g;
  const urlsInBody = body.match(urlRegex) || [];

  p += `\n## 📐 메시지 정량 분석 (자동 계산)
| 항목 | 수치 | 비고 |
|---|---|---|
| 📝 총 글자 수 | ${charCount}자 (공백 제외 ${charCountNoSpaces}자) | SMS 90자, MMS 2000자 기준 |
| 📏 줄 수 | ${lineCount}줄 | - |
| 😄 이모지 사용 수 | ${emojiCount}개 | 사용된 이모지: ${emojiList.length > 0 ? emojiList.join(' ') : '없음'} |
| 🧩 개인화 변수 수 | ${personalizationCount}개 | 탐지: ${personalizationMatches.length > 0 ? personalizationMatches.join(', ') : '없음'} |
| 🔗 본문 내 URL 수 | ${urlsInBody.length}개 | ${urlsInBody.length > 0 ? urlsInBody.join(', ').slice(0, 80) : '없음'} |
| 🎯 CTA 버튼 수 | ${ctaLinks.length}개 | ${ctaLinks.length > 0 ? ctaLinks.map(l => '"' + l.name + '"').join(', ') : '없음'} |

**정량 분석 시 반드시 위 수치를 인용하며 평가하세요:**
- 글자 수 ${charCount}자가 해당 채널에 적합한지 판단
- 이모지 ${emojiCount}개의 적정성 (과다 사용은 스팸 인식 위험, 0개는 시각적 매력 부족)
- 개인화 변수 ${personalizationCount}개의 충분성 (최소 1~2개 권장)
- CTA 버튼 ${ctaLinks.length}개와 본문 URL ${urlsInBody.length}개의 적정성
`;

  // Analysis framework
  p += `
## 🔬 10가지 평가 항목별 분석 프레임워크

각 항목을 아래 기준에 따라 **이 메시지에 특화**하여 분석하되, 위 정량 분석 수치를 반드시 활용하세요:

### 1. ✍️ 첫 줄 매력도
- 메시지 첫 줄(미리보기에서 보이는 부분)을 식별하세요
- 첫 15자 내에 핵심 혜택/호기심 요소가 있는지 분석
- 이모지 사용(${emojiCount}개) 여부와 첫 줄에서의 효과 판단
- **구체적으로**: "현재 첫 줄 '___'에서 '___' 부분이 [강점/약점]" 형식으로 분석
- 첫 줄만으로 오픈/클릭을 유도할 수 있는지 판단

### 2. 📄 본문 콘텐츠 품질
- 전체 ${charCount}자, ${lineCount}줄의 메시지 구조(도입-본문-마무리) 분석
- 핵심 정보 전달 순서와 가독성 평가
- 불필요한 반복, 장황한 표현 구체적 지적
- 글자 수 ${charCount}자가 채널 특성 대비 적정한지 평가 (SMS 90자, MMS 2000자, 카카오 1000자 기준)
- 이모지 ${emojiCount}개 사용의 적절성 (가독성 향상 vs 과다 vs 부족)

### 3. 🎯 CTA(행동유도) 효과성
- 입력된 CTA 버튼(${ctaLinks.length}개)과 본문 내 행동 유도 문구를 모두 분석
${ctaLinks.length > 0 ? ctaLinks.map((l, i) => `- CTA ${i + 1}: "${l.name}" → ${l.url} (버튼명의 행동 동사 여부, 긴급성, 혜택 명시 평가)`).join('\n') : '- CTA 버튼이 없습니다. 본문에서 행동 유도 요소를 찾으세요.'}
- CTA 개수(${ctaLinks.length}개)의 적정성: 1개가 최적, 2개 이상은 주의
- 각 CTA 버튼명과 연결 URL의 일관성(약속과 도착지 일치 여부) 평가

### 4. ⏰ 발송 시간 적합성
${sendTime ? `- 실제 발송 시간 ${sendTime}을 기준으로 업종/타겟별 최적 시간대와 비교` : '- 발송 시간 데이터 없음: 메시지 특성에 맞는 최적 시간대 추천'}
${openRate ? `- 오픈율 ${openRate}%와 발송 시간의 상관관계 추론` : ''}
- 요일(${sendDate || '미정'})에 따른 발송 적합성 분석

### 5. 📅 발송 빈도 적절성
${sendRecipients ? `- ${parseInt(sendRecipients || 0).toLocaleString()}명 대상 발송의 적절성` : '- 발송 규모 데이터 없음'}
- 메시지의 내용 특성(프로모션/정보/리텐션)에 맞는 발송 빈도 추천
${pastCampaigns.length > 0 ? `- 과거 캠페인 발송 이력 대비 빈도 적정성 평가` : ''}

### 6. 👥 타겟 세그먼트 정확도
${segment ? `- 타겟 "${segment}"와 메시지 톤/내용/혜택의 일치도 분석` : '- 타겟 정보 없음: 메시지 톤으로 추정되는 타겟과 적합한 세그먼트 제안'}
- 메시지에서 사용된 언어 수준, 호칭, 혜택이 타겟과 맞는지 구체적 분석

### 7. 🧩 개인화 수준
- 현재 개인화 변수 ${personalizationCount}개 탐지됨: ${personalizationMatches.length > 0 ? personalizationMatches.join(', ') : '없음'}
- 개인화 수준이 충분한지 평가 (최소 고객 이름 1개 포함 권장)
- 개인화가 부족하다면 어느 위치에 어떤 변수를 추가할지 구체적 제안 (예: "[고객명]님" 삽입 위치)
- "안녕하세요 OO님, 최근 관심 보신 ___" 형태의 개인화 적용 예시 제공

### 8. 🎁 혜택/리워드 매력도
**이 항목은 실질적으로 고객에게 제공되는 구체적 혜택과 리워드를 중점 평가합니다.**
- 메시지에 제시된 모든 **실물 선물, 포인트, 쿠폰, 무료샘플, 적립금, 캐시백, 무료배송** 등을 찾아 나열
- 금액/수량이 구체적으로 명시되었는지 평가 ("특별 혜택" 같은 모호한 표현 vs "5,000원 쿠폰" 같은 구체적 표현)
- **실질 리워드 유무가 핵심**: 할인만 있는 경우 vs 선물/포인트가 함께 있는 경우, 후자가 더 높은 점수
- 긴급성/희소성 장치 유무 (기간 한정, 수량 한정, 선착순 등)
- 혜택을 받기 위한 조건(구매 금액, 참여 방법 등)의 진입장벽 평가
- 경쟁사 일반적 캠페인 대비 매력도 추정
- **리워드가 전혀 없다면 3점 이하로 엄격하게 평가**

### 9. 📱 채널 적합성
- 메시지 길이(${charCount}자), 이미지 포함 여부, CTA 수(${ctaLinks.length})로 최적 채널 분석
- 짧은 메시지(~90자) → SMS, 중간(~300자) → 카카오/푸시, 긴 메시지(300+자) → 이메일

### 10. 🔗 랜딩 페이지 연결성
- 입력된 CTA 링크(${ctaLinks.length}개)와 본문 내 URL(${urlsInBody.length}개)을 종합 분석
${ctaLinks.length > 0 ? ctaLinks.map((l, i) => `- CTA ${i + 1}: "${l.name}" → ${l.url} (URL 도메인/경로에서 추정되는 랜딩 페이지 내용과 메시지 약속의 일치도)`).join('\n') : '- CTA 링크가 입력되지 않음: 본문 URL이나 행동 유도 요소 기반으로 분석'}
- 클릭 후 예상 사용자 경험과 메시지 내 약속의 일치도 추론

## 출력 형식 (반드시 정확히 지켜주세요)

**첫 번째 JSON 블록** - 10개 항목 점수 (1~10점):
\`\`\`json
{"subject":7,"body":6,"cta":8,"timing":5,"frequency":6,"segment":7,"personalization":4,"offer":8,"channel":7,"landing":5}
\`\`\`

**두 번째 JSON 블록** - 각 항목별 **이 메시지에 특화된** 개선사항 (일반론 금지, 원문 인용 + 정량 수치 인용 필수):
\`\`\`json
{"subject":"구체적 개선사항","body":"구체적 개선사항","cta":"구체적 개선사항","timing":"구체적 개선사항","frequency":"구체적 개선사항","segment":"구체적 개선사항","personalization":"구체적 개선사항","offer":"구체적 개선사항","channel":"구체적 개선사항","landing":"구체적 개선사항"}
\`\`\`

**세 번째 JSON 블록** - 종합 개선 권장사항 (3~5개, 실행 가능한 구체적 액션):
\`\`\`json
["구체적 액션1","구체적 액션2","구체적 액션3"]
\`\`\`

## 상세 분석 리포트 (JSON 블록 이후 작성)

### 📐 정량 지표 요약
| 지표 | 수치 | 평가 |
|---|---|---|
| 글자 수 | ${charCount}자 | (적정/과다/부족 판정) |
| 이모지 | ${emojiCount}개 | (적절/과다/부족 판정 + 효과 분석) |
| 개인화 변수 | ${personalizationCount}개 | (충분/부족 판정) |
| CTA 수 | ${ctaLinks.length}개 | (최적/과다/부족 판정) |

### 📊 종합 점수: __점 / 100점
${pastCampaigns.length > 0 ? '(과거 평균 대비 +/-__점, 상위/하위 __% 수준)' : ''}

### 📋 항목별 상세 분석
**아래 10가지 항목 모두에 대해 빠짐없이, 최소 3문장 이상으로** 작성하세요.
각 항목에서 반드시 **이 메시지의 실제 문구를 인용**하고, **정량 수치를 인용**하고, **구체적 대안 문구를 제시**하세요.
${pastCampaigns.length > 0 ? '**과거 평균 점수와 비교하여 이 항목이 평균 대비 어떤 수준인지 명시**하세요.' : ''}

1. **✍️ 첫 줄 매력도: _점/10**${pastCampaigns.length > 0 ? ' (과거 평균: _점)' : ''}
   - 📌 현재 분석: (메시지 첫 줄의 실제 문구를 인용하며 분석)
   - 💡 개선 제안: (대안 문구를 직접 작성하여 제안)
   ${pastCampaigns.length > 0 ? '- 📊 과거 비교: (과거 성과 좋았던 캠페인의 첫 줄 패턴과 비교)' : ''}

2~10번 항목도 동일하게 **원문 인용 + 정량 수치 인용 + 구체적 대안 + ${pastCampaigns.length > 0 ? '과거 비교 + ' : ''}** 형식으로 작성

### 🔍 성과 상관관계 분석
${openRate || convertRate ? `
**실제 성과 데이터 기반 인과관계 추론:**
- 오픈율 ${openRate || '미입력'}%에 영향을 미친 핵심 요인 3가지 (첫 줄 매력도, 이모지 ${emojiCount}개 효과, 개인화 등과 연결)
- 전환율 ${convertRate || '미입력'}%에 영향을 미친 핵심 요인 3가지 (CTA ${ctaLinks.length}개, 혜택/리워드, 랜딩 연결성과 연결)
- 오픈율 → 전환율 전환 과정에서의 이탈 원인 추정
${pastCampaigns.length > 0 ? '- 과거 캠페인 대비 성과 트렌드 분석 (개선/악화 추세)' : ''}` : '- 성과 데이터가 없으므로 메시지 내용과 정량 분석 기반으로 예상 오픈율/전환율을 추정하세요.'}

${pastCampaigns.length > 0 ? `### 📈 과거 캠페인 비교 분석
- 이번 캠페인 vs 과거 평균: 각 항목별 상승/하락 포인트
- 과거 가장 성과 좋았던 캠페인과 이번 캠페인의 핵심 차이점 3가지
- 과거 데이터에서 발견되는 성공 패턴/실패 패턴과 이번 캠페인의 부합도
` : ''}

### 💡 종합 개선 권장사항 (3~5개)
- 각각 번호를 매기고, **실제 실행 가능한 구체적 액션**으로 작성
- "~를 고려하세요" 같은 모호한 표현 대신, "A를 B로 변경하세요" 형태로 작성
- 우선순위 순서로 배열 (가장 효과 큰 것 먼저)

### ⭐ 잘된 점 (2~3가지)
- 이 메시지에서 **실제로 잘한 부분**을 구체적 문구 인용과 함께 설명
`;
  return p;
}

async function runAiEvaluation() {
  const msgBody = document.getElementById('aiMsgBody').value.trim();
  if (!msgBody) { showToast('⚠️ 메시지 본문 필요'); return; }
  const apiKey = getApiKey();
  if (!apiKey) { showToast('⚠️ Gemini API 키를 입력해 주세요.'); document.getElementById('localApiKey').focus(); return; }
  const btn = document.getElementById('aiRunBtn'); btn.disabled = true; btn.textContent = '⏳ 분석 중...';
  document.getElementById('aiResultSection').style.display = 'block'; document.getElementById('aiLoading').style.display = 'flex';
  document.getElementById('aiResultCard').style.display = 'none'; document.getElementById('aiScoreSummary').style.display = 'none';
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-001'];
  try {
    const parts = [{ text: buildAiPrompt() }]; if (aiImageBase64) parts.push({ inline_data: { mime_type: aiImageMimeType, data: aiImageBase64 } });
    let text = null, usedModel = '';
    for (const model of models) {
      try {
        document.querySelector('.ai-loading-text').textContent = `${model} 모델로 분석 중...`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts }], generationConfig: { temperature: 0.7, maxOutputTokens: 8192 } })
        });
        if (res.ok) { const data = await res.json(); text = data.candidates?.[0]?.content?.parts?.[0]?.text; if (text) { usedModel = model; break; } }
        else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`${model} failed:`, errData.error || res.status);
          if (res.status === 400) { throw new Error(errData.error?.message || '잘못된 요청입니다. API 키를 확인해 주세요.'); }
          if (res.status === 401 || res.status === 403) { throw new Error('API 키가 유효하지 않습니다. 올바른 Gemini API 키를 입력해 주세요.'); }
          if (res.status !== 429 && res.status !== 503) throw new Error(errData.error?.message || `API 오류 (${res.status})`);
        }
      } catch (modelErr) { if (modelErr.message && !modelErr.message.includes('429') && !modelErr.message.includes('503') && !modelErr.message.includes('quota')) throw modelErr; console.warn(`${model} 실패, 다음 모델...`); }
    }
    if (!text) throw new Error('모든 모델 할당량 초과. 잠시 후 다시 시도해 주세요.');
    const jsonBlocks = [...text.matchAll(/```json\s*\n?([\s\S]*?)\n?\s*```/g)];
    if (jsonBlocks.length >= 1) { try { const parsed = JSON.parse(jsonBlocks[0][1]); aiScores = {}; aiEvalItems.forEach(item => { aiScores[item.id] = Math.max(1, Math.min(10, parseInt(parsed[item.id]) || 5)); }); renderAiScoreGrid(); document.getElementById('aiScoreSummary').style.display = 'block'; } catch (e) { console.warn('score parse fail', e); } }
    if (jsonBlocks.length >= 2) { try { const parsedImps = JSON.parse(jsonBlocks[1][1]); aiImprovements = {}; aiEvalItems.forEach(item => { if (parsedImps[item.id]) aiImprovements[item.id] = parsedImps[item.id]; }); } catch (e) { console.warn('improvements parse fail', e); } }
    if (jsonBlocks.length >= 3) { try { const parsedRecs = JSON.parse(jsonBlocks[2][1]); if (Array.isArray(parsedRecs)) { aiRecommendations = parsedRecs; } } catch (e) { console.warn('recommendations parse fail', e); } }
    document.getElementById('aiLoading').style.display = 'none'; document.getElementById('aiResultCard').style.display = 'block';
    document.getElementById('aiResultTime').textContent = new Date().toLocaleString('ko-KR') + ' · ' + usedModel;
    const reportHtml = renderAiReportContent(text);
    document.getElementById('aiResultContent').innerHTML = reportHtml;
    // Auto-save after AI evaluation
    saveCampaignData();
    enableResultButton();
    showToast('🤖 AI 평가 완료! 종합 결과에서 확인하세요.');
  } catch (error) {
    document.getElementById('aiLoading').style.display = 'none'; document.getElementById('aiResultCard').style.display = 'block';
    document.getElementById('aiResultContent').innerHTML = `<div style="color:var(--accent-rose);padding:20px;text-align:center;"><p style="font-size:18px;margin-bottom:8px;">⚠️ 오류</p><p>${error.message}</p>${error.message.includes('API 키') ? '<p style="margin-top:12px;font-size:13px;color:var(--text-muted);">💡 <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent-blue);">Google AI Studio</a>에서 유효한 API 키를 발급받으세요.</p>' : ''}</div>`;
  } finally { btn.disabled = false; btn.textContent = '🤖 AI 분석 실행 및 저장'; }
}

function renderAiReportContent(rawText) {
  // 1. Remove ALL code blocks (```json ... ```, ``` ... ```, etc.)
  let cleanText = rawText.replace(/```[\w]*\s*\n?[\s\S]*?\n?\s*```/g, '');

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

  // 5. Convert to HTML
  let html = markdownToHtml(cleanText);

  // 6. Prepend score summary grid if scores exist
  const hasScores = Object.keys(aiScores).length > 0;
  if (hasScores) {
    let summaryHtml = `<div style="margin-bottom:24px;padding:16px;background:rgba(139,92,246,0.05);border:1px solid rgba(139,92,246,0.15);border-radius:var(--radius-md);">`;
    summaryHtml += `<h4 style="margin-bottom:12px;color:var(--text-primary);">📋 10가지 항목 요약</h4>`;
    summaryHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:8px;">`;
    aiEvalItems.forEach((item) => {
      const score = aiScores[item.id] || 5;
      const improvement = aiImprovements[item.id] || item.rec;
      const color = score >= 8 ? 'var(--accent-emerald)' : score >= 5 ? 'var(--accent-amber)' : 'var(--accent-rose)';
      const grade = score >= 8 ? '우수' : score >= 5 ? '보통' : '개선 필요';
      summaryHtml += `<div style="padding:10px 14px;background:rgba(15,23,42,0.4);border-radius:8px;border:1px solid var(--border-glass);">`;
      summaryHtml += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">`;
      summaryHtml += `<span style="font-size:13px;font-weight:700;">${item.icon} ${item.title}</span>`;
      summaryHtml += `<span style="color:${color};font-weight:800;font-size:16px;">${score}<span style="font-size:11px;color:var(--text-muted);">/10</span></span>`;
      summaryHtml += `</div>`;
      summaryHtml += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">등급: <span style="color:${color};font-weight:600;">${grade}</span></div>`;
      summaryHtml += `<div style="font-size:12px;color:var(--text-secondary);line-height:1.5;">💡 ${improvement}</div>`;
      summaryHtml += `</div>`;
    });
    summaryHtml += `</div></div>`;
    html = summaryHtml + html;
  }
  return html;
}

function renderAiScoreGrid() {
  const totalAi = Object.values(aiScores).reduce((a, b) => a + b, 0); const aiPct = Math.round(totalAi / (aiEvalItems.length * 10) * 100);
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

  // 6. Quoted text highlight
  html = html.replace(/"([^"]{2,80})"/g, '<span style="color:var(--accent-blue);font-weight:600;">"$1"</span>');

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

function buildGeneratePrompt(serviceType, content) {
  const commonContext = `# 역할
당신은 초록우산 어린이재단(www.chorogusan.or.kr)의 카카오톡 알림톡 메시지 카피라이터입니다.
초록우산은 아이들과 어려운 사람들을 돕는 아동복지 전문기관이며, 후원자분들에게 정기적으로 메시지를 발송합니다.

# 핵심 규칙
1. 모든 문안은 반드시 아래 4단계 구조를 유지하세요:
   - 1) 오프닝: 후원자 호칭("OOO 후원자님")으로 시작하며, 관심을 끄는 질문이나 인사
   - 2) 화제 제기: 핵심 이슈나 놀라운 사실, 질문을 던져 읽기를 유도
   - 3) 실제 내용 및 제안: 구체적 수치/사례/혜택 등 핵심 전달 내용
   - 4) 행동 촉구: 링크 클릭, 참여, 관심 등 구체적 행동 유도 CTA
2. 카카오톡 알림톡 형식에 맞게 적절한 길이(200~400자 내외)를 유지하세요.
3. 초록우산의 따뜻하고 진정성 있는 톤을 유지하세요.
4. 이모지를 자연스럽게 활용하되 과하지 않게 사용하세요.
5. 각 문안은 서로 확실히 다른 스타일과 접근법을 사용하세요.
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
- 오프닝 예시: 수치를 활용한 질문형 ("~을 알고 계시나요?")

## 유형 2: 감정터치중심형
- 핵심: 수혜 아동/청년의 실제 이야기나 감정을 생생하게 전달하여 공감 유도
- 특징: 직접 인용("포기하지 않고 해냈어요"), 스토리텔링, 감정적 묘사
- 톤: 따뜻하고 감성적이며 진심이 느껴지는
- 오프닝 예시: 수혜자의 말이나 감정을 인용

## 유형 3: 행동강조중심형  
- 핵심: 후원의 실제 변화를 보여주고, 지속적 관심/추가 행동을 강하게 촉구
- 특징: "지금 바로", "후원자님 덕분에", 변화 전후 대비, 긴박감
- 톤: 적극적이고 행동 지향적이며 긴급한
- 오프닝 예시: 변화의 순간을 포착하거나 긴급한 상황 제시

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
- 오프닝 예시: 마감 임박/한정 수량 경고

## 유형 2: 우대프라이빗형
- 핵심: 후원자만의 특별한 자격/혜택임을 강조하여 VIP 감성 자극
- 특징: "후원자님만을 위한", "특별 초대", "우선 예매", "감사의 마음을 담아"
- 톤: 품격 있고 프라이빗하며 감사와 존중이 느껴지는
- 오프닝 예시: 특별한 감사/초대 형식

## 유형 3: 화제가치강조형
- 핵심: 콘텐츠 자체의 트렌드, 화제성, 흥미를 강조하여 자연스러운 관심 유도
- 특징: "요즘 가장 핫한", "SNS에서 화제인", "꼭 봐야 할" 등 화제성 강조
- 톤: 트렌디하고 흥미롭고 호기심 자극
- 오프닝 예시: 화제의 콘텐츠/트렌드 소개

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

정확히 아래 JSON 형식으로 3개의 문안을 출력하세요. JSON 블록 외에는 아무것도 출력하지 마세요.

\`\`\`json
[
  {
    "typeName": "유형 이름",
    "opening": "1) 오프닝 텍스트",
    "topic": "2) 화제 제기 텍스트",
    "content": "3) 실제 내용 및 제안 텍스트",
    "cta": "4) 행동 촉구 텍스트"
  },
  {
    "typeName": "유형 이름",
    "opening": "오프닝 텍스트",
    "topic": "화제 제기 텍스트",
    "content": "실제 내용 및 제안 텍스트",
    "cta": "행동 촉구 텍스트"
  },
  {
    "typeName": "유형 이름",
    "opening": "오프닝 텍스트",
    "topic": "화제 제기 텍스트",
    "content": "실제 내용 및 제안 텍스트",
    "cta": "행동 촉구 텍스트"
  }
]
\`\`\`

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

  const apiKey = getApiKey();
  if (!apiKey) {
    showToast('⚠️ 캠페인 정보 탭에서 Gemini API 키를 먼저 입력해 주세요.');
    return;
  }

  const btn = document.getElementById('genRunBtn');
  btn.disabled = true;
  btn.textContent = '⏳ AI가 문안을 생성 중...';

  const resultSection = document.getElementById('genResultSection');
  resultSection.style.display = 'block';
  document.getElementById('genLoading').style.display = 'flex';
  document.getElementById('genResultCards').innerHTML = '';

  const prompt = buildGeneratePrompt(serviceType, content);
  const models = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-001'];

  try {
    let text = null, usedModel = '';
    for (const model of models) {
      try {
        document.querySelector('#genLoading .ai-loading-text').textContent = `${model} 모델로 생성 중...`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9, maxOutputTokens: 4096 }
          })
        });
        if (res.ok) {
          const data = await res.json();
          text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) { usedModel = model; break; }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`${model} failed:`, errData.error || res.status);
          if (res.status === 400) throw new Error(errData.error?.message || '잘못된 요청입니다.');
          if (res.status === 401 || res.status === 403) throw new Error('API 키가 유효하지 않습니다.');
          if (res.status !== 429 && res.status !== 503) throw new Error(errData.error?.message || `API 오류 (${res.status})`);
        }
      } catch (modelErr) {
        if (modelErr.message && !modelErr.message.includes('429') && !modelErr.message.includes('503') && !modelErr.message.includes('quota')) throw modelErr;
        console.warn(`${model} 실패, 다음 모델...`);
      }
    }
    if (!text) throw new Error('모든 모델 할당량 초과. 잠시 후 다시 시도해 주세요.');

    // Parse JSON from response
    const jsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?\s*```/);
    if (!jsonMatch) throw new Error('AI 응답에서 문안을 파싱할 수 없습니다. 다시 시도해 주세요.');

    const messages = JSON.parse(jsonMatch[1]);
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
    return `
      <div class="gen-result-card" style="border-top:3px solid ${cfg.color};">
        <div class="gen-card-header">
          <h4>
            <span class="gen-card-number">${i + 1}</span>
            ${cfg.icon} ${msg.typeName || `유형 ${i + 1}`}
          </h4>
          <span class="gen-type-tag ${cfg.tagClass}">${msg.typeName || `유형 ${i + 1}`}</span>
        </div>
        <div class="gen-card-body">
          <div class="gen-msg-section">
            <div class="gen-section-label opening">1) 오프닝</div>
            <div class="gen-msg-text">${escapeHtml(msg.opening || '')}</div>
          </div>
          <div class="gen-msg-section">
            <div class="gen-section-label topic">2) 화제 제기</div>
            <div class="gen-msg-text">${escapeHtml(msg.topic || '')}</div>
          </div>
          <div class="gen-msg-section">
            <div class="gen-section-label content">3) 실제 내용 및 제안</div>
            <div class="gen-msg-text">${escapeHtml(msg.content || '')}</div>
          </div>
          <div class="gen-msg-section">
            <div class="gen-section-label cta">4) 행동 촉구</div>
            <div class="gen-msg-text">${escapeHtml(msg.cta || '')}</div>
          </div>
        </div>
        <div class="gen-card-footer">
          <button class="gen-copy-btn" onclick="copyGeneratedMessage(${i})" id="genCopyBtn${i}">
            📋 전체 복사
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
  const fullText = [msg.opening, msg.topic, msg.content, msg.cta].filter(Boolean).join('\n\n');

  navigator.clipboard.writeText(fullText).then(() => {
    const btn = document.getElementById(`genCopyBtn${index}`);
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = '✅ 복사됨!';
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = '📋 전체 복사';
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

