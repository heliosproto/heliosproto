"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MEMO_MAX_LENGTH, type SendFormValues, sendSchema } from "@/lib/validation/send";

interface SendFormProps {
  onValidSubmit: (values: SendFormValues) => void;
  defaultValues?: Partial<SendFormValues>;
}

const EMPTY_DEFAULTS: SendFormValues = {
  recipient: "",
  asset: "XLM",
  amount: "",
  memo: "",
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center gap-2 font-mono text-[11px] font-medium tracking-wider text-muted-foreground uppercase"
    >
      {children}
    </label>
  );
}

export function SendForm({ onValidSubmit, defaultValues }: SendFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitted },
  } = useForm<SendFormValues>({
    resolver: zodResolver(sendSchema),
    // onTouched validates on first blur and then revalidates on every change,
    // so a corrected value immediately clears its own error. onBlur-only kept
    // the error red until the next blur, which felt broken.
    mode: "onTouched",
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
      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="recipient">Recipient</FieldLabel>
        <Input
          id="recipient"
          placeholder="G... or C... address"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(errors.recipient)}
          className="h-11 font-mono text-sm"
          {...register("recipient")}
        />
        {errors.recipient && (
          <p role="alert" className="text-xs text-destructive">
            {errors.recipient.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="asset">Asset</FieldLabel>
        <div
          id="asset"
          className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-muted/30 px-3 text-sm"
        >
          <span className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-5 w-5 rounded-full"
              style={{
                background: "linear-gradient(135deg, var(--watermelon), var(--punch))",
              }}
            />
            <span className="font-medium">XLM</span>
            <span className="text-muted-foreground">native</span>
          </span>
          <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
            More assets soon
          </span>
        </div>
        <input type="hidden" {...register("asset")} value="XLM" />
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="amount">Amount</FieldLabel>
        <Input
          id="amount"
          inputMode="decimal"
          placeholder="0.0000000"
          aria-invalid={Boolean(errors.amount)}
          className="h-11 font-mono text-sm"
          {...register("amount")}
        />
        {errors.amount ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.amount.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Up to 7 decimal places</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <FieldLabel htmlFor="memo">Memo (optional)</FieldLabel>
        <Input
          id="memo"
          maxLength={MEMO_MAX_LENGTH}
          placeholder="e.g. invoice #42"
          aria-invalid={Boolean(errors.memo)}
          className="h-11 text-sm"
          {...register("memo")}
        />
        {errors.memo ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.memo.message}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {memoValue.length}/{MEMO_MAX_LENGTH} characters
          </p>
        )}
      </div>

      <Button
        type="submit"
        size="lg"
        className="mt-2 h-11 w-full border-0 bg-watermelon text-sm font-semibold text-watermelon-foreground shadow-[0_8px_24px_-8px_color-mix(in_oklch,var(--watermelon)_60%,transparent)] transition-transform hover:bg-punch hover:translate-y-[-1px]"
      >
        Review transaction
        <ArrowRight className="ml-1 h-4 w-4" aria-hidden />
      </Button>

      {isSubmitted && Object.keys(errors).length > 0 ? (
        <p role="status" className="text-center text-xs text-destructive">
          Fix the highlighted fields to continue.
        </p>
      ) : null}
    </form>
  );
}
