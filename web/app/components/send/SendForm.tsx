"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button, Field, Input, Select } from "@/components/ui";
import { ASSETS, MEMO_MAX_LENGTH, type SendFormValues, sendSchema } from "@/lib/validation/send";

interface SendFormProps {
  /** Called with validated values when the form passes validation. */
  onValidSubmit: (values: SendFormValues) => void;
  /** Optional initial values, useful for editing after a simulation preview. */
  defaultValues?: Partial<SendFormValues>;
}

const EMPTY_DEFAULTS: SendFormValues = {
  recipient: "",
  asset: "XLM",
  amount: "",
  memo: "",
};

/**
 * Step 1 of the send flow: collect and validate transaction details.
 * Purely presentational + validation — it reports valid values upward via
 * `onValidSubmit` and holds no knowledge of simulation or submission.
 */
export function SendForm({ onValidSubmit, defaultValues }: SendFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    mode: "onBlur",
    defaultValues: { ...EMPTY_DEFAULTS, ...defaultValues },
  });

  const memoValue = watch("memo") ?? "";

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onValidSubmit)}
      aria-label="Send transaction"
      className="flex flex-col gap-5"
    >
      <Field label="Recipient" htmlFor="recipient" error={errors.recipient?.message}>
        <Input
          id="recipient"
          placeholder="G… or C… address"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.recipient)}
          {...register("recipient")}
        />
      </Field>

      <Field label="Asset" htmlFor="asset" error={errors.asset?.message}>
        <Select id="asset" aria-invalid={Boolean(errors.asset)} {...register("asset")}>
          {ASSETS.map((asset) => (
            <option key={asset.code} value={asset.code}>
              {asset.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Amount"
        htmlFor="amount"
        error={errors.amount?.message}
        hint="Up to 7 decimal places"
      >
        <Input
          id="amount"
          inputMode="decimal"
          placeholder="0.0000000"
          aria-invalid={Boolean(errors.amount)}
          {...register("amount")}
        />
      </Field>

      <Field
        label="Memo (optional)"
        htmlFor="memo"
        error={errors.memo?.message}
        hint={`${memoValue.length}/${MEMO_MAX_LENGTH} characters`}
      >
        <Input
          id="memo"
          maxLength={MEMO_MAX_LENGTH}
          placeholder="e.g. invoice #42"
          aria-invalid={Boolean(errors.memo)}
          {...register("memo")}
        />
      </Field>

      <Button type="submit" className="mt-2 w-full">
        Review transaction
      </Button>

      {isSubmitted && Object.keys(errors).length > 0 ? (
        <p role="status" className="text-xs text-red-600 dark:text-red-400">
          Fix the highlighted fields to continue.
        </p>
      ) : null}
    </form>
  );
}
