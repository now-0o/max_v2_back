// models/DepartmentScoreConfig.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DepartmentScoreConfig = sequelize.define('DepartmentScoreConfig', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    departmentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '연결된 학과 ID'
    },
    subject_type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '과목 그룹 (국수, 탐구, 영어)'
    },
    score_type: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '점수 유형 (표준점수, 백분위, 변환표준점수, grade_conversion 등)'
    },
    max_score_method: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '만점 기준 방식 (highest_of_year, fixed_200, fixed_100 등)'
    },
    max_score_value: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '고정 만점 값이 있을 경우 사용 (fixed_max_score)'
    },
    priority_group: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '선택 반영 그룹 ID (동일 그룹 내 상위 점수 반영)'
    }
}, {
    tableName: 'DepartmentScoreConfigs',
    timestamps: false
});

module.exports = DepartmentScoreConfig;