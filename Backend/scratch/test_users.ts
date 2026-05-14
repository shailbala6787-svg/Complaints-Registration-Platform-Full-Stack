
import { db } from '../db';
import { users } from '../schema';

async function testUsers() {
    try {
        const allUsers = await db.select().from(users);
        console.log('Total users:', allUsers.length);
        if (allUsers.length > 0) {
            console.log('First user:', JSON.stringify(allUsers[0], null, 2));
        }
    } catch (error) {
        console.error('DB Users Error:', error);
    }
}

testUsers();
