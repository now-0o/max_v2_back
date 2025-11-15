// models/DepartmentSubjectConfig.js

const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const DepartmentSubjectConfig = sequelize.define(
  "DepartmentSubjectConfig",
  {
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
    subjectId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      comment: '과목 ID (1: 국어, 2: 수학, 3: 영어, 4: 한국사, 5: 탐구)'
    },
    score_type: { 
      type: DataTypes.ENUM('표준점수', '백분위', '변환표준점수', 'grade_conversion'),
      allowNull: false,
      comment: '점수 유형'
    },
    max_score_method: { 
      type: DataTypes.ENUM('highest_of_year', 'fixed_200', 'fixed_100', 'custom'), 
      allowNull: true, 
      comment: '만점 기준 방식'
    },
    max_score_value: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      comment: '커스텀 만점값 (max_score_method가 custom일 때)'
    }
  },
  {
    tableName: "DepartmentSubjectConfigs",
    timestamps: false,
    indexes: [
      { unique: true, fields: ['departmentId', 'subjectId'] }
    ]
  }
);

module.exports = DepartmentSubjectConfig;