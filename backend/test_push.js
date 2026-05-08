const { execSync } = require('child_process');
const path = require('path');

const prismaSchemaPath = path.resolve(__dirname, 'prisma', 'schema.prisma');
const tenantDbUrl = 'mysql://root:7bar%402025@localhost:3307/artcoco_test';

try {
  console.log('Running prisma db push...');
  const output = execSync(`npx prisma db push --schema="${prismaSchemaPath}" --skip-generate`, {
    env: { ...process.env, DATABASE_URL_TENANT: tenantDbUrl },
    encoding: 'utf8'
  });
  console.log('SUCCESS:');
  console.log(output);
} catch (err) {
  console.error('ERROR OCCURRED!');
  console.error(err.message);
  console.error('STDOUT:', err.stdout);
  console.error('STDERR:', err.stderr);
}
