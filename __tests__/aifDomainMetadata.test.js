import fs from "node:fs";

const pt = JSON.parse(fs.readFileSync("data/questions/aif-c01.json", "utf8"));
const en = JSON.parse(
  fs.readFileSync("data/questions/aif-c01-en.json", "utf8"),
);

describe("AIF B6.3.1 metadata parity", () => {
  test("new PT/EN pairs have equivalent canonical services", () => {
    const enBySource = new Map(
      en.map((question) => [question.questionId.replace(/-en$/, ""), question]),
    );
    const added = pt.filter((question) =>
      /aif-c01-(app|sec)-\d+$/.test(question.questionId),
    );
    expect(added).toHaveLength(20);
    for (const question of added) {
      const counterpart = enBySource.get(question.questionId);
      expect(counterpart).toBeDefined();
      const serviceIds = (question.services || []).map(
        (service) => service.service_id,
      );
      const counterpartIds = (counterpart.services || []).map(
        (service) => service.service_id,
      );
      expect(counterpartIds).toEqual(serviceIds);
      expect(serviceIds.length).toBeGreaterThan(0);
    }
  });

  test("new records retain valid structural metadata", () => {
    const records = [...pt, ...en].filter((question) =>
      /aif-c01-(app|sec)-\d+(-en)?$/.test(question.questionId),
    );
    for (const question of records) {
      expect(question.certId).toBe("aif-c01");
      expect(Array.isArray(question.services)).toBe(true);
      expect(
        question.services.every(
          (service) =>
            service.service_id && service.service_name && service.service_slug,
        ),
      ).toBe(true);
    }
  });
});
