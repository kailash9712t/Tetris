import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import 'dotenv/config'

const client = new DynamoDBClient({
    region : process.env.AWS_REGION,
    credentials : {
        accessKeyId : process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey : process.env.AWS_SECRET_ACCESS_KEY
    }
})

const dynamoDb = DynamoDBDocumentClient.from(client);
export default dynamoDb;