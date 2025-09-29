const ExamScore = sequelize.define("ExamScore", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true }, // ✅ INT
  userId: { type: DataTypes.INTEGER, allowNull: false },                  // ✅ INT
  mode: {
    type: DataTypes.ENUM("before", "after"),
    allowNull: false,
  },
  scores: {
    type: DataTypes.JSON,
    allowNull: false,
  },
}, {
  tableName: "exam_scores",
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ["userId", "mode"],
    },
  ],
});
