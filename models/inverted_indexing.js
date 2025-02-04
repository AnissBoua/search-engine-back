const { defaultValueSchemable } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
    const inverted_indexing = sequelize.define('inverted_indexing', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        term: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
        },
        list : {
            type: DataTypes.JSON,
            defaultValue: []
        }
    }, {
        timestamps: false,
    });
    
    return inverted_indexing;
} 