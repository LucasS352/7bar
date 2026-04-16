"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: [
            'http://localhost:3521',
            'http://localhost:3000',
            'http://179.127.59.225:3521',
            'https://7bar.smartek.com.br',
            'http://7bar.smartek.com.br',
        ],
        credentials: true,
    });
    await app.listen(process.env.PORT ?? 3520, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map