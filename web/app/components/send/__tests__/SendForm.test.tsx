import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SendForm } from "@/components/send/SendForm";

const VALID_G = "GAGRIGZCFEYDOPSFJRJVUYLIN53H3BELSKM2BJ5OWW6MHSWR3DP6NIYZ";
const VALID_C = "CAGRIGZCFEYDOPSFJRJVUYLIN53H3BELSKM2BJ5OWW6MHSWR3DP6MUZM";

function setup() {
  const onValidSubmit = vi.fn();
  render(<SendForm onValidSubmit={onValidSubmit} />);
  return { onValidSubmit };
}

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  values: { recipient?: string; amount?: string; memo?: string },
) {
  if (values.recipient !== undefined) {
    await user.type(screen.getByLabelText("Recipient"), values.recipient);
  }
  if (values.amount !== undefined) {
    await user.type(screen.getByLabelText("Amount"), values.amount);
  }
  if (values.memo !== undefined) {
    await user.type(screen.getByLabelText("Memo (optional)"), values.memo);
  }
  await user.click(screen.getByRole("button", { name: "Review transaction" }));
}

describe("SendForm validation", () => {
  it("rejects an empty recipient", async () => {
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    await fillAndSubmit(user, { amount: "5" });
    expect(await screen.findByText("Recipient is required")).toBeInTheDocument();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed address", async () => {
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    await fillAndSubmit(user, { recipient: "not-a-valid-address", amount: "5" });
    expect(
      await screen.findByText("Must be a valid Stellar address (G… or C…)"),
    ).toBeInTheDocument();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("rejects a negative amount", async () => {
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    await fillAndSubmit(user, { recipient: VALID_G, amount: "-5" });
    expect(await screen.findByText(/at most 7 decimal places/)).toBeInTheDocument();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("rejects an amount with more than 7 decimal places", async () => {
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    await fillAndSubmit(user, { recipient: VALID_G, amount: "1.123456789" });
    expect(await screen.findByText(/at most 7 decimal places/)).toBeInTheDocument();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("caps memo input at 28 characters via maxLength", async () => {
    const user = userEvent.setup();
    setup();
    const memo = screen.getByLabelText("Memo (optional)") as HTMLInputElement;
    await user.type(memo, "x".repeat(40));
    // The input enforces the byte limit at the DOM level.
    expect(memo.value).toHaveLength(28);
  });

  it("rejects a memo over 28 characters at the schema boundary", async () => {
    // maxLength blocks typing, so drive the rejection by removing the cap and
    // pasting an over-long value, mirroring a paste from outside the field.
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    const memo = screen.getByLabelText("Memo (optional)") as HTMLInputElement;
    memo.removeAttribute("maxlength");
    await user.type(screen.getByLabelText("Recipient"), VALID_G);
    await user.type(screen.getByLabelText("Amount"), "5");
    memo.focus();
    await user.paste("x".repeat(29));
    await user.click(screen.getByRole("button", { name: "Review transaction" }));
    expect(await screen.findByText(/28 characters or fewer/)).toBeInTheDocument();
    expect(onValidSubmit).not.toHaveBeenCalled();
  });

  it("accepts a well-formed G address", async () => {
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    await fillAndSubmit(user, { recipient: VALID_G, amount: "5" });
    await waitFor(() => expect(onValidSubmit).toHaveBeenCalledTimes(1));
    expect(onValidSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ recipient: VALID_G, asset: "XLM", amount: "5" }),
    );
  });

  it("accepts a well-formed C address", async () => {
    const user = userEvent.setup();
    const { onValidSubmit } = setup();
    await fillAndSubmit(user, { recipient: VALID_C, amount: "5" });
    await waitFor(() => expect(onValidSubmit).toHaveBeenCalledTimes(1));
    expect(onValidSubmit.mock.calls[0][0]).toEqual(expect.objectContaining({ recipient: VALID_C }));
  });
});
