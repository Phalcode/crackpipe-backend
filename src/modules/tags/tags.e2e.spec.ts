import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Builder } from "builder-pattern";
import { Repository } from "typeorm/repository/Repository";

import { AppModule } from "../../app.module";
import { Game } from "../games/game.entity";
import { Tag } from "./tag.entity";
import { TagsController } from "./tags.controller";

describe("/api/tags", () => {
  let tagsController: TagsController;
  let tagRepository: Repository<Tag>;
  let gameRepository: Repository<Game>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    tagsController = moduleRef.get<TagsController>(TagsController);
    tagRepository = moduleRef.get<Repository<Tag>>(getRepositoryToken(Tag));
    gameRepository = moduleRef.get<Repository<Game>>(getRepositoryToken(Game));
  });

  afterEach(async () => {
    gameRepository.clear();
    tagRepository.clear();
  });

  it("GET /api/tags/", async () => {
    const testingTag: Tag = new Tag();
    testingTag.name = "stealth";
    testingTag.rawg_id = 1337;
    await tagRepository.save(testingTag);

    const results = await tagsController.getTags({
      path: "",
    });
    expect(results.data.length).toBe(1);
    expect(results.data[0].rawg_id).toBe(1337);
    expect(results.data[0].name).toBe("stealth");
  });

  it("should sort tags by the amount of games tagged with them", async () => {
    const tag1: Tag = Builder(Tag).name("stealth").rawg_id(1111).build();
    const tag2: Tag = Builder(Tag).name("action").rawg_id(2222).build();
    await tagRepository.save([tag1, tag2]);

    await gameRepository.save(
      Builder(Game)
        .title("Testgame")
        .file_path("filepath.zip")
        .early_access(false)
        .tags([tag2])
        .build(),
    );

    const results = await tagsController.getTags({
      path: "",
    });
    expect(results.data.length).toBe(2);
    expect(results.data[0].rawg_id).toBe(2222);
    expect(results.data[0].name).toBe("action");
    expect(results.data[1].rawg_id).toBe(1111);
    expect(results.data[1].name).toBe("stealth");
  });
});
