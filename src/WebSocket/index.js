import { v4 as uuid } from "uuid";
export default (io) => {
    let Clients = new Map();
    io.on('connection', (socket) => {
        console.log("Client Connected");
        const Client = new ClientConnection(socket);
        Clients.set(Client.id,Client);
    });
    // add uuid
    // add to here
    class ClientConnection{
        constructor(socket){
            this.socket = socket;
            this.id = uuid();
            this.HandleRoutes();
        }
        HandleRoutes(){
            this.SendData("ClientID",this.id);
            this.socket.on('RealTimeChatReference',(data) => this.RealTimeChatReference(data));
            this.socket.on("RealTimeChat",(data) => this.RealTimeChats(data));
            this.socket.on("disconnect",() => this.Disconnect());
        }
        SendData(Route, Data){
            this.socket.emit(Route,Data);
        }
        RealTimeChatReference(data){
            const ClientID = data.ClientID;
            const DataObject = data.Object;
            const TargetUser = Clients.get(ClientID);
            const RequireKey = Object.keys(DataObject)[0];
            console.log(`********** ${RequireKey}  ${DataObject[RequireKey]} *************`);
            if(TargetUser){
                TargetUser.SendData("RealTimeChatReference",DataObject[RequireKey]);
            }else{
                console.log("This Client Not In Web Socket");
            }
        }
        RealTimeChats(data){
            const ClientID = data.ClientID;
            const DataObject = data.Object;
            const TargetUser = Clients.get(ClientID);
            if(TargetUser){ 
                TargetUser.SendData("RealTimeChat",DataObject);
                console.log("newMessage");
                console.log(ClientID);
                console.log(DataObject);
            }else{
                console.log("This Client Not Tn Web Socket");
            }
        }
        Disconnect(){
            this.socket.removeAllListeners();
            Clients.delete(this.id);
        }

    }
}