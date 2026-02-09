require('dotenv').config();
import { BackboardAPIError, BackboardClient } from 'backboard-sdk';

const backboardKey = process.env.BACKBOARD_KEY;

if (!backboardKey) {
    console.warn('Backboard KEY is not set in the environment variable.');
}

const backboardClient = new BackboardClient({
    apiKey: backboardKey
});