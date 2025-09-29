const express = require("express");
const { School, Department, UserChoice } = require("../models");
const router = express.Router();

// ✅ 전체 학과 + 소속 학교 정보
router.get("/departments", async (req, res) => {
  try {
    const departments = await Department.findAll({
      include: [{ model: School, attributes: ["name"] }],
    });

    const formatted = departments.map((d) => ({
      id: d.id,
      schoolName: d.School.name,
      departmentName: d.name,
      region: d.region,
      type: d.type,
      division: d.division,
      teacherCertification: d.teacherCertification,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("학과 목록 불러오기 실패:", err);
    res.status(500).json({ error: "학과 목록 불러오기 실패" });
  }
});


// ✅ 특정 유저의 선택 목록 불러오기
router.get("/choices/:userId", async (req, res) => {
  try {
    const choices = await UserChoice.findAll({
      where: { userId: req.params.userId },
      include: [{ model: Department, include: [School] }],
    });

    const formatted = choices.map((c) => ({
      id: c.id,
      schoolName: c.Department.School.name,
      departmentName: c.Department.name,
      region: c.Department.region,
      type: c.Department.type,
      division: c.Department.division,
      teacherCertification: c.Department.teacherCertification,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("선택 목록 불러오기 실패:", err);
    res.status(500).json({ error: "선택 목록 불러오기 실패" });
  }
});


// 선택 추가
router.post("/choices", async (req, res) => {
    try {
      const { userId, departmentId } = req.body;
  
      if (!userId || !departmentId) {
        return res.status(400).json({ error: "userId와 departmentId가 필요합니다." });
      }
  
      // 이미 선택했는지 확인
      const exists = await UserChoice.findOne({
        where: { userId, departmentId },
      });
  
      if (exists) {
        return res.status(400).json({ error: "이미 선택한 학교/학과입니다." });
      }
  
      // 현재 몇 개 등록되어 있는지 확인 (최대 3개 제한)
      const count = await UserChoice.count({ where: { userId } });
      if (count >= 3) {
        return res.status(400).json({ error: "최대 3개까지만 선택할 수 있습니다." });
      }
  
      // 새 선택 저장
      const choice = await UserChoice.create({ userId, departmentId });
  
      // 관련 정보 포함해서 반환
      const dept = await Department.findByPk(departmentId, {
        include: [{ model: School, attributes: ["name"] }],
      });
  
      res.json({
        id: choice.id,
        schoolName: dept.School.name,
        departmentName: dept.name,
        region: dept.region,
        type: dept.type,
        division: dept.division,
        teacherCertification: dept.teacherCertification,
      });
    } catch (err) {
      console.error("선택 추가 실패:", err);
      res.status(500).json({ error: "선택 추가 실패" });
    }
  });
  


// ✅ 선택 삭제
router.delete("/choices/:id", async (req, res) => {
  try {
    await UserChoice.destroy({ where: { id: req.params.id } });
    res.json({ message: "삭제 성공" });
  } catch (err) {
    console.error("선택 삭제 실패:", err);
    res.status(500).json({ error: "선택 삭제 실패" });
  }
});

module.exports = router;
