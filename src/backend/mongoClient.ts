import { MongoClient,Db } from 'mongodb';

const uri = process.env.mongo_url;

const dbName = 'SMART-TEST-UI-DB';

interface IDatabase {
    GetDB:()=> Db,
    InitDB:()=>void,
    db:Db;
} 


let DataBase:IDatabase = {
    db:undefined,
    GetDB : ()=> {
        if (typeof DataBase.db === 'undefined') {
            DataBase.InitDB();
        }
        return DataBase.db;
    },
    InitDB : ()=> {
        DataBase.db = new MongoClient(uri).db(dbName)
    }
}

// DataBase.BsonIdFromString = function (id) {
//     var mongo = require('mongodb');
//     var BSON = mongo.BSONPure;
//     return new BSON.ObjectID(id);
// }

export default DataBase;
