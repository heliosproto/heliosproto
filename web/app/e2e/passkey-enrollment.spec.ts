import { type BrowserContext, expect, test } from "@playwright/test";

async function addVirtualAuthenticator(context: BrowserContext): Promise<string> {
  const client = await context.newCDPSession(await context.pages()[0]);
  const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      isUserVerified: true,
    },
  });
  return authenticatorId;
}

async function setupVirtualAuthenticator(context: BrowserContext): Promise<void> {
  await addVirtualAuthenticator(context);
}

test.describe("Passkey enrollment onboarding", () => {
  test("fresh visit creates credential and shows predicted address", async ({ page, context }) => {
    await setupVirtualAuthenticator(context);
    await page.goto("/onboard");

    await expect(page.getByRole("heading", { name: "Create Your Wallet" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Wallet" })).toBeVisible();

    await page.getByRole("button", { name: "Create Wallet" }).click();

    await expect(page.getByRole("heading", { name: "Wallet Created" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("Public Key")).toBeVisible();
    await expect(page.getByText("Predicted Account Address")).toBeVisible();
    await expect(
      page.getByText("Fund this address to start using your Helios wallet"),
    ).toBeVisible();

    const addressText = page.locator("code").nth(1);
    await expect(addressText).toHaveText(/^[A-Z2-7]{56}$/);
  });

  test("reload reuses existing credential", async ({ page, context }) => {
    await setupVirtualAuthenticator(context);
    await page.goto("/onboard");

    await page.getByRole("button", { name: "Create Wallet" }).click();
    await expect(page.getByRole("heading", { name: "Wallet Created" })).toBeVisible({
      timeout: 15_000,
    });

    const addressAfterCreate = await page.locator("code").nth(1).textContent();

    await page.reload();
    await expect(page.getByRole("heading", { name: "Wallet Created" })).toBeVisible({
      timeout: 15_000,
    });

    const addressAfterReload = await page.locator("code").nth(1).textContent();
    expect(addressAfterReload).toBe(addressAfterCreate);
  });

  test("cancelled ceremony shows friendly error", async ({ page, context }) => {
    await setupVirtualAuthenticator(context);
    await page.goto("/onboard");

    const client = await context.newCDPSession(page);
    const { authenticatorId } = await client.send("WebAuthn.addVirtualAuthenticator", {
      options: {
        protocol: "ctap2",
        transport: "internal",
        hasResidentKey: true,
        isUserVerified: true,
      },
    });

    await client.send("WebAuthn.removeVirtualAuthenticator", {
      authenticatorId,
    });

    await page.getByRole("button", { name: "Create Wallet" }).click();

    await expect(page.getByText("Passkey creation was cancelled")).toBeVisible({ timeout: 15_000 });
  });
});
