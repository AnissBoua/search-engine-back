module.exports = (sequelize, DataTypes) => {
    const Books = sequelize.define('Books', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        api_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        titre: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        authors: {
            type: DataTypes.JSON,
            defaultValue: []
        },
        summary: {
            type: DataTypes.STRING,
        },
        content : {
            type: DataTypes.TEXT,
        },
        image : {
            type: DataTypes.STRING,
            allowNull: true,
        },
        page_rank : {
            type: DataTypes.FLOAT,
            allowNull: true,
        },
    });
    
    return Books;
} 