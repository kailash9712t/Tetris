import { MongoClient, ServerApiVersion } from "mongodb";
const URL = process.env.MONGO_DB_CONNECTION_URL;
let client = null;
let DBInstance = null;
async function Start() {
    try{
        if(!client){
            console.log("New Connection");
            client = new MongoClient(URL,{
                serverApi: {
                    version : ServerApiVersion.v1,
                    strict : true,
                    deprecationErrors : true,
                    useUnifiedTopology : true
                }
            })
            await client.connect();
            DBInstance = client.db("UserData");

            //handle error
            client.on("error",(error) => {
                console.log(`Error \nLocation : MongoInitialConnection \nErrorType : ${error.message}`)
            })

            // on close reconnect
            client.on("close",() => {
                console.log("MongoDB Disconnected");
                setTimeout(async () => {
                    try{
                        await client.connect();
                        console.log("Reconnect to mongoDB is seccesfull")
                    }catch(error){
                        console.log("Error \n Reconnect :", error.message);
                    }
                },5000);
            });
        }else{
            console.log("Already Connected");
        }
        console.log("Mongo DB Connected");
        return DBInstance;
    } catch(error){
        console.log("Error : - ",error.message);
        return null;
    } 
}
export default Start;