// 云函数：submitAnswer —— 判题 + 写入答题记录/错题本/掌握度
// 入参：{ answers: [{ questionId, userAnswer, timeSpent }] }
// 返回：{ results: [{ questionId, isCorrect, score, question, userAnswer }] }
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 判题：返回 { isCorrect, score, pending? }
function judge(question, userAnswer) {
  const type = question.type;
  const ans = question.answer || {};

  if (type === 'single' || type === 'multiple') {
    const correct = (ans.keys || []).slice().sort().join(',');
    const user = ((userAnswer && userAnswer.keys) || []).slice().sort().join(',');
    const isCorrect = correct === user;
    return { isCorrect, score: isCorrect ? 100 : 0 };
  }

  if (type === 'fill') {
    const blanks = ans.blanks || [];
    const parts = ((userAnswer && userAnswer.text) || '')
      .split(/[,，;；、\s]+/)
      .map(s => s.trim())
      .filter(Boolean);
    let hit = 0;
    blanks.forEach((acc, i) => {
      const accepted = Array.isArray(acc) ? acc : [acc];
      const u = (parts[i] || '').toLowerCase();
      if (accepted.some(a => String(a).trim().toLowerCase() === u)) hit++;
    });
    const total = blanks.length;
    const isCorrect = total > 0 && hit === total;
    const score = total > 0 ? Math.round((hit / total) * 100) : 0;
    return { isCorrect, score };
  }

  // 解答题：关键词命中给分；无关键词则标记待批改
  const keywords = ans.keywords || [];
  if (!keywords.length) {
    return { isCorrect: null, score: null, pending: true };
  }
  const text = (userAnswer && userAnswer.text) || '';
  let hit = 0;
  keywords.forEach(k => { if (text.indexOf(k) >= 0) hit++; });
  const score = Math.round((hit / keywords.length) * 100);
  return { isCorrect: score >= 60, score };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const answers = event.answers || [];
  const results = [];

  for (let item of answers) {
    if (!item || !item.questionId) continue;
    const qRes = await db.collection('questions').doc(item.questionId).get().catch(() => null);
    const question = qRes && qRes.data;
    if (!question) continue;

    // 解答题：归一化 userAnswer，images 仅作附件存储、不参与判分
    let ua = item.userAnswer || {};
    if (question.type === 'solution') {
      ua = {
        text: typeof ua.text === 'string' ? ua.text : '',
        images: Array.isArray(ua.images) ? ua.images.filter(x => typeof x === 'string') : []
      };
      item = { ...item, userAnswer: ua };
    }

    const grading = judge(question, item.userAnswer);
    const isCorrect = grading.isCorrect;

    // 1) 答题记录
    await db.collection('answer_records').add({
      data: {
        userId: OPENID,
        questionId: item.questionId,
        subjectId: question.subjectId,
        knowledgePointId: question.knowledgePointId,
        difficulty: question.difficulty,
        type: question.type,
        userAnswer: item.userAnswer || {},
        isCorrect: isCorrect === true,
        score: grading.score,
        timeSpent: item.timeSpent || 0,
        stepRevealed: 0,
        answeredAt: db.serverDate()
      }
    });

    // 2) 错题本
    if (isCorrect === false) {
      const exist = await db.collection('mistake_book')
        .where({ userId: OPENID, questionId: item.questionId }).get();
      if (exist.data.length) {
        await db.collection('mistake_book').doc(exist.data[0]._id).update({
          data: { wrongCount: _.inc(1), lastWrongAt: db.serverDate(), status: 'open' }
        });
      } else {
        await db.collection('mistake_book').add({
          data: {
            userId: OPENID,
            questionId: item.questionId,
            subjectId: question.subjectId,
            knowledgePointId: question.knowledgePointId,
            wrongCount: 1,
            lastWrongAt: db.serverDate(),
            status: 'open',
            note: ''
          }
        });
      }
    } else if (isCorrect === true) {
      // 答对：若存在未掌握的错题记录则标记为已掌握
      const exist = await db.collection('mistake_book')
        .where({ userId: OPENID, questionId: item.questionId, status: 'open' }).get();
      if (exist.data.length) {
        await db.collection('mistake_book').doc(exist.data[0]._id).update({ data: { status: 'resolved' } });
      }
    }

    // 3) 知识点掌握度
    const m = await db.collection('mastery')
      .where({ userId: OPENID, knowledgePointId: question.knowledgePointId }).get();
    const addCorrect = isCorrect === true ? 1 : 0;
    if (m.data.length) {
      const doc = m.data[0];
      const total = (doc.totalCount || 0) + 1;
      const correct = (doc.correctCount || 0) + addCorrect;
      await db.collection('mastery').doc(doc._id).update({
        data: {
          totalCount: total,
          correctCount: correct,
          masteryRate: total ? correct / total : 0,
          lastPracticedAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
    } else {
      await db.collection('mastery').add({
        data: {
          userId: OPENID,
          subjectId: question.subjectId,
          knowledgePointId: question.knowledgePointId,
          totalCount: 1,
          correctCount: addCorrect,
          masteryRate: addCorrect,
          lastPracticedAt: db.serverDate(),
          updatedAt: db.serverDate()
        }
      });
    }

    results.push({
      questionId: item.questionId,
      isCorrect,
      score: grading.score,
      pending: !!grading.pending,
      question,
      userAnswer: item.userAnswer || {}
    });
  }

  return { results };
};
