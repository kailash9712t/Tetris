import {GenerateJwtToken} from './GenrateToken.js';
import dynamoDb from '../Model/ConnectedDB.js';
import { PutCommand , GetCommand ,ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {S3Client,PutObjectCommand} from '@aws-sdk/client-s3';
import s3 from '../Model/ConnectedBucket.js';
import IsInvalid from '../services/RequestDataValidation.js';
import MongoClient from '../Model/ConnectMongo.js'
import crypto from 'crypto';

const utils = {
    AddImage: async (file,PhotoId) => {
        const parms = {
            Bucket: 'kai9712',
            Key: PhotoId,
            Body: file.buffer,
            ContentType: file.mimetype || 'application/octet-stream',
        }
        try {
            await s3.send(new PutObjectCommand(parms));
            console.log("Image added!");
            return true;
        } catch (error) {
            console.log(error);
            res.status(404).send("Error \n Location : AddImage \n ErrorType : ",error);
            return false;
        }
    },
    Login : async (req,res) => {
        const {username,password} = req.body;
        const parms = {
            TableName : 'UserData',
            Item : {
                "userid" : username,
                Password : password
            }
        }
        try{
            await dynamoDb.send(new PutCommand(parms));
            console.log("Login successfully!");
            res.status(200).send("Login successfully!");
        }catch(error){
            console.error(`Error \nLocation : Login \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : Login \nErrorType : ${error.message}`);
            return;
        }
        GenerateJwtToken(req,res);
    },
    CheckUserID : async (req,res) => {
        const username = req.body.username;
        const parms = {
            TableName : 'UserData',
            ProjectionExpression : 'userid'
        }
        try{             
            const response = await dynamoDb.send(new ScanCommand(parms));
            if(!response.Items){
                console.log("Unexpacted Response");
                res.status(404).send("Unexpacted Response");
                return;
            }
            else{
                const list = response.Items.some(user => username == user.userid);
                res.status(200).send(list);
                console.log('User Found!');
                return;
            }
        }catch(error){
            console.error(`Error \nLocation : CheckUserID \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : CheckUserID \nErrorType : ${error.message}`);
        }
    },
    Register : async (req,res) => {
        const file = req.file;
        const username = req.body.username;
        const password = req.body.password;
        const mobileNumber = req.body.MobileNumber;
        const currentClientId = req.body.currentClientID;
        const DisplayName = req.body.DisplayName;
        if (!username || !password || !mobileNumber || !currentClientId || !DisplayName) {
            console.log("All Perameeters not filled");
            return;
        }
        const PhotoId = utils.GenerateRandom(10);
        const parms = {
            TableName: "UserData",
            Item: {
                "userid": username,
                "password": password,
                "ProfilePhotoId" : !file ? 'default' : PhotoId,
                "DisplayName" : DisplayName,
                "mobileNumber": mobileNumber,
                "currentClientId": currentClientId,
                "chatRefrences": [
                ]
            }
        }
        try {
            await dynamoDb.send(new PutCommand(parms));
            if(file){
                utils.AddImage(file,PhotoId);
                res.status(200).send("User Register with Photo");
            }else{
                res.status(400).send("User register without photo");
            }
        } catch (error) {
            console.error(`Error \nLocation : Register \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : Register \nErrorType : ${error.message}`);
            return;
        }
    },
    GenerateRandom: (length) => {
        console.log(crypto.randomBytes(Math.ceil(length / 2)));
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
    },
    UpdateCurrentClientId : async (req,res) => {
        const username = req.body.username;
        const currentClientID = req.body.currentClientID;
        if(!username || !currentClientID){
            res.status(404).send("Fill all Required Fileds !");
            return;
        }
        const parms = {
            TableName : "UserData",
            Key : {
                userid : username
            },
            UpdateExpression : 'set currentClientId = :newID',
            ExpressionAttributeValues : {':newID' : currentClientID},
            ReturnValues : 'UPDATED_NEW'
        }
        try{
            await dynamoDb.send(new UpdateCommand(parms));
            res.status(200).send("Value Udpated");
            return;
        }catch(error){
            console.error(`Error \nLocation : UpdateCurrentClientId \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : UpdateCurrentClientId \nErrorType : ${error.message}`);
            return;
        }
    },
    GetChatReference : async (req,res) => {
        console.log("Get ChatReference : Start !");
        const username = req.body.username;
        if(!username){
            res.status(404).send("Required Fill not field");
            console.log("Get ChatReference : Fields not fill !");
            return;
        }
        const parms = {
            TableName : "Userdata",
            Key : {
                userid : username
            },
            ProjectionExpression : "chatRefrences"
        }
        try{
            const response = await dynamoDb.send(new GetCommand(parms));
            res.status(200).send(response.Item.chatRefrences);
            console.log("Get ChatReference : Completed !");
            return;
        }catch(error){
            console.error(`Error \nLocation : GetChatReference \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : GetChatReference \nErrorType : ${error.message}`);
            return;
        }
    },
    InitialPhaseOfChat : async (req,res) => {
        const FirstPerson = req.body.firstPerson;
        const SecondPerson = req.body.SecondPerson;

        if(!FirstPerson || ! SecondPerson){
            console.error("all field are not fill");
            res.status(404).send("all field are not fill");
            return;
        }
        const ChatId = utils.GenerateRandom(10);
        const call1 = await utils.UpdateChatReference(FirstPerson,SecondPerson,ChatId);
        console.log("First User Chat Reference Update");
        const call2 = await utils.UpdateChatReference(SecondPerson,FirstPerson,ChatId);
        console.log("Second User Chat Reference Update");
        const call3 = await utils.StoreChats(true,FirstPerson, SecondPerson, ChatId,req,res);
        console.log("Chat are store into Database");
        if(call1 && call2 && call3){
            res.status(200).send("Process Successfully completed !");
        }else{
            res.status(404).send("Process Failed");
        }
    },

    UpdateChatReference : (FirstPerson, SecondPerson, ChatId) => {
        const storeFormat = {
            ChatId : ChatId,
            UserChats : SecondPerson
        }
        const parms = {
            TableName : "UserData",
            Key : {
                userid : FirstPerson
            },
            UpdateExpression : 'set chatRefrences = list_append(chatRefrences , :newReference)',
            ExpressionAttributeValues : {':newReference' : [storeFormat]}
        }
        return new Promise(async (resolve,reject) => {
            try {
                await dynamoDb.send(new UpdateCommand(parms));
                console.log("Value Updated");
                resolve("Completed");
                return true;
            } catch (error) {
                console.error(`Error \nLocation : UpdateChatReference \nErrorType : ${error.message}`);
                reject("Failed");
                return false;
            }
        })
    },
    HelperStoreChats : (req,res) => {
        const ChatId  = req.body.chatId;
        const From = req.body.From;
        const To = req.body.To;
        const NewChat = req.body.NewChat;
        utils.StoreChats(NewChat,From,To,ChatId,req,res);
    },
    GetUserPhoto : async (req,res) => {
        const username = req.body.username;
        const parms = {
            TableName : "UserData",
            Key : {
                userid : username
            },
            ProjectionExpression : "ProfilePhotoId"
        }
        try {
            const response = await dynamoDb.send(new GetCommand(parms));

            res.status(200).send(response.Item.ProfilePhotoId); 
        } catch (error) {
            console.error(`Error \nLocation : GetUserPhoto \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : GetUserPhoto \nErrorType : ${error.message}`);
        }
    },
    SearchUser: async (req,res) => {
        const Query = req.body.QueryName;
        const parms = {
            TableName : 'UserData',
            FilterExpression: 'contains(#partitionkey, :user)',
            ExpressionAttributeNames : {
                '#partitionkey' : 'userid'
            },
            ExpressionAttributeValues : {
                ':user' : Query
            }
        }
        try {
            const response = await dynamoDb.send(new ScanCommand(parms));
            console.log("Value Retrived");
            res.status(200).send(response.Items);
        } catch (error) {
            console.error(`Error \nLocation : SearchUser \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : SearchUser \nErrorType : ${error.message}`);
        }
    },
    GetChats: async (req,res) => {
        const chatId = req.body.chatId;
        const parms = {
            TableName : "Chats",
            Key : {
                chatID : chatId
            },
            ProjectionExpression : "Chats"
        }
        try {
            const response = await dynamoDb.send(new GetCommand(parms));
            res.status(200).send(response.Item.Chats);
            return;
        } catch (error) {
            console.error(`Error \nLocation : GetUserPhoto \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : GetUserPhoto \nErrorType : ${error.message}`);
            return;
        }
    },
    StoreChats : (NewChat,From, To , ChatId , req,res) => {
        const Message = req.body.Message;
        if(IsInvalid(ChatId) || IsInvalid(From) || IsInvalid(Message) || IsInvalid(To) || IsInvalid(NewChat)){
            console.log(`${NewChat} ${From} ${To} ${ChatId} ${Message}`);
            console.error("Required Fill not field");
            res.status(404).send('Required Fill not field')
            return;
        }
        const ChatStructure = {
            Message : Message,
            From : From,
            To : To
        }
        return new Promise( async (resolve,reject) => {
            try {
                if(NewChat){
                    const parms = {
                        TableName : 'Chats',
                        Item : {
                            chatID : ChatId,
                            Chats : [ChatStructure]
                        },
                    };
                    await dynamoDb.send(new PutCommand(parms));
                    console.log("Value Add!");
                    resolve("Completed");
                }else{
                    const parms = {
                        TableName : 'Chats',
                        Key : {
                            chatID : ChatId,
                        },
                        UpdateExpression : 'set Chats = list_append(Chats, :NewChat)',
                        ExpressionAttributeValues : {':NewChat' : [ChatStructure]},
                        ReturnValues : 'UPDATED_NEW'
                    };
                    await dynamoDb.send(new UpdateCommand(parms));
                    console.log("Value Updated");
                    res.status(200).send("Value Updated");
                    resolve("Completed");
                }
                return true;
            } catch (error) {
                console.error(`Error \nLocation : StoreChats \nErrorType : ${error.message}`);
                reject("Failed");
                return false;
            }
        })
        .then(result => {
            console.log("Successfull !");
            return true;
        })
        .catch(error => {
            console.error(`Error \nLocation : StoreChats \nErrorType : ${error.message}`);
            return false;
        });
    }
}
export {utils};