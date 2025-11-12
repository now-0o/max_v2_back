// models/Department.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const School = require("./School");

const Department = sequelize.define("Department", {
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    // 학군 (가, 나, 다)
    division: {
        type: DataTypes.ENUM("가", "나", "다"),
        allowNull: true,
    },
    // 지역
    region: {
        type: DataTypes.ENUM(
            "강원", "충남", "경남", "경북", "서울", "세종", "전북", "부산",
            "경기", "인천", "광주", "대전", "충북", "대구", "전남", "제주", '울산'
        ),
        allowNull: true,
    },
    // 형태 (국립, 사립)
    type: {
        type: DataTypes.ENUM("국립", "사립"),
        allowNull: true,
    },
    // 교직이수 여부 (가능, 불가능, 일부가능)
    teacherCertification: {
        type: DataTypes.ENUM("가능", "불가", "일부가능"),
        allowNull: true,
    },

    // --- [추가] 계산 필수 컬럼 ---
    total_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1000,
        comment: '수능 성적 총 환산점수 만점 (예: 1000점)'
    },
    calculation_type: {
        type: DataTypes.ENUM('기본비율', '특수공식'),
        allowNull: false,
        comment: '점수 계산 유형 (기본비율 / 특수공식)'
    },
    korean_ratio: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: '국어 반영 비율 (0.0 ~ 1.0)'
    },
    math_ratio: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: '수학 반영 비율 (0.0 ~ 1.0)'
    },
    inquiry_ratio: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: '탐구 반영 비율 (0.0 ~ 1.0)'
    },
    english_ratio: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: '영어 반영 비율 (0.0 ~ 1.0)'
    },
    inquiry_subject_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 1,
        comment: '탐구 과목 수 (1: 상위 1개만, 2: 2과목 평균)'
    },
    history_conversion_type: {
        type: DataTypes.ENUM('A_ADD', 'B_ADD', 'NONE'),
        allowNull: false,
        defaultValue: 'NONE',
        comment: '한국사 가산점 적용 유형 (A: 선 비율 후 가산, B: 선 가산 후 비율)'
    },
    special_formula: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: '특수공식 계산에 사용될 문자열 공식'
    },
    cutline_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        comment: '합격 커트라인 점수 (작년 또는 예상 커트라인)'
    }
    // ----------------------------
}, {
    tableName: 'Departments',
    timestamps: true
});

School.hasMany(Department, { foreignKey: "schoolId", onDelete: "CASCADE" });
Department.belongsTo(School, { foreignKey: "schoolId" });

module.exports = Department;