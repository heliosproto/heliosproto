import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SendPage from "@/app/app/send/page";
import { ConfirmDialog } from "@/components/send/ConfirmDialog";
import type { SimulationResult } from "@/components/send/types";

const VALID_G = "GBWUF6VB7ZLK5EZI46SSPNNVWOM4X3X64KQYN6BCVILFD3AQMAIETKMC";
const SMART_ACCOUNT = "CDIIWUWVDGCWYIZHBOMAFXRE3UVMSMCFSGYTGNQBFU2DRQKSLWP5LHFU";

vi.mock("@/lib/credential-store", () => ({
  loadCredential: vi.fn(async () => ({
    credentialId: new Uint8Array([1, 2, 3]),
    publicKey: new Uint8Array(32),
    createdAt: 0,
    smartAccountAddress: SMART_ACCOUNT,
    accountNonce: 0n,
  })),
  storeAccountNonce: vi.fn(async () => undefined),
}));

vi.mock("@/lib/factory-client", () => ({
  mockPubkeyFromCredential: vi.fn(async () => new Uint8Array(32)),
}));

vi.mock("@/lib/send-client", () => ({
  simulateTransferXlm: vi.fn(async () => ({
    success: true,
    minResourceFeeStroops: 100n,
    totalFeeStroops: 200n,
    latestLedger: 123,
  })),
  broadcastTransferXlm: vi.fn(async () => ({
    success: true,
    txHash: "aaaa0000bbbb1111cccc2222dddd3333",
    explorerUrl: "https://stellar.expert/explorer/testnet/tx/aaaa0000bbbb1111cccc2222dddd3333",
    nextAccountNonce: 1n,
  })),
}));

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
  beforeEach(async () => {
    const { simulateTransferXlm, broadcastTransferXlm } = await import("@/lib/send-client");
    (simulateTransferXlm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      minResourceFeeStroops: 100n,
      totalFeeStroops: 200n,
      latestLedger: 123,
    });
    (broadcastTransferXlm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      txHash: "aaaa0000bbbb1111cccc2222dddd3333",
      explorerUrl: "https://stellar.expert/explorer/testnet/tx/aaaa0000bbbb1111cccc2222dddd3333",
      nextAccountNonce: 1n,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not show the confirmation dialog before a valid submit", async () => {
    render(<SendPage />);
    // Wait for the loaded form to appear.
    await screen.findByRole("button", { name: "Review transaction" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open the dialog when submit is invalid", async () => {
    const user = userEvent.setup();
    render(<SendPage />);
    await user.click(await screen.findByRole("button", { name: "Review transaction" }));
    expect(await screen.findByText("Recipient is required")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Simulation preview" })).not.toBeInTheDocument();
  });

  it("shows the preview after a valid submit, then opens the dialog only on Confirm", async () => {
    const user = userEvent.setup();
    render(<SendPage />);

    await user.type(await screen.findByLabelText("Recipient"), VALID_G);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Review transaction" }));

    expect(await screen.findByRole("region", { name: "Simulation preview" })).toBeInTheDocument();
    // Real simulate mock returns 200 stroops = 0.00002 XLM.
    expect(screen.getByText("0.00002 XLM")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("broadcasts and shows the explorer link when the dialog is confirmed", async () => {
    const user = userEvent.setup();
    render(<SendPage />);

    await user.type(await screen.findByLabelText("Recipient"), VALID_G);
    await user.type(screen.getByLabelText("Amount"), "5");
    await user.click(screen.getByRole("button", { name: "Review transaction" }));
    await user.click(await screen.findByRole("button", { name: "Confirm" }));
    await user.click(await screen.findByRole("button", { name: "Send" }));

    // Dialog closes while broadcast is in flight.
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Broadcasted state surfaces the tx hash and explorer link.
    await waitFor(() =>
      expect(screen.getByText("aaaa0000bbbb1111cccc2222dddd3333")).toBeInTheDocument(),
    );
    expect(screen.getByRole("link", { name: /Stellar Expert/ }).getAttribute("href")).toContain(
      "aaaa0000bbbb1111cccc2222dddd3333",
    );
  });
});
