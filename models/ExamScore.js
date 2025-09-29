const { DataTypes } = require("sequelize");
// ❌ 여기 sequelize 인스턴스 import가 없음
const User = require("./User");

const ExamScore = sequelize.define(   // 여기서 ReferenceError 발생 가능
  "ExamScore",
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    mode: {
      type: DataTypes.ENUM("before", "after"),
      allowNull: false,
    },
    scores: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    tableName: "exam_scores",
    timestamps: false,
    indexes: [
      {
        unique: true,
        fields: ["userId", "mode"],
      },
    ],
  }
);

User.hasMany(ExamScore, { foreignKey: "userId" });
ExamScore.belongsTo(User, { foreignKey: "userId" });

module.exports = ExamScore;
