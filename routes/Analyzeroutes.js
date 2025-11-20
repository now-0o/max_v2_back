const express = require('express');
const router = express.Router();
const { 
  ExamScore, 
  Department, 
  School, 
  DepartmentScoreRule,
  DepartmentSubjectConfig,
  GradeConversion, 
  CollegeMaxScore,
  UserChoice,
  Subject,
  SubjectOption
} = require('../models');

// 입시 분석 API
router.post('/', async (req, res) => {
  try {
    const { userId, mode } = req.body;

    if (!userId || !mode) {
      return res.status(400).json({ 
        success: false,
        message: 'userId와 mode는 필수입니다',
        count: 0,
        results: []
      });
    }

    // 1. 사용자 성적 조회
    const examScore = await ExamScore.findOne({
      where: { userId, mode }
    });

    if (!examScore) {
      return res.status(200).json({ 
        success: false,
        message: '입력한 성적이 없습니다. 먼저 수능 성적을 입력해주세요.',
        count: 0,
        results: []
      });
    }

    const rawScores = typeof examScore.scores === 'string' 
      ? JSON.parse(examScore.scores) 
      : examScore.scores;

    if (!rawScores || Object.keys(rawScores).length === 0) {
      return res.status(200).json({ 
        success: false,
        message: '입력한 성적이 없습니다. 먼저 수능 성적을 입력해주세요.',
        count: 0,
        results: []
      });
    }

    console.log('\n📊 원본 성적 데이터:', JSON.stringify(rawScores, null, 2));

    // 성적 데이터 변환 (Subject ID → korean, math 등)
    const userScores = await convertScoresToStandardFormat(rawScores);
    console.log('\n🔄 변환된 성적 데이터:', JSON.stringify(userScores, null, 2));

    if (!userScores || Object.keys(userScores).length === 0) {
      return res.status(200).json({ 
        success: false,
        message: '성적 데이터 변환에 실패했습니다. 성적을 다시 확인해주세요.',
        count: 0,
        results: []
      });
    }

    // 2. 사용자가 선택한 학과만 조회
    const userChoices = await UserChoice.findAll({
      where: { userId },
      include: [
        {
          model: Department,
          include: [
            {
              model: School,
              attributes: ['name']
            }
          ]
        }
      ]
    });

    if (userChoices.length === 0) {
      return res.status(200).json({ 
        success: false,
        message: '선택한 학과가 없습니다. 먼저 관심 학과를 선택해주세요.',
        count: 0,
        results: []
      });
    }

    const departments = userChoices.map(choice => choice.Department);

    // 3. CollegeMaxScore 조회 (2025년 기준)
    const maxScores = await CollegeMaxScore.findAll({
      where: { year: 2025 }
    });

    const maxScoreMap = {};
    maxScores.forEach(ms => {
      maxScoreMap[ms.subject_code] = ms.max_standard_score;
    });

    console.log('\n📈 최고점 데이터:', maxScoreMap);

    // 기본값 설정
    if (!maxScoreMap.KOR_MAX) maxScoreMap.KOR_MAX = 150;
    if (!maxScoreMap.MATH_MAX) maxScoreMap.MATH_MAX = 150;
    if (!maxScoreMap.INQUIRY_MAX) maxScoreMap.INQUIRY_MAX = 70;

    // 4. 각 학과별로 환산점수 계산
    const results = [];

    console.log(`\n🎯 총 ${departments.length}개 학과 계산 시작`);

    for (const dept of departments) {
      try {
        const convertedScore = await calculateDepartmentScore(
          dept,
          userScores,
          maxScoreMap
        );

        if (convertedScore !== null) {
          results.push({
            departmentId: dept.id,
            schoolName: dept.School.name,
            departmentName: dept.name,
            division: dept.division,
            region: dept.region,
            convertedScore: convertedScore,
            totalScore: dept.total_score || 1000,
            percentage: ((convertedScore / (dept.total_score || 1000)) * 100).toFixed(2),
            cutlineScore: dept.cutline_score || null,
            isPassed: dept.cutline_score ? convertedScore >= dept.cutline_score : null
          });
          console.log(`✅ 학과 ${dept.id} 추가됨 - 점수: ${convertedScore}`);
        } else {
          console.log(`⚠️  학과 ${dept.id} null 반환으로 제외됨`);
        }
      } catch (error) {
        console.error(`❌ 학과 ${dept.id} 계산 오류:`, error);
      }
    }

    // 5. 점수순 정렬
    results.sort((a, b) => b.convertedScore - a.convertedScore);

    // 결과가 없을 때
    if (results.length === 0) {
      return res.json({
        success: false,
        message: '선택한 학과의 점수를 계산할 수 없습니다. 학과 설정을 확인해주세요.',
        count: 0,
        results: []
      });
    }

    res.json({
      success: true,
      count: results.length,
      results
    });

  } catch (error) {
    console.error('입시 분석 오류:', error);
    res.status(500).json({ 
      success: false,
      message: '입시 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      error: error.message 
    });
  }
});

// 성적 데이터 변환 (Subject ID → korean, math 등)
async function convertScoresToStandardFormat(rawScores) {
  const converted = {};

  // Subject 테이블 조회
  const subjects = await Subject.findAll();
  const subjectMap = {};
  subjects.forEach(s => {
    subjectMap[s.id] = s.name;
  });

  console.log('\n🔍 Subject 매핑:', subjectMap);

  for (const [subjectId, scoreData] of Object.entries(rawScores)) {
    const subjectName = subjectMap[subjectId];
    
    if (!subjectName) {
      console.log(`⚠️  Subject ID ${subjectId}에 해당하는 과목명 없음`);
      continue;
    }

    console.log(`\n📝 처리 중: Subject ${subjectId} → ${subjectName}`);

    const lowerName = subjectName.toLowerCase();
    
    if (lowerName.includes('국어') || lowerName === 'korean') {
      converted.korean = convertScoreData(scoreData.default);
      converted.korean.subjectId = parseInt(subjectId);
      console.log(`  ✅ 국어 변환:`, converted.korean);
    } 
    else if (lowerName.includes('수학') || lowerName === 'math') {
      converted.math = convertScoreData(scoreData.default);
      converted.math.subjectId = parseInt(subjectId);
      console.log(`  ✅ 수학 변환:`, converted.math);
    } 
    else if (lowerName.includes('영어') || lowerName === 'english') {
      converted.english = convertScoreData(scoreData.default);
      converted.english.subjectId = parseInt(subjectId);
      console.log(`  ✅ 영어 변환:`, converted.english);
    } 
    else if (lowerName.includes('한국사') || lowerName === 'korean history' || lowerName === 'history') {
      converted.korean_history = convertScoreData(scoreData.default);
      converted.korean_history.subjectId = parseInt(subjectId);
      console.log(`  ✅ 한국사 변환:`, converted.korean_history);
    } 
    else if (lowerName.includes('탐구') || lowerName === 'inquiry' || lowerName.includes('사회') || lowerName.includes('과학')) {
      if (scoreData['탐구1']) {
        converted.inquiry1 = convertScoreData(scoreData['탐구1']);
        converted.inquiry1.subjectId = parseInt(subjectId);
        console.log(`  ✅ 탐구1 변환:`, converted.inquiry1);
      }
      if (scoreData['탐구2']) {
        converted.inquiry2 = convertScoreData(scoreData['탐구2']);
        converted.inquiry2.subjectId = parseInt(subjectId);
        console.log(`  ✅ 탐구2 변환:`, converted.inquiry2);
      }
      if (scoreData.default && !converted.inquiry1) {
        converted.inquiry1 = convertScoreData(scoreData.default);
        converted.inquiry1.subjectId = parseInt(subjectId);
        console.log(`  ✅ 탐구1(default) 변환:`, converted.inquiry1);
      }
    }
  }

  return converted;
}

// 점수 데이터 변환
function convertScoreData(data) {
  if (!data) return null;

  return {
    standard_score: parseFloat(data.standardScore) || null,
    percentile: parseFloat(data.percentile) || null,
    converted_standard_score: parseFloat(data.convertedStandardScore) || null,
    grade: parseInt(data.grade) || null,
    raw_score: parseFloat(data.rawScore) || null
  };
}

// 학과별 환산점수 계산
async function calculateDepartmentScore(department, userScores, maxScoreMap) {
  console.log(`\n===== 학과 ${department.id} (${department.name}) 계산 시작 =====`);
  
  // 1. DepartmentSubjectConfig 조회 (과목별 설정)
  const subjectConfigs = await DepartmentSubjectConfig.findAll({
    where: { departmentId: department.id }
  });

  console.log(`- subjectConfigs 개수: ${subjectConfigs.length}`);
  
  if (subjectConfigs.length === 0) {
    console.log(`❌ subjectConfigs가 없어서 null 반환`);
    return null;
  }

  // 2. DepartmentScoreRule 조회 (점수 반영 규칙)
  const scoreRules = await DepartmentScoreRule.findAll({
    where: { departmentId: department.id }
  });

  console.log(`- scoreRules 개수: ${scoreRules.length}`);
  
  if (scoreRules.length === 0) {
    console.log(`❌ scoreRules가 없어서 null 반환`);
    return null;
  }

  // 3. GradeConversion 조회 (영어, 한국사)
  const gradeConversions = await GradeConversion.findAll({
    where: { departmentId: department.id }
  });

  const gradeMap = {};
  gradeConversions.forEach(gc => {
    if (!gradeMap[gc.subject_code]) {
      gradeMap[gc.subject_code] = {};
    }
    gradeMap[gc.subject_code][gc.grade] = gc.converted_score;
  });

  console.log(`- gradeMap:`, gradeMap);

  // 4. 각 과목별 점수 계산
  const calculatedScores = {};

  for (const config of subjectConfigs) {
    const subjectId = config.subjectId;
    const scoreType = config.score_type;
    
    console.log(`\n  🔍 과목 ${subjectId} 처리 (score_type: ${scoreType})`);

    const score = await calculateSubjectScore(
      subjectId,
      scoreType,
      config,
      userScores,
      maxScoreMap,
      gradeMap,
      department
    );

    if (score !== null) {
      calculatedScores[subjectId] = score;
      console.log(`    ✅ 과목 ${subjectId} 점수: ${score}`);
    } else {
      console.log(`    ⚠️ 과목 ${subjectId} 점수 계산 실패`);
    }
  }

  console.log(`\n- calculatedScores:`, calculatedScores);

  // 5. DepartmentScoreRule 적용하여 최종 점수 계산
  let totalScore = 0;

  for (const rule of scoreRules) {
    const subjectGroup = rule.subject_group; // [1, 2] 형태
    const pickCount = rule.pick_count;
    const weightType = rule.weight_type; // FIXED or RANK
    const weights = rule.weights; // [30, 30] 또는 [50, 30, 20] 형태

    console.log(`\n  📋 규칙 적용: subjects=${JSON.stringify(subjectGroup)}, pick=${pickCount}, type=${weightType}`);

    if (weightType === 'FIXED') {
      // FIXED: 모든 과목을 고정 비율로 반영
      for (let i = 0; i < subjectGroup.length; i++) {
        const subjectId = subjectGroup[i];
        const weight = weights[i] || 0;
        const score = calculatedScores[subjectId] || 0;
        
        const weightedScore = score * (weight / 100);
        totalScore += weightedScore;
        
        console.log(`    + 과목 ${subjectId}: ${score} × ${weight}% = ${weightedScore.toFixed(2)}`);
      }
    } else if (weightType === 'RANK') {
      // RANK: 상위 N개 과목을 순위별 비율로 반영
      const candidates = [];
      
      for (const subjectId of subjectGroup) {
        const score = calculatedScores[subjectId];
        if (score !== undefined && score !== null) {
          candidates.push({ subjectId, score });
        }
      }

      // 점수 높은 순 정렬
      candidates.sort((a, b) => b.score - a.score);
      
      // 상위 pickCount개 선택
      const selected = candidates.slice(0, pickCount);
      
      console.log(`    → ${candidates.length}개 중 상위 ${pickCount}개 선택`);
      
      for (let i = 0; i < selected.length; i++) {
        const { subjectId, score } = selected[i];
        const weight = weights[i] || 0;
        
        const weightedScore = score * (weight / 100);
        totalScore += weightedScore;
        
        console.log(`    + ${i + 1}등 과목 ${subjectId}: ${score} × ${weight}% = ${weightedScore.toFixed(2)}`);
      }
    }
  }

  // 6. 영어 가산/감점 처리
  const englishScore = getEnglishScore(department, gradeMap, userScores);
  console.log(`\n  🔤 영어 처리: ${englishScore} (type: ${department.english_conversion_type})`);

  if (department.english_conversion_type === 'A_ADD') {
    // 반영비율 계산 후 영어 가산/감점
    totalScore += englishScore;
    console.log(`    → 반영비율 후 영어 가산/감점: ${totalScore.toFixed(2)}`);
  } else if (department.english_conversion_type === 'B_ADD') {
    // 영어 가산/감점 후 반영비율 계산
    totalScore = totalScore + englishScore;
    console.log(`    → 영어 가산/감점 후 반영비율: ${totalScore.toFixed(2)}`);
  }
  // NONE인 경우는 이미 DepartmentScoreRule에 포함되어 계산됨

  // 7. 한국사 가산점
  const historyScore = getHistoryScore(department, gradeMap, userScores);
  console.log(`\n  📚 한국사 가산점: ${historyScore} (type: ${department.history_conversion_type})`);

  if (department.history_conversion_type === 'A_ADD') {
    totalScore += historyScore;
  } else if (department.history_conversion_type === 'B_ADD') {
    totalScore = totalScore + historyScore;
  }

  console.log(`\n  ✅ 최종 점수: ${totalScore.toFixed(2)}`);

  return Math.round(totalScore * 100) / 100;
}

// 과목별 점수 계산
async function calculateSubjectScore(subjectId, scoreType, config, userScores, maxScoreMap, gradeMap, department) {
  // subjectId로 해당 과목 데이터 찾기
  let subjectData = null;
  let subjectName = '';

  // subjectId로 과목 찾기
  for (const [key, value] of Object.entries(userScores)) {
    if (value && value.subjectId === subjectId) {
      subjectData = value;
      subjectName = key;
      break;
    }
  }

  if (!subjectData) {
    console.log(`    ⚠️ 과목 ${subjectId} 데이터 없음`);
    return null;
  }

  console.log(`    - 과목명: ${subjectName}`);

  // 등급 변환 (영어, 한국사)
  if (scoreType === 'grade_conversion') {
    const grade = subjectData.grade;
    console.log(`    - 등급: ${grade}`);
    
    const subjectCode = subjectName === 'english' ? 'ENGLISH' : 'K_HISTORY';
    
    if (gradeMap[subjectCode] && gradeMap[subjectCode][grade]) {
      const convertedScore = gradeMap[subjectCode][grade];
      console.log(`    - 변환 점수: ${convertedScore}`);
      return convertedScore;
    }
    
    // 기본값
    if (subjectName === 'english') {
      return getDefaultEnglishScore(grade, 100);
    }
    
    return 0;
  }

  // 표준점수, 백분위, 변환표준점수
  let rawScore = null;

  if (scoreType === '표준점수') {
    rawScore = subjectData.standard_score;
  } else if (scoreType === '백분위') {
    rawScore = subjectData.percentile;
  } else if (scoreType === '변환표준점수') {
    rawScore = subjectData.converted_standard_score;
  }

  console.log(`    - 원점수 (${scoreType}): ${rawScore}`);

  if (rawScore === null || rawScore === undefined) {
    return null;
  }

  // 탐구 과목 처리 (2과목 평균 등)
  if (subjectName === 'inquiry1' && department.inquiry_subject_count === 2) {
    const inquiry2Data = userScores.inquiry2;
    if (inquiry2Data) {
      let score2 = null;
      if (scoreType === '표준점수') score2 = inquiry2Data.standard_score;
      else if (scoreType === '백분위') score2 = inquiry2Data.percentile;
      else if (scoreType === '변환표준점수') score2 = inquiry2Data.converted_standard_score;
      
      if (score2 !== null && score2 !== undefined) {
        rawScore = (rawScore + score2) / 2;
        console.log(`    - 탐구 2과목 평균: ${rawScore}`);
      }
    }
  }

  return rawScore;
}

// 영어 점수 가져오기
function getEnglishScore(department, gradeMap, userScores) {
  // english_conversion_type이 NONE이면 0 반환 (이미 반영비율에 포함됨)
  if (department.english_conversion_type === 'NONE') {
    return 0;
  }

  const englishGrade = userScores.english?.grade;
  if (!englishGrade) return 0;

  if (gradeMap.ENGLISH && gradeMap.ENGLISH[englishGrade]) {
    return gradeMap.ENGLISH[englishGrade];
  }

  // 기본값 (등급별 점수 없을 때)
  const defaultEnglishScores = {
    1: 100, 2: 95, 3: 90, 4: 85, 5: 80,
    6: 75, 7: 70, 8: 65, 9: 60
  };
  
  return defaultEnglishScores[englishGrade] || 0;
}

// 한국사 점수
function getHistoryScore(department, gradeMap, userScores) {
  // history_conversion_type이 NONE이면 0 반환 (이미 반영비율에 포함됨)
  if (department.history_conversion_type === 'NONE') {
    return 0;
  }

  const historyGrade = userScores.korean_history?.grade;
  if (!historyGrade) return 0;

  if (gradeMap.K_HISTORY && gradeMap.K_HISTORY[historyGrade]) {
    return gradeMap.K_HISTORY[historyGrade];
  }

  const defaultHistoryScores = {
    1: 10, 2: 10, 3: 10, 4: 10, 5: 10,
    6: 8, 7: 6, 8: 4, 9: 2
  };
  
  return defaultHistoryScores[historyGrade] || 0;
}

// 영어 기본 점수
function getDefaultEnglishScore(grade, maxScore) {
  if (!grade) return 0;
  
  const gradeRatios = {
    1: 1.0, 2: 0.95, 3: 0.9, 4: 0.85, 5: 0.8,
    6: 0.75, 7: 0.7, 8: 0.65, 9: 0.6
  };
  
  return (gradeRatios[grade] || 0) * maxScore;
}

module.exports = router;