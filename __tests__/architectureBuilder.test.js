import { readFileSync } from "node:fs";
import {
  getContextualPalette,
  attachIconFallbacks,
  normalizeBuilderConfig,
  renderServiceIcon,
  resolveBuilderService,
  scoreBuilderServices,
} from "../src/frontend/js/cases/architectureBuilder.js";

const cases = JSON.parse(
  readFileSync(new URL("../data/cases/architecture_cases.json", import.meta.url), "utf8"),
);
const pilot = cases.find((item) => item.slug === "blog-estatico-ddos");

describe("Architecture Builder contract", () => {
  test("pilot exposes an explicit, solvable contract", () => {
    const config = normalizeBuilderConfig(pilot);
    expect(config.legacy).toBe(false);
    expect(config.required_services).toEqual(["amazon-s3", "amazon-cloudfront"]);
    expect(config.required_connections).toEqual([["amazon-cloudfront", "amazon-s3"]]);

    const palette = getContextualPalette(pilot);
    expect(palette.map(({ slug }) => slug)).toEqual(expect.arrayContaining([
      "amazon-s3",
      "amazon-cloudfront",
      "aws-certificate-manager",
      "amazon-route53",
      "aws-waf",
      "amazon-ec2",
      "amazon-rds",
      "amazon-api-gateway",
    ]));
    expect(palette).toHaveLength(8);
    expect(config.required_services.every((slug) => palette.some((service) => service.slug === slug))).toBe(true);
  });

  test("required services define the score; optional and distractors do not", () => {
    const complete = scoreBuilderServices(["amazon-s3", "amazon-cloudfront"], pilot);
    const withOptional = scoreBuilderServices([
      "amazon-s3",
      "amazon-cloudfront",
      "aws-certificate-manager",
    ], pilot);
    const withDistractor = scoreBuilderServices([
      "amazon-s3",
      "amazon-cloudfront",
      "amazon-ec2",
    ], pilot);
    const duplicate = scoreBuilderServices([
      "amazon-s3",
      "amazon-s3",
      "amazon-cloudfront",
    ], pilot);

    expect(complete.score).toBe(100);
    expect(withOptional.score).toBe(100);
    expect(withOptional.extra).toHaveLength(0);
    expect(withDistractor.score).toBe(100);
    expect(withDistractor.extra).toEqual(["amazon-ec2"]);
    expect(duplicate.score).toBe(100);
    expect(duplicate.selected.size).toBe(2);
  });

  test("service icon contract renders Font Awesome and URL icons distinctly", () => {
    const fontAwesome = renderServiceIcon({
      name: "Amazon S3",
      icon: { type: "fontawesome", value: "fa-solid fa-bucket" },
    });
    const remote = renderServiceIcon({
      name: "Amazon CloudFront",
      icon: { type: "url", value: "https://example.test/cloudfront.svg" },
    });
    const missing = renderServiceIcon({ name: "Unknown service" });

    expect(fontAwesome).toContain('<i class="fa-solid fa-bucket');
    expect(fontAwesome).not.toContain("<img");
    expect(remote).toContain('<img src="https://example.test/cloudfront.svg"');
    expect(remote).toContain('alt="Amazon CloudFront"');
    expect(missing).toContain("fa-solid fa-cloud");
    expect(remote).not.toContain("src=\"fa-");
  });

  test("broken remote icons are replaced with a local fallback", () => {
    document.body.innerHTML = renderServiceIcon({
      name: "Remote service",
      icon: { type: "url", value: "https://example.test/broken.svg" },
    });
    const image = document.querySelector("img[data-service-icon=\"url\"]");
    attachIconFallbacks(document.body);
    image.dispatchEvent(new Event("error"));
    expect(document.querySelector("img[data-service-icon=\"url\"]")).toBeNull();
    expect(document.querySelector(".builder-icon-fallback")).not.toBeNull();
  });

  test("pilot service lookup prefers canonical presentation metadata", () => {
    const cloudFront = resolveBuilderService("amazon-cloudfront", pilot);
    expect(cloudFront.slug).toBe("amazon-cloudfront");
    expect(cloudFront.name).toBe("Amazon CloudFront");
    expect(cloudFront.icon.type).toBe("url");
  });

  test("all migrated Cases expose a canonical, solvable Builder contract", () => {
    expect(cases).toHaveLength(25);
    for (const item of cases) {
      const config = normalizeBuilderConfig(item);
      const palette = getContextualPalette(item);
      const paletteKeys = new Set(palette.map((service) => service.slug));

      expect(config.legacy).toBe(false);
      expect(config.required_services.length).toBeGreaterThan(0);
      expect(config.required_services.every((slug) => paletteKeys.has(slug))).toBe(true);
      expect(config.required_connections.every(([source, target]) =>
        [...config.required_services, ...config.optional_services, ...config.distractors]
          .includes(source) && [...config.required_services, ...config.optional_services, ...config.distractors]
          .includes(target),
      )).toBe(true);

      const complete = scoreBuilderServices(config.required_services, item);
      expect(complete.score).toBe(100);

      if (config.optional_services.length > 0) {
        expect(scoreBuilderServices([
          ...config.required_services,
          ...config.optional_services,
        ], item).score).toBe(100);
      }
      if (config.distractors.length > 0) {
        const withDistractor = scoreBuilderServices([
          ...config.required_services,
          config.distractors[0],
        ], item);
        expect(withDistractor.score).toBe(100);
        expect(withDistractor.extra).toContain(config.distractors[0]);
      }

      for (const service of palette) {
        const markup = renderServiceIcon(service);
        expect(markup).not.toContain('<img src="fa-');
        expect(markup).not.toContain('src="undefined"');
        expect(markup).toContain("data-service-icon");
      }
    }
  });
});
