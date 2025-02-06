const { defaultValueSchemable } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
    const book_recommendations = sequelize.define('book_recommendations', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        book_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
        },
        recommendations : {
            type: DataTypes.JSON,
            defaultValue: []
        }
    }, {
        timestamps: false,
    });
    
    return book_recommendations;
} 