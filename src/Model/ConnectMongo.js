import { MongoClient, ServerApiVersion } from "mongodb";
const URL = process.env.MONGO_DB_CONNECTION_URL;
const client = new MongoClient(URL,{
    serverApi: {
        version : ServerApiVersion.v1,
        strict : true,
        deprecationErrors : true,
        useUnifiedTopology : true
    }
})
async function Start() {
    try{
        await client.connect();
        client.on("error",(error) => {
            console.log(`Error \nLocation : MongoInitialConnection \nErrorType : ${error.message}`)
        })
        console.log("Mongo DB Connected");
        return client.db("UserData");
    } catch(error){
        console.log("Error : - ",error.message);
        return null;
    } 
}
export default Start;