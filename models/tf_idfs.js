const { defaultValueSchemable } = require("sequelize/lib/utils");

module.exports = (sequelize, DataTypes) => {
    const tf_idfs = sequelize.define('tf_idfs', {
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
        stats : {
            type: DataTypes.JSON,
            defaultValue: []
        }
    }, {
        timestamps: false,
    });
    
    return tf_idfs;
} 