import type { AssetCode, SendFormValues } from "@/lib/validation/send";

/** The validated transaction the user intends to send. */
export type SendPayload = SendFormValues;


export interface SimulationResult {
  destination: string;
  asset: AssetCode;
  amount: string;
  memo?: string;
  /** Estimated network fee, denominated in XLM (stroops formatted as XLM). */
  feeEstimateXlm: string;
}


export function buildMockSimulation(payload: SendPayload): SimulationResult {
  return {
    destination: payload.recipient,
    asset: payload.asset,
    amount: payload.amount,
    memo: payload.memo,
    // Stellar base fee is 100 stroops = 0.00001 XLM. Placeholder until real estimate.
    feeEstimateXlm: "0.0000100",
  };
}
