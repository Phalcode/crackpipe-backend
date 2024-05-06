import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { DatabaseService } from "../database/database.service";
import { HealthModule } from "../health/health.module";
import { AdminController } from "./admin.controller";

@Module({
  imports: [HealthModule, DatabaseModule],
  controllers: [AdminController],
  providers: [DatabaseService],
})
export class AdminModule {}
