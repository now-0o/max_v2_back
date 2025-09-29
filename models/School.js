const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const School = sequelize.define("School", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
});

module.exports = School;
