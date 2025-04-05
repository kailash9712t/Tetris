import express from 'express';
import 'dotenv/config';
import {router} from './src/Routes/UsersRoutes.js';

const app = express();


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/users',router);


// app.listen(process.env.PORT,() => { 
//     console.log("Backend Running...  ");
// });
app.use((error,req,res,next) => {
    console.error(error.stack);
    res.status(500).send(`Error \nLocation : App.js \nErrorType : ${error.message}`);
}) 
export default app;