const mysql = require('mysql2/promise');
const axios = require('axios');
const crypto = require('crypto');

async function run() {
  const connection = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3308,
    user: 'root',
    password: '7bar@2025',
    database: 'heart'
  });

  const [rows] = await connection.execute("SELECT credentials FROM tenant_integrations WHERE provider = 'ifood'");
  if (rows.length === 0) return;
  
  const creds = typeof rows[0].credentials === 'string' ? JSON.parse(rows[0].credentials) : rows[0].credentials;
  const merchantId = '2512d07e-9c9b-4c2a-98a3-5e899ba550ee'; 
  
  try {
    const tokenRes = await axios.post(
      'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
      `grantType=client_credentials&clientId=${creds.clientId}&clientSecret=${creds.clientSecret}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const token = tokenRes.data.accessToken;

    const catRes = await axios.get(
      `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const catalogId = catRes.data[0].catalogId;
    console.log('Catalog ID:', catalogId);

    // Get existing categories
    let categoryId = null;
    try {
      const cats = await axios.get(
        `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (cats.data && cats.data.length > 0) {
        categoryId = cats.data[0].id;
        console.log('Found category:', cats.data[0].name, categoryId);
      }
    } catch (e) {}

    // Create a new category if none
    if (!categoryId) {
      categoryId = crypto.randomUUID();
      console.log('Creating category:', categoryId);
      await axios.post(
        `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/catalogs/${catalogId}/categories`,
        {
          id: categoryId,
          name: "Geral",
          status: "AVAILABLE",
          template: "DEFAULT"
        },
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
      );
    }

    const putUrl = `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${merchantId}/items`;
    const validUuid = crypto.randomUUID();

    await axios.put(
      putUrl,
      {
        item: {
          id: validUuid,
          type: 'DEFAULT',
          categoryId: categoryId,
          status: 'AVAILABLE',
          price: { value: 10.0 },
          externalCode: "TEST-001",
          productId: validUuid
        },
        products: [
          {
            id: validUuid,
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
