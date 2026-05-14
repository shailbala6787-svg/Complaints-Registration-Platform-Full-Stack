
async function testLogin() {
    try {
        const response = await fetch('http://localhost:3000/api/test-db');
        console.log('DB Connection Check Status:', response.status);
        
        const loginRes = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'shailbala6787@gmail.com',
                password: 'Neha@1234'
            })
        });
        
        const data = await loginRes.json();
        console.log('Login Status:', loginRes.status);
        console.log('Login Result:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

testLogin();
