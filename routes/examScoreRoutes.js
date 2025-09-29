const express = require("express");
const router = express.Router();
const { Subject, SubjectOption, ExamScore } = require("../models");

// 1. 과목 목록
router.get("/subjects", async (req, res) => {
  try {
    const subjects = await Subject.findAll();
    res.json(subjects);
  } catch (err) {
    console.error("과목 불러오기 실패:", err);
    res.status(500).json({ message: "과목 불러오기 실패" });
  }
});

// 2. 선택과목 목록
router.get("/subject-options", async (req, res) => {
  try {
    const options = await SubjectOption.findAll();
    res.json(options);
  } catch (err) {
    console.error("선택과목 불러오기 실패:", err);
    res.status(500).json({ message: "선택과목 불러오기 실패" });
  }
});

// 3. 성적 저장 (유저당 성적 1개, before/after 구분)
router.post("/", async (req, res) => {
  try {
    const { userId, mode, scores } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId가 필요합니다." });
    }
    if (!mode || !["before", "after"].includes(mode)) {
      return res.status(400).json({ message: "mode 값이 잘못되었습니다." });
    }
    if (!scores || typeof scores !== "object") {
      return res.status(400).json({ message: "scores 데이터가 필요합니다." });
    }

    // upsert: 같은 userId + mode 있으면 업데이트, 없으면 삽입
    await ExamScore.upsert({
      userId,
      mode,
      scores,
    });

    res.json({ message: "성적이 저장되었습니다." });
  } catch (err) {
    console.error("성적 저장 실패:", err);
    res.status(500).json({ message: "성적 저장 실패" });
  }
});

// 4. 특정 유저 성적 조회
router.get("/:userId/:mode", async (req, res) => {
  try {
    const { userId, mode } = req.params;
    const examScore = await ExamScore.findOne({ where: { userId, mode } });
    res.json(examScore); // ✅ { id, userId, mode, scores } 형태
  } catch (err) {
    console.error("성적 불러오기 실패:", err);
    res.status(500).json({ message: "성적 불러오기 실패" });
  }
});


module.exports = router;
