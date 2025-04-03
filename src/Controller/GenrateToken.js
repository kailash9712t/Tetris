import jwt from 'jsonwebtoken';
import 'dotenv/config';
const GenerateJwtToken = async (req,res) => {
    const {username} = req.body;
    const token = jwt.sign(  
        {
            Username : username
        },
        process.env.ACCESS_TOKEN_SECRET, 
        {
            expiresIn : process.env.ACCESS_TOKEN_EXPIRY
        }
    )
    console.log(token);
    return token;
}
const GenerateRefreshToken = (req,res) => {
    const {username} = req.body;
    const RefreshToken = jwt.sign(
        {
            Username : username
        },
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_EXPIRY
    )
    return RefreshToken;
}

export {GenerateJwtToken, GenerateRefreshToken};