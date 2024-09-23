import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

export const dataSource = new DataSource({
  name: "postgres",
  type: "postgres",
  host: "localhost",
  port: 5432,
  username: "gamevault",
  password: "gamevault",
  database: "gamevault",
  entities: ["dist/**/*.entity.js"],
  migrations: ["dist/src/modules/database/migrations/postgres/*.js"],
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: false,
  logging: true,
});
