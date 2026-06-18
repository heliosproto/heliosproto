import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import SendPage from "@/app/send/page";
import { ConfirmDialog } from "@/components/send/ConfirmDialog";
import type { SimulationResult } from "@/components/send/types";

const VALID_G = "GAGRIGZCFEYDOPSFJRJVUYLIN53H3BELSKM2BJ5OWW6MHSWR3DP6NIYZ";

const simulation: SimulationResult = {
  destination: VALID_G,
  asset: "XLM",
  amount: "5",
  feeEstimateXlm: "0.0000100",
};

describe("ConfirmDialog", () => {
  it("renders nothing when closed", () => {
    render(
      <ConfirmDialog open={false} simulation={simulation} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the dialog when open", () => {
    render(<ConfirmDialog open simulation={simulation} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("calls onConfirm when the send button is clicked", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmDialog open simulation={simulation} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Send" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onCancel on Escape", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ConfirmDialog open simulation={simulation} onConfirm={vi.fn()} onCancel={onCancel} />);
    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe("Send flow (page)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not show the confirmation dialog before a valid submit", () => {
    render(<SendPage />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Still on the form step.
    expect(screen.getByRole("button", { name: "Review transaction" })).toBeInTheDocument();
  });

  it("does not open the dialog when submit is invalid", async () => {
    const user = userEvent.setup();
    render(<SendPage />);
    await user.click(screen.getByRole("button", { name: "Review transaction" }));
    expect(await screen.findByText("Recipient is required")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    // Preview should not appear either.
    expect(screen.queryByRole("region", { name: "Simulation preview" })).not.toBeInTheDocument();
  });

  it("shows the preview after a valid submit, then opens the dialog only on Confirm", async () => {
    const user = userEvent.setup();
    render(<SendPage />);

    await user.type(screen.getByLabelText("Recipient"), VALID_G);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Review transaction" }));

    // Preview shows mocked simulation; dialog still closed.
    expect(await screen.findByRole("region", { name: "Simulation preview" })).toBeInTheDocument();
    expect(screen.getByText("0.0000100 XLM")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Confirm opens the dialog.
    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("logs the payload placeholder when the dialog is confirmed", async () => {
    const user = userEvent.setup();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    render(<SendPage />);

    await user.type(screen.getByLabelText("Recipient"), VALID_G);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Review transaction" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await user.click(await screen.findByRole("button", { name: "Send" }));

    await waitFor(() =>
      expect(logSpy).toHaveBeenCalledWith(
        "would submit",
        expect.objectContaining({ recipient: VALID_G, amount: "5" }),
      ),
    );
    // Dialog closes after confirming.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
