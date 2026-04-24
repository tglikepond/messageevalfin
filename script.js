// ===== 10 AI Evaluation Items (Full Analysis) =====
const aiEvalItems = [
  { id:'subject', title:'제목(Subject) 매력도', category:'콘텐츠', icon:'✍️',
    tip:'좋은 제목은 15자 이내, 핵심 혜택 선두 배치', rec:'제목을 15자 이내로 줄이고 핵심 혜택을 앞에 배치하세요' },
  { id:'body', title:'본문 콘텐츠 품질', category:'콘텐츠', icon:'📄',
    tip:'핵심 메시지는 첫 2줄 이내, 이미지 비율 40% 이하', rec:'본문 길이를 100자 이내로 줄이고 이미지 비율을 조정하세요' },
  { id:'cta', title:'CTA(행동유도) 효과성', category:'콘텐츠', icon:'🎯',
    tip:'CTA는 1개로 집중, 구체적 혜택 명시', rec:'CTA를 1개로 통일하고 구체적 혜택을 명시하세요' },
  { id:'timing', title:'발송 시간 적합성', category:'발송 전략', icon:'⏰',
    tip:'평일 오전 10-11시, 점심 12-13시가 최적', rec:'오전 10-11시 또는 점심 12-13시 발송을 테스트하세요' },
  { id:'frequency', title:'발송 빈도 적절성', category:'발송 전략', icon:'📅',
    tip:'주 1-2회가 적정, 수신거부율 0.5% 이하 유지', rec:'발송 빈도를 주 1-2회로 조정하세요' },
  { id:'segment', title:'타겟 세그먼트 정확도', category:'타겟팅', icon:'👥',
    tip:'RFM 분석 기반 세그먼트 최소 5개 이상 구분', rec:'RFM 분석을 활용한 세분화를 강화하세요' },
  { id:'personalization', title:'개인화 수준', category:'타겟팅', icon:'🧩',
    tip:'이름 + 최근 관심 상품 조합이 가장 효과적', rec:'고객명 + 관심 상품 기반 개인화를 적용하세요' },
  { id:'offer', title:'혜택/오퍼 매력도', category:'프로모션', icon:'🎁',
    tip:'%할인이 금액보다 체감 효과 높음', rec:'할인율을 %로 표시하고 사용 조건을 간소화하세요' },
  { id:'channel', title:'채널 적합성', category:'발송 전략', icon:'📱',
    tip:'긴급→SMS/푸시, 상세→이메일, 리치→카카오', rec:'메시지 목적에 맞는 채널을 재검토하세요' },
  { id:'landing', title:'랜딩 페이지 연결성', category:'콘텐츠', icon:'🔗',
    tip:'메시지-랜딩 간 일치, 3클릭 이내 전환', rec:'랜딩 페이지와 메시지 간 일관성을 강화하세요' }
];

// ===== Storage =====
const STORAGE_KEY = 'msg_eval_campaigns_v4';
function loadCampaigns() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; } }
function saveCampaigns(data) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }

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
  refreshOverview();
  refreshResultSelector();
  updateBadge();
});

function updateBadge() { document.getElementById('savedCountBadge').textContent = `📊 저장된 평가: ${loadCampaigns().length}건`; }

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
  const labels = ['','😞 1점','🙁 2점','😐 3점','😊 4점','🤩 5점'];
  document.querySelectorAll('.feedback-star').forEach(star => {
    star.addEventListener('click', () => { feedbackRating = parseInt(star.dataset.value); setStars(feedbackRating); document.getElementById('starLabel').textContent = labels[feedbackRating]; });
  });
}
function setStars(r) { document.querySelectorAll('.feedback-star').forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= r)); }

// ===== Save Campaign Data =====
function saveCampaignData() {
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
    aiScores: { ...aiScores },
    aiImprovements: { ...aiImprovements },
    aiRecommendations: [...aiRecommendations],
    aiReport: document.getElementById('aiResultContent')?.innerHTML || '',
    feedback: feedbackEnabled ? {
      rating: feedbackRating,
      relevance: parseInt(document.getElementById('fbRelevance').value)||5,
      willingness: parseInt(document.getElementById('fbWillingness').value)||5,
      count: parseInt(document.getElementById('fbCount').value)||0,
      comment: document.getElementById('fbComment').value
    } : { rating: 0, relevance: 5, willingness: 5, count: 0, comment: '' },
    createdAt: new Date().toLocaleDateString('ko-KR')
  };
  const campaigns = loadCampaigns();
  const idx = campaigns.findIndex(c => c.id === campaign.id);
  if (idx >= 0) campaigns[idx] = campaign;
  else campaigns.push(campaign);
  saveCampaigns(campaigns);
  currentCampaignId = campaign.id;
  updateBadge();
  return true;
}

// ===== Navigation Actions =====
function saveAndShowResult() {
  if (!saveCampaignData()) return;
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
    campaigns.map(c => `<option value="${c.id}">${c.name} (${c.sendDate||c.createdAt})</option>`).join('');
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
  if (hasAi) aiPct = Math.round(Object.values(c.aiScores).reduce((a,b)=>a+b,0)/(aiEvalItems.length*10)*100);
  const hasFb = c.feedback && c.feedback.rating > 0;
  let fbPct = 0;
  if (hasFb) fbPct = Math.round(((c.feedback.rating*2)+c.feedback.relevance+c.feedback.willingness)/30*100);

  let totalPct, breakdown;
  if (hasAi && hasFb) { totalPct = Math.round(aiPct*0.7+fbPct*0.3); breakdown = `AI ${aiPct}×70% + 피드백 ${fbPct}×30%`; }
  else if (hasAi) { totalPct = aiPct; breakdown = `AI 평가 점수`; }
  else if (hasFb) { totalPct = fbPct; breakdown = `피드백 점수만 반영`; }
  else { totalPct = 0; breakdown = '아직 평가되지 않음'; }

  // Score circle
  const ring = document.getElementById('scoreRing');
  ring.style.strokeDashoffset = '283';
  setTimeout(() => { ring.style.strokeDashoffset = 283-(283*totalPct/100); }, 100);
  document.getElementById('scoreNum').textContent = totalPct;
  document.getElementById('scoreGrade').textContent = totalPct>=75?'🏆 우수':totalPct>=50?'📈 보통':totalPct>0?'⚠️ 개선 필요':'—';
  document.getElementById('scoreComment').innerHTML = (totalPct>=75?'매우 우수한 캠페인입니다!':totalPct>=50?'양호하나 일부 개선이 필요합니다.':totalPct>0?'여러 항목에서 개선이 필요합니다.':'AI 분석을 실행해 주세요.') + `<br><span style="font-size:12px;color:var(--text-muted);">가중치: ${breakdown}</span>`;

  // Summary cards
  document.getElementById('resultSummarySection').style.display = 'block';

  // Campaign info
  document.getElementById('resultCampaignSummary').innerHTML = `
    <strong>캠페인명:</strong> ${c.name}<br>
    <strong>발송일:</strong> ${c.sendDate||'미입력'}<br>
    <strong>발송시간:</strong> ${c.sendTime||'미입력'}<br>
    <strong>발송 인원:</strong> ${c.sendRecipients?c.sendRecipients.toLocaleString()+'명':'미입력'}<br>
    <strong>채널:</strong> ${c.channel||'미입력'}<br>
    <strong>세그먼트:</strong> ${c.segment||'미입력'}<br>
    <strong>오픈율:</strong> <span style="color:var(--accent-blue)">${c.openRate}%</span> · 
    <strong>전환율:</strong> <span style="color:var(--accent-emerald)">${c.convertRate}%</span>`;

  // AI summary
  if (hasAi) {
    document.getElementById('resultAiSummary').innerHTML = `
      <strong>AI 종합:</strong> <span style="color:var(--accent-purple)">${aiPct}점</span>/100<br>
      ${aiEvalItems.map(it => `${it.icon} ${it.title}: <strong>${c.aiScores[it.id]||'-'}</strong>`).join('<br>')}`;
  } else {
    document.getElementById('resultAiSummary').innerHTML = '<span style="color:var(--text-muted)">AI 평가 미실행</span>';
  }

  // Feedback summary
  if (hasFb) {
    document.getElementById('resultFbSummary').innerHTML = `
      <strong>별점:</strong> ${'★'.repeat(c.feedback.rating)}${'☆'.repeat(5-c.feedback.rating)} (${c.feedback.rating}/5)<br>
      <strong>관련성:</strong> ${c.feedback.relevance}/10<br>
      <strong>재수신:</strong> ${c.feedback.willingness}/10<br>
      <strong>수집 건수:</strong> ${c.feedback.count||'미입력'}건
      ${c.feedback.comment ? '<br><strong>의견:</strong> '+c.feedback.comment.slice(0,60)+(c.feedback.comment.length>60?'...':'') : ''}`;
  } else {
    document.getElementById('resultFbSummary').innerHTML = '<span style="color:var(--text-muted)">피드백 미입력</span>';
  }

  // Result table (AI 10 items)
  const aiImps = c.aiImprovements || {};
  const rows = aiEvalItems.map((item, i) => {
    const aiScore = hasAi ? (c.aiScores[item.id]||'-') : '-';
    const scoreForGrade = typeof aiScore === 'number' ? aiScore : 5;
    const grade = scoreForGrade>=8 ? 'high' : scoreForGrade>=5 ? 'mid' : 'low';
    const gradeLabel = scoreForGrade>=8 ? '우수' : scoreForGrade>=5 ? '보통' : '개선 필요';
    const improvement = aiImps[item.id] || (scoreForGrade<7 ? item.rec : '현 수준 유지');
    return `<tr><td>${i+1}</td><td><strong>${item.icon} ${item.title}</strong></td>
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
    rd.innerHTML = `<div class="comparison-grid">${savedRecs.map((rec, i) => `<div class="comparison-card"><h4>💡 권장사항 ${i+1}</h4><p>${rec}</p></div>`).join('')}</div>`;
    if (lowItems.length > 0) {
      rd.innerHTML += `<div style="margin-top:16px;"><h4 style="margin-bottom:12px;font-size:14px;color:var(--text-primary);">⚠️ 개선 필요 항목 (점수 7점 미만)</h4><div class="comparison-grid">${lowItems.slice(0,6).map(it => `<div class="comparison-card"><h4>${it.icon} ${it.title} <span class="score-badge low" style="font-size:11px;margin-left:8px;">${it.bestScore}점</span></h4><p>${it.aiRec}</p></div>`).join('')}</div></div>`;
    }
  } else if (!lowItems.length) {
    rd.innerHTML = '<div class="comparison-card"><h4>🎉 모든 항목 양호</h4><p>A/B 테스트로 지속 최적화하세요.</p></div>';
  } else {
    rd.innerHTML = `<div class="comparison-grid">${lowItems.slice(0,6).map(it => `<div class="comparison-card"><h4>${it.icon} ${it.title} <span class="score-badge low" style="font-size:11px;margin-left:8px;">${it.bestScore}점</span></h4><p>${it.aiRec}</p></div>`).join('')}</div>`;
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
      const aiPct = Math.round(Object.values(c.aiScores).reduce((a,b)=>a+b,0)/(aiEvalItems.length*10)*100);
      body.innerHTML = `
        <h4 style="margin-bottom:12px;">📊 AI 종합 점수: <span style="color:var(--accent-purple)">${aiPct}점</span> / 100점</h4>
        <table class="result-table"><thead><tr><th>No.</th><th>항목</th><th>AI 점수</th><th>등급</th><th>AI 개선사항</th></tr></thead><tbody>
          ${aiEvalItems.map((it,i) => {
            const ai = c.aiScores[it.id]||'-';
            const g = typeof ai==='number'?(ai>=8?'high':ai>=5?'mid':'low'):'mid';
            const improvement = aiImps[it.id] || it.rec;
            return `<tr><td>${i+1}</td><td>${it.icon} ${it.title}</td>
              <td style="color:var(--accent-purple);font-weight:700;">${ai}</td>
              <td><span class="score-badge ${g}">${typeof ai==='number'?(ai>=8?'우수':ai>=5?'보통':'개선 필요'):'-'}</span></td>
              <td style="font-size:12px;color:var(--text-secondary);max-width:200px;">${improvement}</td></tr>`;
          }).join('')}
        </tbody></table>
        ${c.aiReport ? `<div style="margin-top:20px;padding:16px;background:rgba(15,23,42,0.5);border-radius:var(--radius-md);border:1px solid var(--border-glass);">
          <h4 style="margin-bottom:8px;">📋 AI 분석 리포트 전문</h4>
          <div style="font-size:13px;color:var(--text-secondary);line-height:1.8;">${c.aiReport}</div></div>` : ''}`;
    }
  } else if (type === 'feedback') {
    const fb = c.feedback; title.textContent = '⭐ 고객 피드백 세부 내용';
    if (!fb || !fb.rating) { body.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:40px;">피드백 미입력</p>'; }
    else {
      const fbPct = Math.round(((fb.rating*2)+fb.relevance+fb.willingness)/30*100);
      body.innerHTML = `
        <h4 style="margin-bottom:16px;">📊 피드백 종합: <span style="color:var(--accent-amber)">${fbPct}점</span> / 100점</h4>
        <div class="stats-row" style="margin-bottom:20px;">
          <div class="stat-card"><div class="stat-value amber">${'★'.repeat(fb.rating)}${'☆'.repeat(5-fb.rating)}</div><div class="stat-label">별점 (${fb.rating}/5)</div></div>
          <div class="stat-card"><div class="stat-value blue">${fb.relevance}/10</div><div class="stat-label">관련성</div></div>
          <div class="stat-card"><div class="stat-value emerald">${fb.willingness}/10</div><div class="stat-label">재수신 의향</div></div>
          <div class="stat-card"><div class="stat-value purple">${fb.count||'미입력'}</div><div class="stat-label">수집 건수</div></div>
        </div>
        ${fb.comment?`<div style="padding:16px;background:rgba(15,23,42,0.5);border-radius:var(--radius-md);border:1px solid var(--border-glass);">
          <h4 style="margin-bottom:8px;">💬 주요 고객 의견</h4><p style="font-size:14px;color:var(--text-secondary);line-height:1.8;white-space:pre-wrap;">${fb.comment}</p></div>`:''}`;
    }
  }
  overlay.classList.add('show');
}

function closeModal(e) { if (e && e.target !== e.currentTarget) return; document.getElementById('modalOverlay').classList.remove('show'); }

function deleteCampaign() {
  const id = parseInt(document.getElementById('resultCampaignSelect').value);
  if (!id) { showToast('⚠️ 삭제할 캠페인 선택'); return; }
  if (!confirm('삭제하시겠습니까?')) return;
  saveCampaigns(loadCampaigns().filter(c=>c.id!==id)); selectedCampaignCache=null;
  refreshResultSelector(); updateBadge();
  document.getElementById('scoreRing').style.strokeDashoffset='283';
  document.getElementById('scoreNum').textContent='—';
  document.getElementById('scoreGrade').textContent='캠페인을 선택해 주세요';
  document.getElementById('scoreComment').textContent='';
  document.getElementById('resultSummarySection').style.display='none';
  document.getElementById('resultBody').innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:40px;">캠페인을 선택해 주세요.</td></tr>';
  showToast('삭제되었습니다.');
}

// ===== Overview =====
function refreshOverview() {
  const campaigns = loadCampaigns(); const n = campaigns.length;
  document.getElementById('ovCampaignCount').textContent = n;
  if (n === 0) {
    ['ovAvgOpen','ovAvgConvert','ovAvgScore','ovAvgStar','ovAvgRelevance','ovAvgWilling'].forEach(id=>document.getElementById(id).textContent='—');
    document.getElementById('ovFbCount').textContent = '0';
    document.getElementById('barChart').innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:60px 0;">저장된 평가가 없습니다.</p>';
    document.getElementById('overviewBody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;">평가 없음</td></tr>';
    return;
  }
  document.getElementById('ovAvgOpen').textContent = (campaigns.reduce((a,c)=>a+c.openRate,0)/n).toFixed(1)+'%';
  document.getElementById('ovAvgConvert').textContent = (campaigns.reduce((a,c)=>a+c.convertRate,0)/n).toFixed(1)+'%';
  // Average AI score
  const aiCampaigns = campaigns.filter(c=>c.aiScores&&Object.keys(c.aiScores).length>0);
  if (aiCampaigns.length) {
    const avgAi = Math.round(aiCampaigns.reduce((a,c)=>a+Math.round(Object.values(c.aiScores).reduce((x,y)=>x+y,0)/(aiEvalItems.length*10)*100),0)/aiCampaigns.length);
    document.getElementById('ovAvgScore').textContent = avgAi+'점';
  } else document.getElementById('ovAvgScore').textContent = '—';

  const fbC = campaigns.filter(c=>c.feedback&&c.feedback.rating>0);
  document.getElementById('ovFbCount').textContent = fbC.length;
  if (fbC.length) {
    document.getElementById('ovAvgStar').textContent = (fbC.reduce((a,c)=>a+c.feedback.rating,0)/fbC.length).toFixed(1);
    document.getElementById('ovAvgRelevance').textContent = (fbC.reduce((a,c)=>a+c.feedback.relevance,0)/fbC.length).toFixed(1)+'/10';
    document.getElementById('ovAvgWilling').textContent = (fbC.reduce((a,c)=>a+c.feedback.willingness,0)/fbC.length).toFixed(1)+'/10';
  } else ['ovAvgStar','ovAvgRelevance','ovAvgWilling'].forEach(id=>document.getElementById(id).textContent='—');

  document.getElementById('barChart').innerHTML = campaigns.slice(-8).map(c=>`<div class="bar-group"><div class="bar-value">${c.openRate}%</div><div class="bar open" style="height:${Math.max(c.openRate*3,8)}px;"></div><div class="bar convert" style="height:${Math.max(c.convertRate*6,8)}px;"></div><div class="bar-value">${c.convertRate}%</div><div class="bar-label">${c.name.length>6?c.name.slice(0,6)+'..':c.name}</div></div>`).join('');

  document.getElementById('overviewBody').innerHTML = campaigns.map(c=>{
    const hasAi=c.aiScores&&Object.keys(c.aiScores).length>0;
    const aiPct=hasAi?Math.round(Object.values(c.aiScores).reduce((a,b)=>a+b,0)/(aiEvalItems.length*10)*100):null;
    const fb=c.feedback;const hasFb=fb&&fb.rating>0;
    let totalPct=0;
    if(hasAi&&hasFb)totalPct=Math.round(aiPct*0.7+((fb.rating*2+fb.relevance+fb.willingness)/30*100)*0.3);
    else if(hasAi)totalPct=aiPct;
    else if(hasFb)totalPct=Math.round((fb.rating*2+fb.relevance+fb.willingness)/30*100);
    return `<tr><td><strong>${c.name}</strong></td><td>${c.sendDate||'—'}</td><td>${c.channel||'—'}</td>
      <td style="color:var(--accent-blue)">${c.openRate}%</td><td style="color:var(--accent-emerald)">${c.convertRate}%</td>
      <td>${hasAi?`<span class="score-badge ${aiPct>=75?'high':aiPct>=50?'mid':'low'}">${aiPct}</span>`:'—'}</td>
      <td>${hasFb?'★'.repeat(fb.rating)+'☆'.repeat(5-fb.rating):'—'}</td>
      <td><strong>${totalPct||'—'}</strong></td></tr>`;
  }).join('');
}

// ===== Utility =====
function startNewEval(){currentCampaignId=null;aiScores={};aiImprovements={};aiRecommendations=[];selectedCampaignCache=null;aiCompleted=false;resetAll();switchTab('campaign');}
function resetAll(){
  ['campaignName','sendDate','sendTime','sendRecipients','targetSegment','actualOpenRate','actualConvertRate','aiMsgBody'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  feedbackRating=0;setStars(0);document.getElementById('starLabel').textContent='별점을 선택해 주세요';
  ['fbRelevance','fbWillingness'].forEach(id=>{document.getElementById(id).value=5;});
  ['fbRelVal','fbWillVal'].forEach(id=>{document.getElementById(id).textContent='5';});
  ['fbCount','fbComment'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  removeAiImage();document.getElementById('aiResultSection').style.display='none';
  toggleFeedback(false);
  // Disable result button
  const resultBtn=document.getElementById('showResultBtn'); if(resultBtn){resultBtn.disabled=true;resultBtn.style.opacity='0.5';resultBtn.style.cursor='not-allowed';}
  const hint=document.getElementById('resultBtnHint'); if(hint)hint.style.display='block';
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
function exportReport(){
  const id=parseInt(document.getElementById('resultCampaignSelect').value);if(!id){showToast('⚠️ 캠페인 선택');return;}
  const c=loadCampaigns().find(x=>x.id===id);if(!c)return;
  const hasAi=c.aiScores&&Object.keys(c.aiScores).length>0;const fb=c.feedback;const hasFb=fb&&fb.rating>0;
  let r=`메시지 성과 평가 리포트\n${'='.repeat(40)}\n캠페인: ${c.name}\n발송일: ${c.sendDate||'미입력'}\n발송시간: ${c.sendTime||'미입력'}\n발송 인원: ${c.sendRecipients?c.sendRecipients.toLocaleString()+'명':'미입력'}\n채널: ${c.channel||'미입력'}\n세그먼트: ${c.segment||'미입력'}\n오픈율: ${c.openRate}% | 전환율: ${c.convertRate}%\n`;
  if(hasAi){r+=`\n[AI 평가 10항목]\n${'-'.repeat(40)}\n`;aiEvalItems.forEach((it,i)=>{r+=`${i+1}. ${it.title}: ${c.aiScores[it.id]||'-'}/10\n`;});}
  if(hasFb)r+=`\n[고객 피드백]\n${'-'.repeat(40)}\n별점: ${fb.rating}/5\n관련성: ${fb.relevance}/10\n재수신: ${fb.willingness}/10\n의견: ${fb.comment||'없음'}\n`;
  const blob=new Blob([r],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`eval_${c.name}_${new Date().toISOString().slice(0,10)}.txt`;a.click();showToast('리포트 다운로드 완료!');
}

function showToast(msg){const t=document.getElementById('toast');document.getElementById('toastMsg').textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),3000);}

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

function handleAiImageUpload(event){const file=event.target.files[0];if(!file)return;if(file.size>10*1024*1024){showToast('⚠️ 10MB 이하만');return;}aiImageMimeType=file.type;const reader=new FileReader();reader.onload=e=>{aiImageBase64=e.target.result.split(',')[1];document.getElementById('aiPreviewImg').src=e.target.result;document.getElementById('aiUploadPlaceholder').style.display='none';document.getElementById('aiPreviewContainer').style.display='block';document.getElementById('aiUploadArea').classList.add('has-image');};reader.readAsDataURL(file);}
function removeAiImage(){aiImageBase64=null;aiImageMimeType=null;document.getElementById('aiFileInput').value='';document.getElementById('aiUploadPlaceholder').style.display='block';document.getElementById('aiPreviewContainer').style.display='none';document.getElementById('aiUploadArea').classList.remove('has-image');}
function initDragDrop(){const area=document.getElementById('aiUploadArea');if(!area)return;area.addEventListener('dragover',e=>{e.preventDefault();area.style.borderColor='#8b5cf6';});area.addEventListener('dragleave',()=>{area.style.borderColor='';});area.addEventListener('drop',e=>{e.preventDefault();area.style.borderColor='';const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/')){const dt=new DataTransfer();dt.items.add(f);document.getElementById('aiFileInput').files=dt.files;handleAiImageUpload({target:{files:[f]}});}});}

function buildAiPrompt(){
  const body=document.getElementById('aiMsgBody').value.trim();
  const sendDate=document.getElementById('sendDate').value;
  const sendTime=document.getElementById('sendTime').value;
  const sendRecipients=document.getElementById('sendRecipients').value;
  const openRate=document.getElementById('actualOpenRate').value;
  const convertRate=document.getElementById('actualConvertRate').value;
  const segment=document.getElementById('targetSegment').value;
  const campaignName=document.getElementById('campaignName').value.trim();

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
    const avgOpen = (recent.reduce((a,c) => a + (c.openRate||0), 0) / recent.length).toFixed(1);
    const avgConvert = (recent.reduce((a,c) => a + (c.convertRate||0), 0) / recent.length).toFixed(1);
    const avgAiTotal = Math.round(recent.reduce((a,c) => {
      const total = Object.values(c.aiScores).reduce((x,y)=>x+y,0);
      return a + Math.round(total / (aiEvalItems.length * 10) * 100);
    }, 0) / recent.length);

    // Per-item averages
    const itemAvgs = {};
    aiEvalItems.forEach(item => {
      const scores = recent.map(c => c.aiScores[item.id]).filter(s => typeof s === 'number');
      itemAvgs[item.id] = scores.length > 0 ? (scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1) : '-';
    });

    // Best & worst campaigns
    const sorted = [...recent].sort((a,b) => (b.openRate||0) - (a.openRate||0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    historySection = `\n## 📊 과거 캠페인 누적 데이터 (최근 ${recent.length}건 기준)
**반드시 이 데이터와 비교하여 이번 캠페인의 상대적 위치를 평가하세요.**
- 평균 오픈율: ${avgOpen}% | 평균 전환율: ${avgConvert}%
- 평균 AI 종합 점수: ${avgAiTotal}점/100
- 항목별 평균 점수:
${aiEvalItems.map(it => `  - ${it.icon} ${it.title}: ${itemAvgs[it.id]}점`).join('\n')}
- 가장 높은 오픈율 캠페인: "${best.name}" (오픈율 ${best.openRate}%, 전환율 ${best.convertRate}%)
  - 메시지 요약: ${(best.msgBody||'').slice(0,80)}${(best.msgBody||'').length>80?'...':''}
- 가장 낮은 오픈율 캠페인: "${worst.name}" (오픈율 ${worst.openRate}%, 전환율 ${worst.convertRate}%)
  - 메시지 요약: ${(worst.msgBody||'').slice(0,80)}${(worst.msgBody||'').length>80?'...':''}

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

  if(campaignName) p += `- 캠페인명: ${campaignName}\n`;
  if(sendDate) p += `- 발송 일자: ${sendDate}\n`;
  if(sendTime) p += `- 발송 시간: ${sendTime}\n`;
  if(sendRecipients) p += `- 발송 인원: ${parseInt(sendRecipients).toLocaleString()}명\n`;
  if(segment) p += `- 타겟 세그먼트: ${segment}\n`;
  if(openRate) p += `- 실제 오픈율: ${openRate}%\n`;
  if(convertRate) p += `- 실제 전환율: ${convertRate}%\n`;

  // Feedback
  if(fbRating > 0) {
    p += `\n## ⭐ 고객 피드백 데이터\n`;
    p += `- 고객 별점: ${fbRating}/5\n`;
    p += `- 콘텐츠 관련성: ${fbRelevance}/10\n`;
    p += `- 재수신 의향: ${fbWillingness}/10\n`;
    if(fbComment) p += `- 고객 의견: ${fbComment}\n`;
    p += `\n**피드백 분석 지침:** 고객 별점과 오픈율/전환율 간의 상관관계를 분석하세요. 관련성 점수가 낮다면 타겟팅 미스매치일 가능성을, 재수신 의향이 낮다면 콘텐츠 피로도를 추론하세요.\n`;
  }

  // Historical data
  p += historySection;

  // Message content
  p += `\n## ✉️ 분석 대상 메시지 본문\n`;
  p += `\`\`\`\n${body}\n\`\`\`\n`;
  if(aiImageBase64) p += `\n(첨부 이미지도 함께 분석해 주세요)\n`;

  // Analysis framework
  p += `
## 🔬 10가지 평가 항목별 분석 프레임워크

각 항목을 아래 기준에 따라 **이 메시지에 특화**하여 분석하세요:

### 1. ✍️ 제목(Subject) 매력도
- 메시지 첫 줄 또는 제목 역할을 하는 부분을 식별하세요
- 첫 15자 내에 핵심 혜택/호기심 요소가 있는지 분석
- 이모지/특수문자 사용의 효과 판단
- **구체적으로**: "현재 첫 줄 '___'에서 '___' 부분이 [강점/약점]" 형식으로 분석

### 2. 📄 본문 콘텐츠 품질
- 전체 메시지의 구조(도입-본문-마무리) 분석
- 핵심 정보 전달 순서와 가독성 평가
- 불필요한 반복, 장황한 표현 구체적 지적
- 전체 글자 수와 적정 길이 대비 평가

### 3. 🎯 CTA(행동유도) 효과성
- 메시지에서 행동을 유도하는 문구를 모두 찾아 나열
- CTA 개수(1개가 최적), 위치, 긴급성 유무 분석
- CTA 문구의 구체성과 행동 동사 사용 여부 평가
- 다중 CTA가 있다면 어떤 것에 집중해야 하는지 제안

### 4. ⏰ 발송 시간 적합성
${sendTime ? `- 실제 발송 시간 ${sendTime}을 기준으로 업종/타겟별 최적 시간대와 비교` : '- 발송 시간 데이터 없음: 메시지 특성에 맞는 최적 시간대 추천'}
${openRate ? `- 오픈율 ${openRate}%와 발송 시간의 상관관계 추론` : ''}
- 요일(${sendDate || '미정'})에 따른 발송 적합성 분석

### 5. 📅 발송 빈도 적절성
${sendRecipients ? `- ${parseInt(sendRecipients||0).toLocaleString()}명 대상 발송의 적절성` : '- 발송 규모 데이터 없음'}
- 메시지의 내용 특성(프로모션/정보/리텐션)에 맞는 발송 빈도 추천
${pastCampaigns.length > 0 ? `- 과거 캠페인 발송 이력 대비 빈도 적정성 평가` : ''}

### 6. 👥 타겟 세그먼트 정확도
${segment ? `- 타겟 "${segment}"와 메시지 톤/내용/혜택의 일치도 분석` : '- 타겟 정보 없음: 메시지 톤으로 추정되는 타겟과 적합한 세그먼트 제안'}
- 메시지에서 사용된 언어 수준, 호칭, 혜택이 타겟과 맞는지 구체적 분석

### 7. 🧩 개인화 수준
- 메시지에 [이름], {고객명} 등 개인화 변수가 있는지 확인
- 개인화가 없다면 어느 위치에 어떤 개인화 요소를 추가할지 구체적 제안
- "안녕하세요 OO님, 최근 관심 보신 ___" 형태의 예시 제공

### 8. 🎁 혜택/오퍼 매력도
- 메시지에 제시된 모든 혜택/오퍼를 나열 (할인율, 쿠폰, 무료배송 등)
- 혜택의 구체성(퍼센트 vs 금액 vs 모호한 표현) 분석
- 긴급성/희소성 장치 유무 분석 (기간 한정, 수량 한정 등)
- 경쟁사 대비 매력도 추정

### 9. 📱 채널 적합성
- 메시지의 길이, 형식, 미디어 포함 여부로 추정되는 최적 채널 분석
- 짧은 메시지 → SMS/푸시, 긴 메시지 → 이메일/카카오 등 적합도 판단

### 10. 🔗 랜딩 페이지 연결성
- 메시지에 URL, 링크, "자세히 보기" 등 랜딩 유도 요소가 있는지 확인
- CTA와 랜딩 페이지의 연결 일관성 추론
- 클릭 후 예상 경험과 메시지 약속의 일치도 분석

## 출력 형식 (반드시 정확히 지켜주세요)

**첫 번째 JSON 블록** - 10개 항목 점수 (1~10점):
\`\`\`json
{"subject":7,"body":6,"cta":8,"timing":5,"frequency":6,"segment":7,"personalization":4,"offer":8,"channel":7,"landing":5}
\`\`\`

**두 번째 JSON 블록** - 각 항목별 **이 메시지에 특화된** 개선사항 (일반론 금지, 메시지 원문 기반 구체적 제안):
\`\`\`json
{"subject":"구체적 개선사항","body":"구체적 개선사항","cta":"구체적 개선사항","timing":"구체적 개선사항","frequency":"구체적 개선사항","segment":"구체적 개선사항","personalization":"구체적 개선사항","offer":"구체적 개선사항","channel":"구체적 개선사항","landing":"구체적 개선사항"}
\`\`\`

**세 번째 JSON 블록** - 종합 개선 권장사항 (3~5개, 실행 가능한 구체적 액션):
\`\`\`json
["구체적 액션1","구체적 액션2","구체적 액션3"]
\`\`\`

## 상세 분석 리포트 (JSON 블록 이후 작성)

### 📊 종합 점수: __점 / 100점
${pastCampaigns.length > 0 ? '(과거 평균 대비 +/-__점, 상위/하위 __% 수준)' : ''}

### 📋 항목별 상세 분석
**아래 10가지 항목 모두에 대해 빠짐없이, 최소 3문장 이상으로** 작성하세요.
각 항목에서 반드시 **이 메시지의 실제 문구를 인용**하고, **구체적 대안 문구를 제시**하세요.
${pastCampaigns.length > 0 ? '**과거 평균 점수와 비교하여 이 항목이 평균 대비 어떤 수준인지 명시**하세요.' : ''}

1. **✍️ 제목(Subject) 매력도: _점/10**${pastCampaigns.length>0?' (과거 평균: _점)':''}
   - 📌 현재 분석: (메시지 첫 줄의 실제 문구를 인용하며 분석)
   - 💡 개선 제안: (대안 문구를 직접 작성하여 제안)
   ${pastCampaigns.length>0?'- 📊 과거 비교: (과거 성과 좋았던 캠페인의 제목 패턴과 비교)':''}

2~10번 항목도 동일하게 **원문 인용 + 구체적 대안 + ${pastCampaigns.length>0?'과거 비교 + ':''}** 형식으로 작성

### 🔍 성과 상관관계 분석
${openRate || convertRate ? `
**실제 성과 데이터 기반 인과관계 추론:**
- 오픈율 ${openRate||'미입력'}%에 영향을 미친 핵심 요인 3가지 (메시지 요소와 연결)
- 전환율 ${convertRate||'미입력'}%에 영향을 미친 핵심 요인 3가지 (CTA, 혜택, 랜딩과 연결)
- 오픈율 → 전환율 전환 과정에서의 이탈 원인 추정
${pastCampaigns.length>0?'- 과거 캠페인 대비 성과 트렌드 분석 (개선/악화 추세)':''}` : '- 성과 데이터가 없으므로 메시지 내용 기반으로 예상 오픈율/전환율을 추정하세요.'}

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

async function runAiEvaluation(){
  const msgBody=document.getElementById('aiMsgBody').value.trim();
  if(!msgBody){showToast('⚠️ 메시지 본문 필요');return;}
  const apiKey=getApiKey();
  if(!apiKey){showToast('⚠️ Gemini API 키를 입력해 주세요.');document.getElementById('localApiKey').focus();return;}
  const btn=document.getElementById('aiRunBtn');btn.disabled=true;btn.textContent='⏳ 분석 중...';
  document.getElementById('aiResultSection').style.display='block';document.getElementById('aiLoading').style.display='flex';
  document.getElementById('aiResultCard').style.display='none';document.getElementById('aiScoreSummary').style.display='none';
  const models=['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.0-flash-001'];
  try{
    const parts=[{text:buildAiPrompt()}];if(aiImageBase64)parts.push({inline_data:{mime_type:aiImageMimeType,data:aiImageBase64}});
    let text=null,usedModel='';
    for(const model of models){
      try{
        document.querySelector('.ai-loading-text').textContent=`${model} 모델로 분석 중...`;
        const url=`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res=await fetch(url,{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({contents:[{parts}],generationConfig:{temperature:0.7,maxOutputTokens:8192}})
        });
        if(res.ok){const data=await res.json();text=data.candidates?.[0]?.content?.parts?.[0]?.text;if(text){usedModel=model;break;}}
        else{
          const errData=await res.json().catch(()=>({}));
          console.warn(`${model} failed:`,errData.error||res.status);
          if(res.status===400){throw new Error(errData.error?.message||'잘못된 요청입니다. API 키를 확인해 주세요.');}
          if(res.status===401||res.status===403){throw new Error('API 키가 유효하지 않습니다. 올바른 Gemini API 키를 입력해 주세요.');}
          if(res.status!==429&&res.status!==503)throw new Error(errData.error?.message||`API 오류 (${res.status})`);
        }
      }catch(modelErr){if(modelErr.message&&!modelErr.message.includes('429')&&!modelErr.message.includes('503')&&!modelErr.message.includes('quota'))throw modelErr;console.warn(`${model} 실패, 다음 모델...`);}
    }
    if(!text)throw new Error('모든 모델 할당량 초과. 잠시 후 다시 시도해 주세요.');
    const jsonBlocks = [...text.matchAll(/```json\s*\n?([\s\S]*?)\n?\s*```/g)];
    if(jsonBlocks.length>=1){try{const parsed=JSON.parse(jsonBlocks[0][1]);aiScores={};aiEvalItems.forEach(item=>{aiScores[item.id]=Math.max(1,Math.min(10,parseInt(parsed[item.id])||5));});renderAiScoreGrid();document.getElementById('aiScoreSummary').style.display='block';}catch(e){console.warn('score parse fail',e);}}
    if(jsonBlocks.length>=2){try{const parsedImps=JSON.parse(jsonBlocks[1][1]);aiImprovements={};aiEvalItems.forEach(item=>{if(parsedImps[item.id])aiImprovements[item.id]=parsedImps[item.id];});}catch(e){console.warn('improvements parse fail',e);}}
    if(jsonBlocks.length>=3){try{const parsedRecs=JSON.parse(jsonBlocks[2][1]);if(Array.isArray(parsedRecs)){aiRecommendations=parsedRecs;}}catch(e){console.warn('recommendations parse fail',e);}}
    document.getElementById('aiLoading').style.display='none';document.getElementById('aiResultCard').style.display='block';
    document.getElementById('aiResultTime').textContent=new Date().toLocaleString('ko-KR')+' · '+usedModel;
    const reportHtml = renderAiReportContent(text);
    document.getElementById('aiResultContent').innerHTML = reportHtml;
    // Auto-save after AI evaluation
    saveCampaignData();
    enableResultButton();
    showToast('🤖 AI 평가 완료! 종합 결과에서 확인하세요.');
  }catch(error){
    document.getElementById('aiLoading').style.display='none';document.getElementById('aiResultCard').style.display='block';
    document.getElementById('aiResultContent').innerHTML=`<div style="color:var(--accent-rose);padding:20px;text-align:center;"><p style="font-size:18px;margin-bottom:8px;">⚠️ 오류</p><p>${error.message}</p>${error.message.includes('API 키')?'<p style="margin-top:12px;font-size:13px;color:var(--text-muted);">💡 <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent-blue);">Google AI Studio</a>에서 유효한 API 키를 발급받으세요.</p>':''}</div>`;
  }finally{btn.disabled=false;btn.textContent='🤖 AI 분석 실행 및 저장';}
}

function renderAiReportContent(rawText) {
  const cleanText = rawText.replace(/```json[\s\S]*?```\n?/g, '');
  let html = markdownToHtml(cleanText);
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

function renderAiScoreGrid(){
  const totalAi=Object.values(aiScores).reduce((a,b)=>a+b,0);const aiPct=Math.round(totalAi/(aiEvalItems.length*10)*100);
  document.getElementById('aiScoreGrid').innerHTML=aiEvalItems.map(item=>{
    const s=aiScores[item.id]||5;
    const color=s>=8?'var(--accent-emerald)':s>=5?'var(--accent-amber)':'var(--accent-rose)';
    const improvement = aiImprovements[item.id] || item.rec;
    return `<div class="ai-score-item" style="flex-direction:column;align-items:stretch;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div class="score-num" style="color:${color}">${s}</div>
        <div class="score-info"><div class="score-name">${item.icon} ${item.title}</div>
          <div class="score-bar"><div class="score-bar-fill" style="width:${s*10}%;background:${color};"></div></div>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-secondary);margin-top:6px;padding-left:48px;line-height:1.5;">💡 ${improvement}</div>
    </div>`;
  }).join('')+`<div class="ai-score-item" style="border-color:rgba(139,92,246,0.3);background:rgba(139,92,246,0.06);"><div class="score-num" style="font-size:28px;color:var(--accent-purple);">${aiPct}</div><div class="score-info"><div class="score-name" style="font-size:14px;font-weight:700;">종합 /100</div></div></div>`;
}

function markdownToHtml(md){return '<p>'+md.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/^### (.+)$/gm,'<h4>$1</h4>').replace(/^## (.+)$/gm,'<h3>$1</h3>').replace(/^# (.+)$/gm,'<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code style="background:rgba(139,92,246,0.1);padding:2px 6px;border-radius:4px;font-size:13px;">$1</code>').replace(/^- (.+)$/gm,'<li>$1</li>').replace(/^(\d+)\. (.+)$/gm,'<li>$2</li>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>')+'</p>';}
