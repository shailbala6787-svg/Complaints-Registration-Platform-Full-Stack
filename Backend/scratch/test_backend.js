
async function testServer() {
    try {
        const response = await fetch('http://localhost:3000/api/test-db');
        const data = await response.json();
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Fetch error:', error.message);
    }
}

testServer();
