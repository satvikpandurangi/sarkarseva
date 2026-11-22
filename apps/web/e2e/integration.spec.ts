import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a hanging voice request can be cancelled without losing typed details", async ({
  page,
}) => {
  await page.route("**/api/v1/capabilities", (route) =>
    route.fulfill({ json: { speech: true, profile_extraction: true } }),
  );
  await page.route("**/api/v1/speech/transcribe?*", () => {});
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      value: {
        getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }),
      },
    });
    Object.defineProperty(window, "MediaRecorder", {
      value: class {
        static isTypeSupported() {
          return true;
        }
        state = "inactive";
        mimeType = "audio/webm";
        ondataavailable: ((event: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        onerror = null;
        start() {
          this.state = "recording";
          setTimeout(() => {
            this.ondataavailable?.({
              data: new Blob(["synthetic audio"], { type: "audio/webm" }),
            });
            this.stop();
          }, 250);
        }
        stop() {
          this.state = "inactive";
          this.onstop?.();
        }
      },
    });
    Object.defineProperty(window, "AudioContext", {
      value: class {
        state = "running";
        close() {
          return Promise.resolve();
        }
        createMediaStreamSource() {
          return { connect() {} };
        }
        createAnalyser() {
          return {
            fftSize: 2048,
            getByteTimeDomainData(data: Uint8Array) {
              data.fill(155);
            },
          };
        }
      },
    });
  });
  await page.goto("/discover");
  const input = page.getByLabel("Tell us about yourself");
  await input.fill("I am a student");
  await page.getByRole("button", { name: "Speak instead" }).click();
  await page.getByRole("button", { name: "Cancel voice request" }).click();
  await expect(
    page.getByRole("button", { name: "Speak instead" }),
  ).toBeEnabled();
  await expect(input).toHaveValue("I am a student");
  await expect(
    page.getByRole("button", { name: "Transcribing…" }),
  ).not.toBeVisible();
});

test("Discover browses imported records instead of an empty reviewed-only list", async ({
  page,
}) => {
  await page.goto("/discover");
  await expect(page.getByTestId("discover-catalogue-count")).toContainText(
    "3,397",
    { timeout: 5000 },
  );
  await expect(
    page.getByRole("link", { name: "Read scheme" }).first(),
  ).toBeVisible();
});

test("unconfigured voice is disabled before requesting microphone access", async ({
  page,
}) => {
  await page.route("**/api/v1/capabilities", (route) =>
    route.fulfill({ json: { speech: false, profile_extraction: false } }),
  );
  await page.goto("/discover");
  await expect(
    page.getByRole("button", { name: "Speak instead" }),
  ).toBeDisabled({ timeout: 5000 });
  await expect(
    page.getByText(
      "Voice is not available right now. You can type or enter your details manually.",
    ),
  ).toBeVisible();
});

// Run against real local API/data with the live integration configuration.
test("SarkarSeva search reaches the catalogue and opens a real scheme", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Search schemes" })
    .fill("scholarship");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page).toHaveURL(/\/catalogue\?q=scholarship/);
  await expect(page.getByTestId("catalogue-count")).toContainText(/\d/);
  await page.getByRole("link", { name: "Read scheme" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Eligibility requirements" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Documents to prepare" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("unverified");
});

test("assistant retrieves cited records and honestly handles no matches", async ({
  page,
}) => {
  await page.goto("/assistant");
  await page.getByLabel("Your question").fill("scholarship");
  await page.getByRole("button", { name: "Find answers" }).click();
  await expect(
    page.getByRole("link", { name: /Read source record/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Retrieved passages", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Your question").fill("zzzznonexistentscheme987654");
  await page.getByRole("button", { name: "Find answers" }).click();
  await expect(
    page.getByText(/I could not find supporting scheme records/),
  ).toBeVisible();
});

test("a saved reference and preparation checklist survive reload", async ({
  page,
}) => {
  await page.goto("/catalogue?q=scholarship");
  await page.getByRole("link", { name: "Read scheme" }).first().click();
  await expect(page).toHaveURL(/\/catalogue\/[^?]+$/);
  await expect(
    page.getByRole("button", { name: "Save record", exact: true }),
  ).toBeVisible();
  const name = await page.getByRole("heading", { level: 1 }).innerText();
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Record saved" }),
  ).toBeVisible();
  await page
    .getByLabel("Document to add")
    .fill("Document I checked with the department");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Document I checked with the department",
      exact: true,
    })
    .check();
  await page
    .getByLabel("Document to add")
    .fill("Additional supporting document");
  await page.getByRole("button", { name: "Add item", exact: true }).click();
  await expect(
    page.getByRole("checkbox", {
      name: "Additional supporting document",
      exact: true,
    }),
  ).not.toBeChecked();
  await page.reload();
  await expect(
    page.getByRole("checkbox", {
      name: "Document I checked with the department",
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Additional supporting document",
      exact: true,
    }),
  ).not.toBeChecked();
  await page.goto("/saved");
  await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
});

for (const width of [320, 375, 1280]) {
  test(`merged screens remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/catalogue",
      "/assistant",
      "/discover",
      "/dashboard",
    ]) {
      await page.goto(route);
      await expect(page.getByRole("main")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
  });
}

for (const width of [320, 1280]) {
  test(`new public screens meet accessibility checks at ${width}px`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/catalogue?q=scholarship", "/assistant"]) {
      await page.goto(route);
      if (route.startsWith("/catalogue"))
        await expect(page.getByTestId("catalogue-count")).toBeVisible();
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        scan.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath(
          `${route === "/" ? "home" : route.startsWith("/catalogue") ? "catalogue" : "assistant"}-${width}.png`,
        ),
        fullPage: false,
      });
    }
  });
}

test("manual profile produces preliminary matches from the real dataset", async ({
  page,
}) => {
  await page.goto("/discover");
  await page.getByRole("button", { name: "Enter details manually" }).click();
  await page.getByLabel("Age", { exact: true }).fill("20");
  await page
    .getByRole("button", { name: "Education & Student Aid", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm my details" }).click();
  await page.getByRole("link", { name: "See my recommendations" }).click();
  await expect(page.locator(".match-card").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.locator(".match-card").first()).toContainText(
    "Preliminary",
  );
  await page.goBack();
  const deletion = page.waitForResponse(
    (response) => response.request().method() === "DELETE",
  );
  await page.getByRole("button", { name: "Clear my details" }).click();
  expect((await deletion).status()).toBe(204);
  await expect(page.getByLabel("Age", { exact: true })).not.toBeVisible();
});

test("category filter remains selected on a direct link and after reload", async ({
  page,
}) => {
  await page.goto("/catalogue?category=Education%20%26%20Learning");
  await expect(page.getByTestId("catalogue-count")).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
    "Education & Learning",
  );
  await page.reload();
  await expect(page.getByTestId("catalogue-count")).toBeVisible();
  await expect(page.getByLabel("Category", { exact: true })).toHaveValue(
    "Education & Learning",
  );
});
