const { chromium } = require(
  process.env.PAPERPLANE_PLAYWRIGHT_PATH || "playwright",
);
const { mkdtemp, readFile, mkdir } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

(async () => {
  const profile = await mkdtemp(path.join(tmpdir(), "paperplane-verify-"));
  const launch = () =>
    chromium.launchPersistentContext(profile, {
      headless: true,
      ...(process.env.PAPERPLANE_BROWSER_EXECUTABLE
        ? { executablePath: process.env.PAPERPLANE_BROWSER_EXECUTABLE }
        : {}),
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
      args: ["--disable-gpu", "--disable-background-networking"],
    });
  let context;
  const errors = [];
  try {
    context = await launch();
    context.setDefaultTimeout(10000);
    let page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3001/");
    await page
      .getByRole("heading", { name: "Your boards 3", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "✳ A clean slate FREEFORM", exact: true })
      .click();
    await page
      .getByLabel("Board title", { exact: true })
      .fill("Persistence check");
    await page.getByLabel("Board title", { exact: true }).press("Tab");
    await page
      .locator("label")
      .filter({
        has: page.getByRole("radio", { name: "Rectangle", exact: true }),
      })
      .click();
    await page.mouse.move(430, 300);
    await page.mouse.down();
    await page.mouse.move(670, 440, { steps: 12 });
    await page.mouse.up();
    await page.getByText("Saved locally", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Back to boards", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Preview of Persistence check/ })
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: /Preview of Persistence check/ })
      .waitFor();
    assert.match(
      await page
        .getByRole("button", { name: /Preview of Persistence check/ })
        .innerText(),
      /1 elements/,
    );
    console.log("PASS: drawing and board name survive reload");
    await context.close();
    context = await launch();
    context.setDefaultTimeout(10000);
    page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("http://127.0.0.1:3001/");
    await page
      .getByRole("button", { name: /Preview of Persistence check/ })
      .click();
    console.log("PASS: drawing survives closing and reopening the browser");
    for (const [label, extension] of [
      ["PNG image", "png"],
      ["SVG vector", "svg"],
      ["Editable .excalidraw", "excalidraw"],
    ]) {
      await page.getByRole("button", { name: "Export", exact: true }).click();
      const promise = page.waitForEvent("download", { timeout: 15000 });
      await page.getByRole("button", { name: label, exact: true }).click();
      const download = await promise;
      const destination = path.join(profile, `board.${extension}`);
      await download.saveAs(destination);
      const bytes = await readFile(destination);
      assert.ok(bytes.length > 20, `${extension} is not empty`);
      if (extension === "png")
        assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
      if (extension === "svg") assert.match(bytes.toString(), /<svg/);
      if (extension === "excalidraw")
        assert.equal(JSON.parse(bytes).elements.length, 1);
      console.log(`PASS: ${extension} export produces a usable file`);
    }
    await page
      .getByRole("button", { name: "Back to boards", exact: true })
      .click();
    await page
      .locator("input[type=file]")
      .setInputFiles(path.join(profile, "board.excalidraw"));
    await page.getByLabel("Board title", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Board title", { exact: true }).inputValue(),
      "board",
    );
    console.log("PASS: editable backup imports into a new board");
    await page
      .getByRole("button", { name: "Back to boards", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Options for Persistence check",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    await page
      .getByRole("button", { name: /Preview of Persistence check copy/ })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Favorite Persistence check copy",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Favorites 1", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Preview of Persistence check copy/ })
      .waitFor();
    await page
      .getByLabel("Search boards", { exact: true })
      .fill("no-matching-board");
    await page
      .getByRole("heading", { name: "No boards found", exact: true })
      .waitFor();
    console.log("PASS: duplication, favorites and search");
    await page.getByLabel("Search boards", { exact: true }).fill("");
    await page.getByRole("button", { name: /All boards/ }).click();
    const screenshotDir = path.join(__dirname, "..", ".verification");
    await mkdir(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, "studio.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page
        .getByRole("button", { name: "Create a board", exact: true })
        .isVisible(),
    );
    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    assert.equal(noOverflow, true, "mobile has no horizontal overflow");
    await page.screenshot({
      path: path.join(screenshotDir, "mobile.png"),
      fullPage: true,
    });
    console.log("PASS: mobile layout fits the viewport");
    assert.deepEqual(errors, []);
    console.log("PASS: no browser JavaScript errors");
  } finally {
    if (context) await context.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
