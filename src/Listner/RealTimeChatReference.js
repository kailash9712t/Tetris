import MongoClinet from '../Model/ConnectMongo.js';
import client from 'socket.io-client';
const Listener = {
    ChatReference : async () => {
        const db = await MongoClinet();
        const io = client.connect(`http://localhost:${process.env.PORT}`);
        const collection = db.collection("Default");
        const watch = collection.watch([],{fullDocument : "updateLookup"});
        console.log("Listener on");
        watch.on("change",async (Change) => {
            const ClientId = Change.fullDocument.currentClientId;
            const UpdateObject = Change.updateDescription ? Change.updateDescription.updateFields : null;
            console.log("New changes")
            console.log("Client ID: -", ClientId);
            console.log("Update Object: -", UpdateObject);

            const data = {
                ClientID : ClientId,
                Object : UpdateObject
            };
            if(UpdateObject != null && typeof UpdateObject == 'object'){
                console.log("Data send to socket");
                await io.emit("RealTimeChatReference",data);
            }
        })
    }
}
export default Listener;