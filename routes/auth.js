const express = require("express");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

// JWT 토큰 생성 함수
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
  );

  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "1d" }
  );

  return { accessToken, refreshToken };
};

// 카카오 로그인
router.post("/kakao", async (req, res) => {
  const { code } = req.body;
  
  try {
    // 1. 액세스 토큰 요청
    const params = {
      grant_type: "authorization_code",
      client_id: process.env.KAKAO_REST_API_KEY,
      redirect_uri: process.env.KAKAO_REDIRECT_URI,
      code,
    };
    
    // 👉 .env 에 값이 있으면 추가, 없으면 아예 안 보냄
    if (process.env.KAKAO_CLIENT_SECRET && process.env.KAKAO_CLIENT_SECRET.trim() !== "") {
      params.client_secret = process.env.KAKAO_CLIENT_SECRET;
    }
    
    const tokenResponse = await axios.post(
      "https://kauth.kakao.com/oauth/token",
      null,
      {
        params,
        headers: { "Content-type": "application/x-www-form-urlencoded;charset=utf-8" },
      }
    );    

    const accessToken = tokenResponse.data.access_token;

    // 2. 사용자 정보 요청
    const userResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const kakaoId = userResponse.data.id;
    const nickname = userResponse.data.kakao_account.profile.nickname;

    // 3. DB 저장 or 조회
    let user = await User.findOne({ where: { kakaoId } });
    if (!user) {
      user = await User.create({ kakaoId, name: nickname });
    }

    // 4. JWT 발급
    const { accessToken: jwtAccess, refreshToken: jwtRefresh } = generateTokens(user);

    // 리프레시 토큰은 쿠키에 저장
    res.cookie("refreshToken", jwtRefresh, {
      httpOnly: true,
      secure: false, // HTTPS 사용 시 true
      sameSite: "lax",
    });

    res.json({
      message: "로그인 성공",
      accessToken: jwtAccess,
      user: { id: user.id, name: user.name },
    });
  } catch (err) {
    console.error("카카오 로그인 실패:", err.response?.data || err.message);
    res.status(500).json({ error: "카카오 로그인 실패" });
  }
});

// 액세스 토큰 재발급
router.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET);
    const accessToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m" }
    );
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken"); // ✅ 쿠키 제거
  res.json({ message: "로그아웃 성공" });
});

module.exports = router;
