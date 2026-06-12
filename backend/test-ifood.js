const mysql = require('mysql2/promise');
const axios = require('axios');

async function run() {
  const connection = await mysql.createConnection({
    host: '7bar_mysql',
    user: 'root',
    password: '7bar_password',
    database: 'heart'
  });

  const [rows] = await connection.execute('SELECT credentials FROM TenantIntegration WHERE provider = ?', ['ifood']);
  if (rows.length === 0) {
    console.log('No integration found');
    return;
  }
  const creds = JSON.parse(rows[0].credentials);
  console.log('Creds:', { clientId: creds.clientId, merchantId: creds.merchantId });

  try {
    const tokenRes = await axios.post(
      'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
      `grantType=client_credentials&clientId=${creds.clientId}&clientSecret=${creds.clientSecret}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const token = tokenRes.data.accessToken;
    console.log('Token acquired');

    const putUrl = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${creds.merchantId}/items`;
    console.log('PUT URL:', putUrl);
    
    await axios.put(
      putUrl,
      {
        item: {
          id: "00000000-0000-0000-0000-000000000001",
          type: 'DEFAULT',
          status: 'AVAILABLE',
          price: { value: 10.0 },
          externalCode: "TEST-001"
        },
        products: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            name: "Test Product API",
            externalCode: "TEST-001"
          }
        ],
        optionGroups: [],
        options: []
      },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    console.log('Item created successfully!');

  } catch (error) {
    console.log('ERROR:', error.response?.status, error.response?.statusText);
    console.log('DATA:', JSON.stringify(error.response?.data, null, 2));
  }
  await connection.end();
}
run();
