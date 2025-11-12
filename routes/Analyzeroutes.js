const express = require('express');
const router = express.Router();
const { 
  ExamScore, 
  Department, 
  School, 
  DepartmentScoreConfig, 
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

    // ✅ 성적 데이터 변환 (Subject ID → korean, math 등)
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
      maxScoreMap[ms.subject_code] = ms.max_standard_score; // ✅ 수정
    });

    console.log('\n📈 최고점 데이터:', maxScoreMap);

    // ✅ 최고점 데이터가 없으면 기본값 사용
    if (!maxScoreMap.KOR_MAX) maxScoreMap.KOR_MAX = 150;
    if (!maxScoreMap.MATH_MAX) maxScoreMap.MATH_MAX = 150;
    if (!maxScoreMap.INQUIRY_MAX) maxScoreMap.INQUIRY_MAX = 70;
    console.log('📈 기본값 적용 후:', maxScoreMap);

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
            cutlineScore: dept.cutline_score || null,  // ✅ 커트라인 추가
            isPassed: dept.cutline_score ? convertedScore >= dept.cutline_score : null  // ✅ 합격 여부
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

// ✅ 성적 데이터 변환 (Subject ID → korean, math 등)
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

    // ✅ 과목명으로 매핑
    const lowerName = subjectName.toLowerCase();
    
    if (lowerName.includes('국어') || lowerName === 'korean') {
      converted.korean = convertScoreData(scoreData.default);
      console.log(`  ✅ 국어 변환:`, converted.korean);
    } 
    else if (lowerName.includes('수학') || lowerName === 'math') {
      converted.math = convertScoreData(scoreData.default);
      console.log(`  ✅ 수학 변환:`, converted.math);
    } 
    else if (lowerName.includes('영어') || lowerName === 'english') {
      converted.english = convertScoreData(scoreData.default);
      console.log(`  ✅ 영어 변환:`, converted.english);
    } 
    else if (lowerName.includes('한국사') || lowerName === 'korean history' || lowerName === 'history') {
      converted.korean_history = convertScoreData(scoreData.default);
      console.log(`  ✅ 한국사 변환:`, converted.korean_history);
    } 
    else if (lowerName.includes('탐구') || lowerName === 'inquiry' || lowerName.includes('사회') || lowerName.includes('과학')) {
      // 탐구 과목
      if (scoreData['탐구1']) {
        converted.inquiry1 = convertScoreData(scoreData['탐구1']);
        console.log(`  ✅ 탐구1 변환:`, converted.inquiry1);
      }
      if (scoreData['탐구2']) {
        converted.inquiry2 = convertScoreData(scoreData['탐구2']);
        console.log(`  ✅ 탐구2 변환:`, converted.inquiry2);
      }
      // default가 있으면 inquiry1으로
      if (scoreData.default && !converted.inquiry1) {
        converted.inquiry1 = convertScoreData(scoreData.default);
        console.log(`  ✅ 탐구1(default) 변환:`, converted.inquiry1);
      }
    }
  }

  return converted;
}

// ✅ 점수 데이터 변환
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

// 학과별 환산점수 계산 함수
async function calculateDepartmentScore(department, userScores, maxScoreMap) {
  console.log(`\n===== 학과 ${department.id} (${department.name}) 계산 시작 =====`);
  
  // DepartmentScoreConfig 조회
  const scoreConfigs = await DepartmentScoreConfig.findAll({
    where: { departmentId: department.id }
  });

  console.log(`- scoreConfigs 개수: ${scoreConfigs.length}`);
  
  if (scoreConfigs.length === 0) {
    console.log(`❌ scoreConfigs가 없어서 null 반환`);
    return null;
  }

  console.log('- scoreConfigs 상세:');
  scoreConfigs.forEach(sc => {
    console.log(`  * ${sc.subject_type}: score_type=${sc.score_type}, max_score_method=${sc.max_score_method}`);
  });

  // GradeConversion 조회 (영어, 한국사)
  const gradeConversions = await GradeConversion.findAll({
    where: { departmentId: department.id }
  });

  console.log(`- gradeConversions 개수: ${gradeConversions.length}`);

  const gradeMap = {};
  gradeConversions.forEach(gc => {
    if (!gradeMap[gc.subject_code]) {
      gradeMap[gc.subject_code] = {};
    }
    gradeMap[gc.subject_code][gc.grade] = gc.converted_score;
  });
  
  console.log(`- gradeMap:`, gradeMap);

  // ✅ 과목별 실제 점수 계산 (정규화 없이)
  const subjectScores = {};

  for (const config of scoreConfigs) {
    const subjectType = config.subject_type;
    let rawScore = null;

    console.log(`\n  🔍 처리 중: ${subjectType} (score_type: ${config.score_type})`);

    // 원점수 가져오기
    if (subjectType === 'korean') {
      rawScore = getSubjectScore(userScores, 'korean', config.score_type);
      console.log(`    - 국어 원점수: ${rawScore}`);
    } else if (subjectType === 'math') {
      rawScore = getSubjectScore(userScores, 'math', config.score_type);
      console.log(`    - 수학 원점수: ${rawScore}`);
    } else if (subjectType === 'inquiry') {
      const inquiryCount = department.inquiry_subject_count || 1;
      rawScore = getInquiryScore(userScores, config.score_type, inquiryCount);
      console.log(`    - 탐구 원점수: ${rawScore} (과목수: ${inquiryCount})`);
    } else if (subjectType === 'english') {
      const englishGrade = userScores.english?.grade;
      console.log(`    - 영어 등급: ${englishGrade}`);
      
      if (englishGrade && gradeMap.ENGLISH && gradeMap.ENGLISH[englishGrade]) {
        subjectScores.english = gradeMap.ENGLISH[englishGrade];
        console.log(`    - 영어 변환점수: ${subjectScores.english}`);
      } else if (config.score_type === 'fixed_max_score' && config.max_score_value) {
        subjectScores.english = getDefaultEnglishScore(englishGrade, config.max_score_value);
        console.log(`    - 영어 기본 변환점수: ${subjectScores.english}`);
      } else {
        console.log(`    - 영어 변환표 없음`);
      }
      continue;
    }

    if (rawScore === null) {
      console.log(`    ❌ rawScore가 null이므로 스킵`);
      continue;
    }

    // ✅ 실제 점수 저장 (정규화하지 않음)
    subjectScores[subjectType] = rawScore;
    console.log(`    ✅ 저장된 점수: ${rawScore}`);
  }

  console.log(`\n- calculation_type: ${department.calculation_type}`);
  console.log(`- subjectScores:`, subjectScores);
  
  if (department.calculation_type === '기본비율') {
    const result = await calculateBasicRatio(department, subjectScores, gradeMap, userScores, scoreConfigs);
    console.log(`✅ 기본비율 계산 결과: ${result}`);
    return result;
  } else if (department.calculation_type === '특수공식') {
    const result = await calculateSpecialFormula(department, subjectScores, gradeMap, userScores, scoreConfigs);
    console.log(`✅ 특수공식 계산 결과: ${result}`);
    return result;
  }

  console.log(`❌ calculation_type이 매칭되지 않아 null 반환`);
  return null;
}

// ✅ 기본비율 계산 (정규화 제거)
async function calculateBasicRatio(department, subjectScores, gradeMap, userScores, scoreConfigs) {
  console.log('\n  💰 기본비율 계산 시작');
  
  // priority_group 체크
  const hasPriorityGroup = scoreConfigs.some(sc => sc.priority_group !== null);
  console.log(`    - hasPriorityGroup: ${hasPriorityGroup}`);

  if (hasPriorityGroup) {
    return await calculateWithPriorityGroup(department, subjectScores, gradeMap, userScores, scoreConfigs);
  }

  // 단순 비율 계산
  let totalScore = 0;

  // 국어
  if (department.korean_ratio && subjectScores.korean !== undefined) {
    const score = subjectScores.korean * department.korean_ratio;
    console.log(`    - 국어: ${subjectScores.korean} × ${department.korean_ratio} = ${score.toFixed(2)}`);
    totalScore += score;
  } else {
    console.log(`    - 국어: 스킵 (ratio=${department.korean_ratio}, score=${subjectScores.korean})`);
  }

  // 수학
  if (department.math_ratio && subjectScores.math !== undefined) {
    const score = subjectScores.math * department.math_ratio;
    console.log(`    - 수학: ${subjectScores.math} × ${department.math_ratio} = ${score.toFixed(2)}`);
    totalScore += score;
  } else {
    console.log(`    - 수학: 스킵 (ratio=${department.math_ratio}, score=${subjectScores.math})`);
  }

  // 탐구
  if (department.inquiry_ratio && subjectScores.inquiry !== undefined) {
    const score = subjectScores.inquiry * department.inquiry_ratio;
    console.log(`    - 탐구: ${subjectScores.inquiry} × ${department.inquiry_ratio} = ${score.toFixed(2)}`);
    totalScore += score;
  } else {
    console.log(`    - 탐구: 스킵 (ratio=${department.inquiry_ratio}, score=${subjectScores.inquiry})`);
  }

  // 영어
  if (department.english_ratio && subjectScores.english !== undefined) {
    const score = subjectScores.english * department.english_ratio;
    console.log(`    - 영어: ${subjectScores.english} × ${department.english_ratio} = ${score.toFixed(2)}`);
    totalScore += score;
  } else {
    console.log(`    - 영어: 스킵 (ratio=${department.english_ratio}, score=${subjectScores.english})`);
  }

  // 한국사 가산점
  const historyScore = getHistoryScore(department, gradeMap, userScores);
  console.log(`    - 한국사: ${historyScore} (type: ${department.history_conversion_type})`);
  
  if (department.history_conversion_type === 'A_ADD') {
    totalScore += historyScore;
  } else if (department.history_conversion_type === 'B_ADD') {
    totalScore = (totalScore + historyScore);
  }

  console.log(`    - 최종 totalScore: ${totalScore.toFixed(2)}`);

  return Math.round(totalScore * 100) / 100;
}

// ✅ priority_group 처리 (남은 비율 계산 로직)
async function calculateWithPriorityGroup(department, subjectScores, gradeMap, userScores, scoreConfigs) {
  console.log('\n  🎯 priority_group 계산 시작');
  
  const groups = {};
  
  scoreConfigs.forEach(config => {
    const groupId = config.priority_group || 0;
    if (!groups[groupId]) {
      groups[groupId] = [];
    }
    groups[groupId].push(config);
  });

  let totalScore = 0;
  let group0RatioSum = 0;

  // 1️⃣ 그룹 0 (고정 과목) 처리 및 비율 합 계산
  if (groups['0']) {
    console.log(`    - 그룹 0 처리 (과목 수: ${groups['0'].length})`);
    
    for (const config of groups['0']) {
      const score = getSubjectRatioScore(config, subjectScores, department);
      if (score !== null) {
        console.log(`      + ${config.subject_type}: ${score.toFixed(2)}`);
        totalScore += score;
        
        // 비율 합산
        if (config.subject_type === 'korean') group0RatioSum += department.korean_ratio || 0;
        else if (config.subject_type === 'math') group0RatioSum += department.math_ratio || 0;
        else if (config.subject_type === 'inquiry') group0RatioSum += department.inquiry_ratio || 0;
        else if (config.subject_type === 'english') group0RatioSum += department.english_ratio || 0;
      }
    }
    
    console.log(`      → 그룹 0 비율 합: ${group0RatioSum.toFixed(3)} (${(group0RatioSum * 100).toFixed(1)}%)`);
  }

  // 2️⃣ 그룹 1+ (선택 과목) 처리
  for (const [groupId, configs] of Object.entries(groups)) {
    if (groupId === '0') continue; // 이미 처리함
    
    console.log(`    - 그룹 ${groupId} 처리 (과목 수: ${configs.length})`);
    
    const candidateScores = [];
    
    for (const config of configs) {
      const subjectType = config.subject_type;
      const rawScore = subjectScores[subjectType];
      
      if (rawScore !== undefined) {
        let ratio = 0;
        if (subjectType === 'korean') ratio = department.korean_ratio || 0;
        else if (subjectType === 'math') ratio = department.math_ratio || 0;
        else if (subjectType === 'inquiry') ratio = department.inquiry_ratio || 0;
        else if (subjectType === 'english') ratio = department.english_ratio || 0;
        
        if (ratio > 0) {
          candidateScores.push({
            subject: subjectType,
            score: rawScore * ratio,
            ratio: ratio
          });
        }
      }
    }

    if (candidateScores.length === 0) {
      console.log(`      ⚠️ 선택 가능한 과목이 없음`);
      continue;
    }

    // 점수 높은 순으로 정렬
    candidateScores.sort((a, b) => b.score - a.score);
    
    // 3️⃣ 남은 비율 계산 및 선택 개수 결정
    const remainingRatio = 1.0 - group0RatioSum;
    const firstRatio = candidateScores[0]?.ratio || 0.333;
    const selectionCount = Math.round(remainingRatio / firstRatio);
    
    console.log(`      → 남은 비율: ${remainingRatio.toFixed(3)} (${(remainingRatio * 100).toFixed(1)}%)`);
    console.log(`      → 과목당 비율: ${firstRatio.toFixed(3)}`);
    console.log(`      → 선택 개수: ${selectionCount}개`);
    
    const selectedScores = candidateScores.slice(0, selectionCount);
    
    console.log(`      상위 ${selectionCount}개 선택:`);
    selectedScores.forEach(s => {
      console.log(`        + ${s.subject}: ${s.score.toFixed(2)}`);
      totalScore += s.score;
    });
  }

  // 4️⃣ 한국사 가산점
  const historyScore = getHistoryScore(department, gradeMap, userScores);
  console.log(`    - 한국사: ${historyScore}`);
  
  if (department.history_conversion_type === 'A_ADD') {
    totalScore += historyScore;
  } else if (department.history_conversion_type === 'B_ADD') {
    totalScore = (totalScore + historyScore);
  }

  console.log(`    - 최종 totalScore: ${totalScore.toFixed(2)}`);

  return Math.round(totalScore * 100) / 100;
}

// ✅ 과목별 점수 계산 (간단하게)
function getSubjectRatioScore(config, subjectScores, department) {
  const subjectType = config.subject_type;
  const rawScore = subjectScores[subjectType];
  
  if (rawScore === undefined) return null;

  let ratio = 0;
  if (subjectType === 'korean') ratio = department.korean_ratio || 0;
  else if (subjectType === 'math') ratio = department.math_ratio || 0;
  else if (subjectType === 'inquiry') ratio = department.inquiry_ratio || 0;
  else if (subjectType === 'english') ratio = department.english_ratio || 0;

  return rawScore * ratio;
}

// 특수공식 계산
async function calculateSpecialFormula(department, subjectScores, gradeMap, userScores, scoreConfigs) {
  console.log('\n  🔮 특수공식 계산');
  
  if (!department.special_formula) {
    console.log('    - special_formula 없음, 기본비율로 계산');
    return await calculateBasicRatio(department, subjectScores, gradeMap, userScores, scoreConfigs);
  }

  console.log(`    - special_formula: ${department.special_formula}`);
  return await calculateBasicRatio(department, subjectScores, gradeMap, userScores, scoreConfigs);
}

// 과목 점수 가져오기
function getSubjectScore(userScores, subject, scoreType) {
  const subjectData = userScores[subject];
  
  console.log(`      [getSubjectScore] subject=${subject}, scoreType=${scoreType}`);
  console.log(`      [getSubjectScore] subjectData:`, subjectData);
  
  if (!subjectData) {
    console.log(`      [getSubjectScore] subjectData 없음!`);
    return null;
  }

  if (scoreType === '표준점수') {
    const score = subjectData.standard_score || null;
    console.log(`      [getSubjectScore] 표준점수: ${score}`);
    return score;
  } else if (scoreType === '백분위') {
    const score = subjectData.percentile || null;
    console.log(`      [getSubjectScore] 백분위: ${score}`);
    return score;
  } else if (scoreType === '변환표준점수') {
    const score = subjectData.converted_standard_score || null;
    console.log(`      [getSubjectScore] 변환표준점수: ${score}`);
    return score;
  }

  console.log(`      [getSubjectScore] scoreType 매칭 안됨: ${scoreType}`);
  return null;
}

// 탐구 점수 가져오기
function getInquiryScore(userScores, scoreType, inquirySubjectCount) {
  const inquiry1 = userScores.inquiry1;
  const inquiry2 = userScores.inquiry2;

  console.log(`      [getInquiryScore] inquiry1:`, inquiry1);
  console.log(`      [getInquiryScore] inquiry2:`, inquiry2);
  console.log(`      [getInquiryScore] scoreType: ${scoreType}, count: ${inquirySubjectCount}`);

  if (!inquiry1) {
    console.log(`      [getInquiryScore] inquiry1 없음!`);
    return null;
  }

  let score1 = null;
  let score2 = null;

  if (scoreType === '표준점수') {
    score1 = inquiry1.standard_score;
    score2 = inquiry2?.standard_score;
  } else if (scoreType === '백분위') {
    score1 = inquiry1.percentile;
    score2 = inquiry2?.percentile;
  } else if (scoreType === '변환표준점수') {
    score1 = inquiry1.converted_standard_score;
    score2 = inquiry2?.converted_standard_score;
  }

  console.log(`      [getInquiryScore] score1: ${score1}, score2: ${score2}`);

  if (score1 === null || score1 === undefined) {
    console.log(`      [getInquiryScore] score1이 null/undefined`);
    return null;
  }

  if (inquirySubjectCount === 1) {
    if (score2 !== null && score2 !== undefined) {
      const result = Math.max(score1, score2);
      console.log(`      [getInquiryScore] 1과목 선택 (max): ${result}`);
      return result;
    }
    console.log(`      [getInquiryScore] 1과목만: ${score1}`);
    return score1;
  }

  if (inquirySubjectCount === 2) {
    if (score2 !== null && score2 !== undefined) {
      const result = (score1 + score2) / 2;
      console.log(`      [getInquiryScore] 2과목 평균: ${result}`);
      return result;
    }
    console.log(`      [getInquiryScore] 2과목이지만 1개만: ${score1}`);
    return score1;
  }

  return score1;
}

// ✅ 최고점 가져오기 (키 수정)
function getMaxScore(config, maxScoreMap) {
  if (config.max_score_method === 'fixed_200') {
    return 200;
  } else if (config.max_score_method === 'fixed_100') {
    return 100;
  } else if (config.max_score_method === 'highest_of_year') {
    if (config.subject_type === 'korean') {
      return maxScoreMap['KOR_MAX'] || 150;  // ✅ 수정
    } else if (config.subject_type === 'math') {
      return maxScoreMap['MATH_MAX'] || 150;  // ✅ 수정
    } else if (config.subject_type === 'inquiry') {
      return maxScoreMap['INQUIRY_MAX'] || 70;  // ✅ 수정
    }
  } else if (config.max_score_value) {
    return config.max_score_value;
  }

  // 백분위는 100
  if (config.score_type === '백분위') {
    return 100;
  }

  return 100;
}

// 한국사 점수 가져오기
function getHistoryScore(department, gradeMap, userScores) {
  const historyGrade = userScores.korean_history?.grade;
  if (!historyGrade) return 0;

  if (gradeMap.K_HISTORY && gradeMap.K_HISTORY[historyGrade]) {
    return gradeMap.K_HISTORY[historyGrade];
  }

  // 기본 가산점
  const defaultHistoryScores = {
    1: 10, 2: 10, 3: 10, 4: 10, 5: 10,
    6: 8, 7: 6, 8: 4, 9: 2
  };
  
  return defaultHistoryScores[historyGrade] || 0;
}

// 영어 기본 점수 (gradeMap이 없을 때)
function getDefaultEnglishScore(grade, maxScore) {
  if (!grade) return 0;
  
  const gradeRatios = {
    1: 1.0,   // 100%
    2: 0.95,  // 95%
    3: 0.9,   // 90%
    4: 0.85,  // 85%
    5: 0.8,   // 80%
    6: 0.75,  // 75%
    7: 0.7,   // 70%
    8: 0.65,  // 65%
    9: 0.6    // 60%
  };
  
  return (gradeRatios[grade] || 0) * maxScore;
}

module.exports = router;