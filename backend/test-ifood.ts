import { PrismaClient } from './src/generated/heart-client';
import axios from 'axios';

async function run() {
  const prisma = new PrismaClient();
  const integration = await prisma.tenantIntegration.findFirst({
    where: { provider: 'ifood' }
  });
  
  if (!integration) {
    console.log('No integration found');
    return;
  }

  const creds = integration.credentials as any;
  console.log('Creds:', { clientId: creds.clientId, merchantId: creds.merchantId });

  try {
    const tokenRes = await axios.post(
      'https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token',
      `grantType=client_credentials&clientId=${creds.clientId}&clientSecret=${creds.clientSecret}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const token = tokenRes.data.accessToken;
    console.log('Token acquired');

    // Test a simple GET request to check catalogs
    const getRes = await axios.get(
      `https://merchant-api.ifood.com.br/catalog/v2.0/merchants/${creds.merchantId}/catalogs`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('Catalogs:', JSON.stringify(getRes.data, null, 2));

    // Try creating a test item
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

  } catch (error: any) {
    console.log('ERROR:', error.response?.status, error.response?.statusText);
    console.log('DATA:', JSON.stringify(error.response?.data, null, 2));
    console.log('URL requested:', error.config?.url);
    console.log('Method:', error.config?.method);
  }
}
run();
