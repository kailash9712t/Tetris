import jwt from 'jsonwebtoken';
import 'dotenv/config';
const verifyJwt = async (req, res, next) => {
    console.log("check");
    try {
        const rawHeader = req.headers["authorization"];
        const token = rawHeader.split(" ")[1];
        console.log(token);
        if (!token) {
            res.send("invalid request");
        } else {
            jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(error,decode) => {
                if(error){
                    res.send("InValid User");
                    return;
                }else{
                    console.log("ok Valid reqeuest");
                    next();
                }
            });
        }
    } catch (error) {
        console.log(`Error \nLocation : verifyJwt \nErrorType : ${error.message}`);
    }
}
export { verifyJwt }; 