// models/GradeConversion.js

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GradeConversion = sequelize.define('GradeConversion', {
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
    subject_code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '과목 코드 (ENGLISH, K_HISTORY)'
    },
    grade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '등급 (예: 1, 2, 3...)'
    },
    converted_score: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '해당 등급의 변환 점수 또는 가산/감점 점수'
    }
}, {
    tableName: 'GradeConversions',
    timestamps: false,
    indexes: [
        { unique: true, fields: ['departmentId', 'subject_code', 'grade'] }
    ]
});

module.exports = GradeConversion;