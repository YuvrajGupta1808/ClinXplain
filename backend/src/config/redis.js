import dotenv from 'dotenv';
import { createClient } from 'redis';

dotenv.config();

const client = createClient({
    username: process.env.REDIS_USERNAME || 'default',
    password: process.env.REDIS_PASSWORD,
    socket: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '19294')
    }
});

client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
});

client.on('connect', () => {
    console.log('✓ Redis connection established');
});

client.on('ready', () => {
    console.log('✓ Redis client ready');
});

// Connect to Redis
async function connectRedis() {
    try {
        await client.connect();
        console.log('✓ Connected to Redis Cloud successfully');
        
        // Test connection
        await client.set('connection_test', 'success');
        const result = await client.get('connection_test');
        if (result === 'success') {
            console.log('✓ Redis connection test passed');
            await client.del('connection_test');
        }
    } catch (error) {
        console.error('❌ Failed to connect to Redis:', error);
        process.exit(1);
    }
}

export { client, connectRedis };
