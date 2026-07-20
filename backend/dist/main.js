"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const nestjs_pino_1 = require("nestjs-pino");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.enableCors({
        origin: '*',
        credentials: true,
    });
    const configService = app.get(config_1.ConfigService);
    const port = configService.get('PORT', 8080);
    await app.listen(port);
    console.log(`🚀 LinkedIn Post Agent Backend running on: http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map