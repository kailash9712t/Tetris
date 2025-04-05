import MongoClient from '../Model/ConnectMongo.js';
import IsInvalid from '../services/RequestDataValidation.js';
import cloudinary from '../Model/ConnectCloudinery.js';
import crypto from 'crypto';
import Listner from '../Listner/RealTimeChatReference.js';
import bcrypt from 'bcrypt';
const db = await MongoClient();
await Listner.ChatReference();
// for hash opertions 
const HashOperation = {
    GenerateHash: (res, plainPassword) => {
        return new Promise((resolve, reject) => {
            bcrypt.hash(plainPassword, 10, (error, HashPassword) => {
                if (error) {
                    res.status(404).send(`Error \nLocation : GenerateHash \nErrorType : ${error.message}`);
                    console.log(`Error \nLocation : GenerateHash \nErrorType : ${error.message}`);
                    reject("Rejected");
                    return;
                } else {
                    console.log(HashPassword);
                    resolve(HashPassword);
                    return HashPassword;
                }
            })
        })
    },
    ComparePassword: async (plainPassword, HashedPassword) => {
        try {
            const check = await bcrypt.compare(plainPassword, HashedPassword);
            if (check) {
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.log(`Error \nLocation : ComparePassword \nErrorType : ${error.message}`);
        }
    }
}

// all endpoint routes
const Utils = {
    HomeRoute: (req,res) => {
        console.log("check");
        res.send("This is Home route");
    },
    GenerateRandom: (length) => {
        console.log(crypto.randomBytes(Math.ceil(length / 2)));
        return crypto.randomBytes(Math.ceil(length / 2)).toString('hex');
    },
    HandleMutipart: (req, res) => {
        const username = req.body.username;
        console.log(username);
    },
    AddImage: (file, PhotoId) => {
        return new Promise(async (resolve, reject) => {
            cloudinary.uploader.upload_stream({ resource_type: 'image', folder: 'Whatsapp', public_id: PhotoId }, (error, result) => {
                if (error) {
                    res.status(404).send(`Error \nLocation : AddImage \nErrorType : ${error.message}`);
                    reject("false");
                    return false;
                }
                console.log("Image Added!");
                resolve("true");
            }).end(file.buffer);
            return true;
        });
    },
    FetchHashPassword: async (username) => {
        const parms = {
            "_id": username
        }

        try {
            const collection = db.collection('Default');
            const result = await collection.findOne(parms, { projection: { password: 1, _id: 0 } });
            if (result != null) {
                console.log("User Hash Password Fetched");
                return result.password;
            } else {
                console.log("No user available");
                return null;
            }
        } catch (error) {
            console.log(`Error \nLocation : HashPassword \nErrorType : ${error.message}`);
            return null;
        }

    },
    Login: async (req, res) => {
        const username = req.body.username;
        const password = req.body.password;
        const HashedPassword = await Utils.FetchHashPassword(username);
        if (HashedPassword != null) {
            const compare = await HashOperation.ComparePassword(password, HashedPassword);
            res.status(200).send(compare);
        } else {
            res.status(404).send(false);
        }
    },
    CheckUserID: async (req, res) => {
        const username = req.query.username;
        if (!username) {
            res.status(404).send("All perameter not filled");
        }
        const parms = {
            _id: username
        }
        try {
            const collection = db.collection('Default');
            const result = await collection.findOne(parms, { projection: { _id: 1 } });
            var answer = false;
            if (result != null) {
                answer = true;
            }
            res.status(200).send(answer);
        } catch (error) {
            res.status(404).send(`Error \nLocation : CheckUserID \nErrorType : ${error.message}`);
            console.log(`Error \nLocation : CheckUserID \nErrorType : ${error.message}`);
        }
    },

    Register: async (req, res) => {
        const file = req.file;
        const username = req.body.username;
        const password = req.body.password;
        const mobileNumber = req.body.MobileNumber;
        const currentClientId = req.body.currentClientID;
        const DisplayName = req.body.DisplayName;
        if (!username || !password || !mobileNumber || !currentClientId || !DisplayName) {
            console.log("Perameeters not filled");
            res.status(404).send("parameter are not filled");
            return;
        }
        const PhotoId = Utils.GenerateRandom(10);
        const Hashed = await HashOperation.GenerateHash(res, password);

        const parms = {
            "_id": username,
            "password": Hashed,
            "ProfilePhotoId": !file ? 'default' : PhotoId,
            "DisplayName": DisplayName,
            "mobileNumber": mobileNumber,
            "currentClientId": currentClientId,
            "chatRefrences": [
            ]
        }
        try {
            const db = await MongoClient();
            const collection = db.collection('Default');
            const result = await collection.insertOne(parms);
            if (file) {
                const respones = await Utils.AddImage(file, PhotoId);
                if (!respones) {
                    res.status(404).send("Failed");
                    return;
                }
            }
            console.log("value insert");
            res.status(200).send("Done");
        } catch (error) {
            console.error(`Error \nLocation : Register \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : Register \nErrorType : ${error.message}`);
            return;
        }
    },
    UpdateCurrentClientId: async (req, res) => {
        const username = req.body.username;
        const CurrentClientId = req.body.CurrentClientId;
        const collection = db.collection('Default');
        const filter = {
            "_id": username
        }
        const update = {
            $set: { "currentClientId": CurrentClientId }
        }
        try {
            const result = await collection.updateOne(filter, update);
            res.status(200).send("Updated");
        } catch (error) {
            console.error(`Error \nLocation : UpdateCurrentClientId \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : UpdateCurrentClientId \nErrorType : ${error.message}`);
        }
    },
    InitialPhaseOfChat: async (req, res) => {
        const FirstPerson = req.body.firstPerson;
        const SecondPerson = req.body.SecondPerson;

        if (!FirstPerson || !SecondPerson) {
            console.error("all field are not fill");
            res.status(404).send("all field are not fill");
            return;
        }
        const ChatId = Utils.GenerateRandom(10);
        const call1 = await Utils.UpdateChatReference(FirstPerson, SecondPerson, ChatId);
        console.log("First User Chat Reference Update");
        const call2 = await Utils.UpdateChatReference(SecondPerson, FirstPerson, ChatId);
        console.log("Second User Chat Reference Update");
        const call3 = await Utils.StoreChats(true, FirstPerson, SecondPerson, ChatId, req, res);
        console.log("Chat are store into Database");
        if (call1 && call2 && call3) {
            res.status(200).send(ChatId);
        } else {
            res.status(404).send("Process Failed");
        }
    },
    GetChatReference: async (req, res) => {
        const username = req.query.username;
        if (!username) {
            res.status(404).send("not Filled");
            console.log('not Filled');
            return;
        }
        const parms = {
            "_id": username
        }
        try {
            const collection = db.collection('Default');
            const result = await collection.findOne(parms, { projection: { chatRefrences: 1, _id: 0 } });
            res.status(200).send(result.chatRefrences);
        } catch (error) {
            console.error(`Error \nLocation : GetChatReference \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : GetChatReference \nErrorType : ${error.message}`);
        }
    },
    HelperStoreChats: async (req, res) => {
        const ChatId = req.body.chatId;
        const From = req.body.From;
        const To = req.body.To;
        const response = await Utils.StoreChats(false, From, To, ChatId, req, res);
        if (response) {
            res.status(200).send("Completed");
        } else {
            res.status(404).send("Failed");
        }
    },
    SearchUser: async (req, res) => {
        const word = req.query.wordQuery;
        try {
            const collection = db.collection('Default');
            const result = await collection.find({ _id: { $regex: word, $options: "i" } }, { projection: { _id: 1, ProfilePhotoId: 1, DisplayName: 1 } }).limit(5).toArray();
            // console.log(result);
            res.status(200).send(result);
        } catch (error) {
            console.log(`Error \nLocation : SearchUser \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : SearchUser \nErrorType : ${error.message}`);
        }
    },
    StoreChats: (NewChat, From, To, ChatId, req, res) => {
        const Message = req.body.Message;
        if (IsInvalid(Message) || IsInvalid(NewChat) || IsInvalid(From) || IsInvalid(To) || IsInvalid(ChatId)) {
            console.log("All fields are not fill");
            return false;
        }
        return new Promise(async (resolve, reject) => {
            try {
                const collection = db.collection('Chats');
                const ChatStructure = {
                    To: To,
                    From: From,
                    Message: Message
                }
                if (NewChat) {
                    const parms = {
                        "_id": ChatId,
                        "Chats": [ChatStructure]
                    }
                    const result = await collection.insertOne(parms);
                    console.log("new Chat Inserted");
                    resolve("Done");
                } else {
                    const filter = {
                        "_id": ChatId
                    }
                    const Query = {
                        $push: { "Chats": ChatStructure }
                    }
                    const result = await collection.updateOne(filter, Query);
                    console.log("Chats Update!");
                    resolve("Done");
                }
                return true;
            } catch (error) {
                console.log(`Error \nLocation : StoreChats \nErrorType : ${error.message}`);
                reject("Failed");
                return false;
            }
        }).then(result => {
            console.log("Complete");
            return true;
        }).catch(error => {
            console.log("Done");
            console.error(`Error \nLocation : StoreChats \nErrorType : ${error.message}`);
            return false;
        })
    },
    UpdateChatReference: (FirstPerson, SecondPerson, ChatId) => {
        const parms = {
            "ChaID": ChatId,
            "UserName": SecondPerson
        }
        const filter = {
            "_id": FirstPerson
        }
        const Query = {
            $push: { "chatRefrences": parms }
        }
        return new Promise(async (resolve, reject) => {
            try {
                const collection = db.collection('Default');
                await collection.updateOne(filter, Query);
                resolve("Done");
                return true;
            } catch (error) {
                console.log(`Error \nLocation : UpdateChatReference \nErrorType : ${error.message}`);
                reject("Failed");
                return false;
            }
        })
    },
    GetUserPhoto: async (req, res) => {
        const username = req.body.username;
        const parms = {
            "_id": username
        }
        try {
            const collection = db.collection('Default');
            const result = await collection.findOne(parms, { projection: { ProfilePhotoId: 1, _id: 0 } });
            res.status(200).send(result);
            return;
        } catch (error) {
            console.log(`Error \nLocation : GetUserPhoto \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : GetUserPhoto \nErrorType : ${error.message}`);
            return;
        }
    },
    GetChats: async (req, res) => {
        const chatId = req.query.chatId;
        console.log(chatId);
        console.log("Get Chats Called");
        try {
            const parms = {
                _id: chatId
            }
            const collection = db.collection("Chats");
            const result = await collection.findOne(parms, { projection: { Chats: 1 } });
            res.status(200).send(result.Chats);
        } catch (error) {
            console.log(`Error \nLocation : GetChats \nErrorType : ${error.message}`);
            res.status(404).send(`Error \nLocation : GetChats \nErrorType : ${error.message}`);
        }
    },
    GetCurrentClientID: async (req, res) => {
        try {
            const userid = req.query.userId;
            const parms = {
                _id: userid
            }
            const collection = db.collection('Default');
            const result = await collection.findOne(parms, { projection: { currentClientId: 1, _id : 0 } });
            res.status(200).send(result.currentClientId);
        }
        catch (error) {
            res.status(404).send(`Error \nLocation : GetCurrentClientId \nErrorType : ${error.message}`);
            console.log(res.status(404).send(`Error \nLocation : GetChats \nErrorType : ${error.message}`));
        }
    }
}

// // websocket client to send updated data
// import client from 'socket.io-client';
// //realtime updates
// const listner = {
//     RealTimeChatReference: async () => {
//         const io = client.connect("http://localhost:8080");
//         io.on("connect", () => {
//             console.log("Listener connected to web socket");
//         });
//         if(!db){
//             console.log("DB is not initialize !");
//             db = await MongoClient();
//         }
//         const collection = db.collection('Default');
//         const watch = collection.watch([], { fullDocument: "updateLookup" });

//         watch.on("change", async (change) => {

//             // data from updated object
//             const ClientId = change.fullDocument.currentClientId;
//             const UpdateObject = change.updateDescription ? change.updateDescription.updatedFields : null;

//             console.log("New changes")
//             console.log("Client ID: -", ClientId);
//             console.log("Update Object: -", UpdateObject);
//             const data = {
//                 ClientID: ClientId,
//                 Object: UpdateObject
//             };

//             //Emit change to web socket
//             if (UpdateObject != null && typeof UpdateObject == "object") {
//                 console.log("Data Send to Socket");
//                 await io.emit("RealTimeChatReference", data);
//             }
//         });
//     }

// }
// listner.RealTimeChatReference();


export { Utils };