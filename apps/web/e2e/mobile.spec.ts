import { expect, test } from "@playwright/test";

test("touch search, scheme reading and saved checklists work after reload", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("searchbox", { name: "Search schemes" })
    .fill("scholarship");
  await page.getByRole("button", { name: "Search", exact: true }).tap();
  await expect(page.getByTestId("catalogue-count")).toBeVisible();
  await page.getByRole("link", { name: "Read scheme" }).first().tap();
  await expect(
    page.getByRole("heading", { name: "Eligibility requirements" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save record", exact: true }).tap();
  await page
    .getByLabel("Document to add")
    .fill("Synthetic mobile preparation item");
  await page.getByRole("button", { name: "Add item", exact: true }).tap();
  const item = page.getByRole("checkbox", {
    name: "Synthetic mobile preparation item",
    exact: true,
  });
  await item.tap();
  await expect(item).toBeChecked();
  await page.reload();
  await expect(item).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Record saved", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("phone form controls remain readable without shrinking text", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/catalogue?q=scholarship",
    "/discover",
    "/signin",
  ]) {
    await page.goto(path);
    const controls = page.locator(
      'input:not([type="checkbox"]), textarea, select',
    );
    const sizes = await controls.evaluateAll((elements) =>
      elements
        .filter((element) => element.getBoundingClientRect().width > 0)
        .map((element) => ({
          field: element.id || element.tagName,
          size: parseFloat(getComputedStyle(element).fontSize),
        })),
    );
    expect(
      sizes.filter(({ size }) => size < 16),
      path,
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
});

test("translated category names remain readable on narrow phones", async ({
  page,
  context,
  baseURL,
}) => {
  for (const locale of ["en", "hi", "kn"]) {
    await context.addCookies([
      { name: "locale", value: locale, url: baseURL! },
    ]);
    await page.goto("/");
    const headings = page.locator(
      'section[aria-label] a[href^="/catalogue?q="] h3',
    );
    await expect(headings).toHaveCount(6);
    const clipped = await headings.evaluateAll((elements) =>
      elements
        .filter(
          (element) =>
            element.scrollWidth > element.clientWidth + 1 ||
            element.scrollHeight > element.clientHeight + 1,
        )
        .map((element) => element.textContent),
    );
    expect(clipped, locale).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      locale,
    ).toBe(true);
  }
});

test("mobile dock fits, marks the destination and leaves footer space", async ({
  page,
}) => {
  await page.goto("/saved");
  const dock = page.getByRole("navigation", { name: "Mobile quick dock" });
  if ((page.viewportSize()?.width ?? 0) >= 768) {
    await expect(dock).toBeHidden();
    return;
  }
  await expect(dock).toBeVisible();
  await expect(
    dock.getByRole("link", { name: "Saved", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const sizes = await dock.getByRole("link").evaluateAll((elements) =>
    elements.map((element) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
    })),
  );
  expect(sizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(
    true,
  );
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const clearance = await page.evaluate(() => {
    const footer = document.querySelector("footer")!.getBoundingClientRect();
    const dock = document
      .querySelector('nav[aria-label="Mobile quick dock"]')!
      .getBoundingClientRect();
    return footer.bottom <= dock.top;
  });
  expect(clearance).toBe(true);
  await dock.getByRole("link", { name: "Home", exact: true }).tap();
  await expect(page).toHaveURL(/\/$/);
});

test("drawer supports touch navigation and short landscape viewports", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).tap();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await drawer
    .getByRole("link", { name: "Find my schemes", exact: true })
    .tap();
  await expect(page).toHaveURL(/\/discover$/);
  await expect(drawer).not.toBeVisible();
  await expect(page.getByLabel("Tell us about yourself")).toBeVisible();
  await page.getByRole("button", { name: "Enter details manually" }).tap();
  const age = page.getByLabel("Age", { exact: true });
  await age.fill("20");
  await expect(age).toHaveValue("20");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
