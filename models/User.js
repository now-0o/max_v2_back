const User = sequelize.define("User", {
  id: {
    type: DataTypes.INTEGER,      // ✅ INT로 통일
    autoIncrement: true,
    primaryKey: true,
  },
  kakaoId: { type: DataTypes.STRING, allowNull: false, unique: true },
  name: { type: DataTypes.STRING, allowNull: false },
  gender: DataTypes.STRING,
  phone: DataTypes.STRING,
  highschool: DataTypes.STRING,
});
