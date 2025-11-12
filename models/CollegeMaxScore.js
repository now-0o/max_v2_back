// models/CollegeMaxScore.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CollegeMaxScore = sequelize.define('CollegeMaxScore', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    year: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '기준 연도 (예: 2025)'
    },
    subject_code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '과목 코드 (KOR_MAX, MATH_MAX, INQUIRY_MAX 등)'
    },
    max_standard_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '해당 과목의 당해 최고 표준점수'
    },
    max_converted_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: '해당 과목의 변환표준점수 만점'
    }
}, {
    tableName: 'CollegeMaxScores',
    timestamps: true
});

module.exports = CollegeMaxScore;